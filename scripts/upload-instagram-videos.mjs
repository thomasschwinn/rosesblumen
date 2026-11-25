import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { UTApi } from "uploadthing/server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const feedPath = path.join(root, "public", "instagram-feed.json");
const pageDirectory = path.join(root, "public", "instagram-feed", "pages");
const initialPath = path.join(root, "src", "data", "instagram-initial.json");
const manifestPath = path.join(root, "public", "instagram-videos-manifest.json");
const batchSize = 8;

const source = JSON.parse(await readFile(feedPath, "utf8"));
const bySourcePath = new Map();

for (const post of source.items) {
	const mediaItems = [post, ...(Array.isArray(post.carousel_media) ? post.carousel_media : [])];
	for (let mediaIndex = 0; mediaIndex < mediaItems.length; mediaIndex += 1) {
		const media = mediaItems[mediaIndex];
		const versions = (media.video_versions ?? [])
			.filter((version) => typeof version.url === "string")
			.sort((a, b) => (b.width * b.height) - (a.width * a.height));
		const best = versions[0];
		if (!best) continue;

		const url = new URL(best.url);
		const sourcePath = `${url.origin}${url.pathname}`;
		const existing = bySourcePath.get(sourcePath);
		if (!existing || best.width * best.height > existing.width * existing.height) {
			bySourcePath.set(sourcePath, {
				postCode: post.code,
				mediaIndex: mediaIndex + 1,
				sourcePath,
				sourceUrl: best.url,
				width: best.width,
				height: best.height,
				fileSize: best.file_size ?? null,
			});
		}
	}
}

const perPostIndex = new Map();
const assets = [...bySourcePath.values()].map((asset) => {
	const index = (perPostIndex.get(asset.postCode) ?? 0) + 1;
	perPostIndex.set(asset.postCode, index);
	return {
		...asset,
		name: `${asset.postCode}-${String(index).padStart(2, "0")}.mp4`,
		customId: `instagram-${asset.postCode}-${String(index).padStart(2, "0")}`,
	};
});

if (process.argv.includes("--dry-run")) {
	console.log(`Found ${assets.length} unique videos from ${source.items.length} posts.`);
	console.log(`Largest selected variant: ${Math.max(...assets.map((asset) => asset.width * asset.height))} pixels.`);
	process.exit(0);
}

if (!process.env.UPLOADTHING_TOKEN) {
	throw new Error("UPLOADTHING_TOKEN is missing. Add it to .env before uploading.");
}

let parsedToken;
try {
	parsedToken = JSON.parse(Buffer.from(process.env.UPLOADTHING_TOKEN, "base64").toString("utf8"));
} catch {
	throw new Error("UPLOADTHING_TOKEN must be the base64 JSON token from UploadThing, not a standalone API key.");
}
if (
	typeof parsedToken.apiKey !== "string" ||
	typeof parsedToken.appId !== "string" ||
	!Array.isArray(parsedToken.regions) ||
	parsedToken.regions.length === 0
) {
	throw new Error("UPLOADTHING_TOKEN must contain apiKey, appId, and a non-empty regions array.");
}

let manifest = [];
try {
	manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch (error) {
	if (error.code !== "ENOENT") throw error;
}

const uploadedPaths = new Set(manifest.filter((asset) => asset.uploadthingUrl).map((asset) => asset.sourcePath));
const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });
let failedCount = 0;

const assetByCustomId = new Map(assets.map((asset) => [asset.customId, asset]));
let remoteFiles = [];
let remoteHasMore = true;
let remoteOffset = 0;
while (remoteHasMore) {
	const result = await utapi.listFiles({ limit: 1000, offset: remoteOffset });
	remoteFiles.push(...result.files);
	remoteHasMore = result.hasMore;
	remoteOffset += result.files.length;
}

const manifestByCustomId = new Map(manifest.map((asset) => [asset.customId, asset]));
for (const remoteFile of remoteFiles) {
	const asset = assetByCustomId.get(remoteFile.customId);
	if (!asset || remoteFile.status !== "Uploaded") continue;
	const uploadedUrl = `https://${parsedToken.appId}.ufs.sh/f/${remoteFile.key}`;
	manifestByCustomId.set(asset.customId, {
		...asset,
		uploadthingKey: remoteFile.key,
		uploadthingUrl: uploadedUrl,
		appUrl: `https://utfs.io/f/${remoteFile.key}`,
		bytes: remoteFile.size,
	});
}
manifest = [...manifestByCustomId.values()];
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const remoteStatusByCustomId = new Map(remoteFiles.map((file) => [file.customId, file.status]));
for (const asset of assets) {
	if (remoteStatusByCustomId.get(asset.customId) !== "Uploading") continue;
	console.log(`Waiting for ${asset.name} to finish its existing UploadThing transfer.`);
	for (let attempt = 0; attempt < 2; attempt += 1) {
		await new Promise((resolve) => setTimeout(resolve, 20_000));
		const current = await utapi.listFiles({ limit: 1000 });
		remoteFiles = [...current.files];
		const state = remoteFiles.find((file) => file.customId === asset.customId)?.status;
		if (state !== "Uploading") {
			remoteStatusByCustomId.set(asset.customId, state);
			if (state === "Uploaded") {
				const file = remoteFiles.find((entry) => entry.customId === asset.customId);
				manifestByCustomId.set(asset.customId, {
					...asset,
					uploadthingKey: file.key,
					uploadthingUrl: `https://${parsedToken.appId}.ufs.sh/f/${file.key}`,
					appUrl: `https://utfs.io/f/${file.key}`,
					bytes: file.size,
				});
				manifest = [...manifestByCustomId.values()];
				await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
			}
			break;
		}
	}
}

const pending = assets.filter((asset) =>
	!uploadedPaths.has(asset.sourcePath) &&
	!(["Uploaded", "Uploading"].includes(remoteStatusByCustomId.get(asset.customId))),
);
const stillUploading = assets.filter((asset) => remoteStatusByCustomId.get(asset.customId) === "Uploading");
console.log(`UploadThing already has ${assets.length - pending.length} of ${assets.length} videos.`);
if (stillUploading.length) {
	console.log(`Leaving ${stillUploading.length} in-progress video(s) alone to avoid duplicate uploads: ${stillUploading.map((asset) => asset.name).join(", ")}`);
}

for (let index = 0; index < pending.length; index += batchSize) {
	const batch = pending.slice(index, index + batchSize);
	const results = await utapi.uploadFilesFromUrl(
		batch.map(({ sourceUrl, name, customId }) => ({ url: sourceUrl, name, customId })),
		{ concurrency: 4 },
	);
	for (let resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
		const result = results[resultIndex];
		const asset = batch[resultIndex];
		if (result.error || !result.data) {
			failedCount += 1;
			console.error(`Failed ${asset.name}: ${result.error?.message ?? "Upload failed"}`);
			continue;
		}
		manifestByCustomId.set(asset.customId, {
			...asset,
			uploadthingKey: result.data.key,
			uploadthingUrl: result.data.ufsUrl || result.data.url,
			appUrl: result.data.appUrl,
			bytes: result.data.size,
		});
		manifest = [...manifestByCustomId.values()];
		console.log(`Uploaded ${asset.name} (${Math.min(index + resultIndex + 1, pending.length)}/${pending.length})`);
	}
	await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const uploadedByPost = new Map();
for (const asset of manifest.filter((item) => item.uploadthingUrl)) {
	const videos = uploadedByPost.get(asset.postCode) ?? [];
	videos.push({ url: asset.uploadthingUrl, width: asset.width, height: asset.height, mediaIndex: asset.mediaIndex });
	uploadedByPost.set(asset.postCode, videos);
}

const pageFiles = (await readdir(pageDirectory)).filter((file) => /^page-\d+\.json$/.test(file));
for (const file of pageFiles) {
	const filePath = path.join(pageDirectory, file);
	const page = JSON.parse(await readFile(filePath, "utf8"));
	page.posts = page.posts.map((post) => {
		const videos = uploadedByPost.get(post.code) ?? [];
		return videos.length ? { ...post, videos } : post;
	});
	await writeFile(filePath, `${JSON.stringify(page)}\n`);
}

const initial = JSON.parse(await readFile(initialPath, "utf8"));
initial.posts = initial.posts.map((post) => {
	const videos = uploadedByPost.get(post.code) ?? [];
	return videos.length ? { ...post, videos } : post;
});
await writeFile(initialPath, `${JSON.stringify(initial, null, 2)}\n`);

console.log(`Uploaded ${manifest.length} of ${assets.length} videos; ${failedCount} failed in this run.`);
