import { createReadStream, promises as fs } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleContact } from "./src/lib/contact-handler.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const port = Number(process.env.PORT || 4321);
const contentTypes = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".ico": "image/x-icon",
	".jpeg": "image/jpeg",
	".jpg": "image/jpeg",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".png": "image/png",
	".svg": "image/svg+xml",
	".webp": "image/webp",
	".woff": "font/woff",
	".woff2": "font/woff2",
};

async function readRequestBody(request, limit = 16_384) {
	const chunks = [];
	let size = 0;
	for await (const chunk of request) {
		size += chunk.length;
		if (size > limit) return null;
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}

const server = createServer(async (request, response) => {
	const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

	if (url.pathname === "/api/contact") {
		if (request.method !== "POST") {
			response.writeHead(405, { Allow: "POST" }).end("Method not allowed");
			return;
		}

		const body = await readRequestBody(request);
		if (!body) {
			response.writeHead(413).end("Request too large");
			return;
		}

		const headers = new Headers();
		for (const [key, value] of Object.entries(request.headers)) {
			if (typeof value === "string") headers.set(key, value);
			else if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
		}
		const webRequest = new Request(url, {
			method: request.method,
			headers,
			body,
		});
		const result = await handleContact(webRequest);
		response.writeHead(result.status, Object.fromEntries(result.headers));
		response.end(Buffer.from(await result.arrayBuffer()));
		return;
	}

	if (request.method !== "GET" && request.method !== "HEAD") {
		response.writeHead(405, { Allow: "GET, HEAD" }).end("Method not allowed");
		return;
	}

	let pathname;
	try {
		pathname = decodeURIComponent(url.pathname);
	} catch {
		response.writeHead(400).end("Bad request");
		return;
	}

	const file = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
	if (!file.startsWith(`${root}${path.sep}`) && file !== path.join(root, "index.html")) {
		response.writeHead(403).end("Forbidden");
		return;
	}

	try {
		const stat = await fs.stat(file);
		if (!stat.isFile()) throw new Error("Not a file");
		response.writeHead(200, {
			"Content-Type": contentTypes[path.extname(file)] || "application/octet-stream",
			"Content-Length": stat.size,
			"X-Content-Type-Options": "nosniff",
		});
		if (request.method === "HEAD") response.end();
		else createReadStream(file).pipe(response);
	} catch {
		response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
	}
});

server.listen(port, "0.0.0.0", () => {
	console.log(`Rosesblumen server listening on http://localhost:${port}`);
});
