import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { handleContact } from "./src/lib/contact-handler.js";

const localContactApi = {
	name: "rosesblumen-local-contact-api",
	apply: "serve",
	configureServer(server) {
		server.middlewares.use(async (request, response, next) => {
			const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
			if (url.pathname !== "/api/contact") return next();
			if (request.method !== "POST") {
				response.writeHead(405, { Allow: "POST" }).end("Method not allowed");
				return;
			}

			try {
				const chunks = [];
				let size = 0;
				for await (const chunk of request) {
					size += chunk.length;
					if (size > 16_384) {
						response.writeHead(413).end("Request too large");
						return;
					}
					chunks.push(chunk);
				}

				const headers = new Headers();
				for (const [key, value] of Object.entries(request.headers)) {
					if (typeof value === "string") headers.set(key, value);
					else if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
				}
				const webRequest = new Request(url, {
					method: "POST",
					headers,
					body: Buffer.concat(chunks),
				});
				const result = await handleContact(webRequest);
				response.statusCode = result.status;
				result.headers.forEach((value, key) => response.setHeader(key, value));
				response.end(Buffer.from(await result.arrayBuffer()));
			} catch (error) {
				server.config.logger.error(`Local contact endpoint failed: ${error instanceof Error ? error.message : "Unknown error"}`);
				response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }).end("Contact form failed");
			}
		});
	},
};

export default defineConfig({
	site: "https://rosesblumen.com",
	output: "static",
	integrations: [react()],
	vite: {
		plugins: [tailwindcss(), localContactApi],
	},
});
