import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pageDirectory = path.join(root, "public", "instagram-feed", "pages");
const excludedPostCode = "DW8ghC-jFen";
const pageSize = 12;

const source = JSON.parse(await readFile(path.join(root, "public", "instagram-feed.json"), "utf8"));
const pinnedCodes = source.items
	.filter((post) => Array.isArray(post.timeline_pinned_user_ids) && post.timeline_pinned_user_ids.length > 0)
	.map((post) => post.code);
const pinnedCodeSet = new Set(pinnedCodes);
const pinnedOrder = new Map(pinnedCodes.map((code, index) => [code, index]));

const pageFiles = (await readdir(pageDirectory))
	.filter((file) => /^page-\d+\.json$/.test(file))
	.sort();
const posts = [];
for (const file of pageFiles) {
	const page = JSON.parse(await readFile(path.join(pageDirectory, file), "utf8"));
	posts.push(...page.posts);
}

const orderedPosts = posts
	.filter((post) => post.code !== excludedPostCode)
	.map((post) => ({ ...post, isPinned: pinnedCodeSet.has(post.code) }))
	.sort((a, b) => {
		if (a.isPinned && b.isPinned) return pinnedOrder.get(a.code) - pinnedOrder.get(b.code);
		if (a.isPinned) return -1;
		if (b.isPinned) return 1;
		return b.takenAt - a.takenAt;
	});

const totalPages = Math.ceil(orderedPosts.length / pageSize);
for (let index = 0; index < totalPages; index += 1) {
	const pageNumber = index + 1;
	const page = {
		page: pageNumber,
		pageSize,
		totalPosts: orderedPosts.length,
		totalPages,
		posts: orderedPosts.slice(index * pageSize, (index + 1) * pageSize),
	};
	const file = `page-${String(pageNumber).padStart(3, "0")}.json`;
	await writeFile(path.join(pageDirectory, file), `${JSON.stringify(page)}\n`);
}

for (const file of pageFiles.slice(totalPages)) {
	const { unlink } = await import("node:fs/promises");
	await unlink(path.join(pageDirectory, file));
}

const initialPath = path.join(root, "src", "data", "instagram-initial.json");
const initial = JSON.parse(await readFile(initialPath, "utf8"));
initial.pageSize = pageSize;
initial.totalPosts = orderedPosts.length;
initial.pageCount = totalPages;
initial.posts = orderedPosts.slice(0, pageSize);
await writeFile(initialPath, `${JSON.stringify(initial, null, 2)}\n`);

console.log(`Sorted ${orderedPosts.length} posts; ${pinnedCodes.length} pinned; ${totalPages} pages.`);
