import { useCallback, useEffect, useRef, useState } from "react";
import {
	Camera,
	ChevronLeft,
	ChevronRight,
	Heart,
	Layers2,
	LoaderCircle,
	Pin,
	Play,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog.jsx";

const pageSize = 12;

const windows1252Bytes = new Map([
	[0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
	[0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
	[0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
	[0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
	[0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
	[0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
	[0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

const repairMojibake = (value) => {
	let text = value;
	for (let pass = 0; pass < 3; pass += 1) {
		let changed = false;
		text = text.replace(/[^\x00-\x7f]+/g, (run) => {
			if (!/[ÃÂðÐŸâï]/.test(run)) return run;
			const bytes = [];
			for (const character of run) {
				const code = character.codePointAt(0);
				const byte = code <= 0xff ? code : windows1252Bytes.get(code);
				if (byte === undefined) return run;
				bytes.push(byte);
			}
			try {
				const decoded = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
				if (decoded !== run) changed = true;
				return decoded;
			} catch {
				return run;
			}
		});
		if (!changed) break;
	}
	return text;
};

const normalizePostText = (post) => ({
	...post,
	caption: typeof post.caption === "string" ? repairMojibake(post.caption) : post.caption,
	location: typeof post.location === "string" ? repairMojibake(post.location) : post.location,
});

const formatDate = (date) =>
	new Intl.DateTimeFormat("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	}).format(new Date(date));

const captionPreview = (caption, fallback) => {
	const text = caption?.trim().split(/\s+/).join(" ");
	return text ? text.slice(0, 120) : fallback;
};

const postImage = (post) => post.images?.[0]?.url ?? post.image;

function InstagramPostTile({ item, onClick, label }) {
	const [imageLoaded, setImageLoaded] = useState(false);
	const imageRef = useRef(null);
	const src = postImage(item);

	useEffect(() => {
		if (imageRef.current?.complete) setImageLoaded(true);
	}, [src]);

	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			className="group relative block aspect-square overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
		>
			<img
				ref={imageRef}
				src={src}
				alt={captionPreview(item.caption, `Flowers${item.location ? ` at ${item.location}` : ""}`)}
				width={item.images?.[0]?.width ?? 640}
				height={item.images?.[0]?.height ?? 640}
				loading="lazy"
				decoding="async"
				onLoad={() => setImageLoaded(true)}
				onError={() => setImageLoaded(true)}
				className={`h-full w-full object-cover transition-[opacity,transform] duration-300 group-hover:scale-105 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
			/>
			{!imageLoaded && (
				<span className="absolute inset-0 z-20 grid place-items-center text-brand" role="status" aria-label="Loading photo">
					<LoaderCircle size={28} className="animate-spin" aria-hidden="true" />
				</span>
			)}
			{item.isPinned && (
				<span className={`absolute ${item.videos?.length ? "left-3" : "right-3"} top-3 z-10 rounded-full bg-black/55 p-2 text-white`} aria-label="Pinned post">
					<Pin size={16} aria-hidden="true" />
				</span>
			)}
			{item.videos?.length ? (
				<span className="absolute right-3 top-3 z-10 rounded-full bg-black/55 p-2 text-white" aria-label="Video post">
					<Play size={16} fill="currentColor" aria-hidden="true" />
				</span>
			) : !item.isPinned && item.mediaType === 8 ? (
				<span className="absolute right-3 top-3 z-10 rounded-full bg-black/55 p-2 text-white" aria-label="Carousel post">
					<Layers2 size={16} aria-hidden="true" />
				</span>
			) : null}
			<span className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
				View post
			</span>
		</button>
	);
}

export default function InstagramFeed({ profile, posts: initialPosts, pageCount, totalPosts }) {
	const visibleInitialPosts = initialPosts.map(normalizePostText);
	const visibleTotalPosts = totalPosts;
	const [posts, setPosts] = useState(visibleInitialPosts);
	const [loadedPage, setLoadedPage] = useState(1);
	const [isLoading, setIsLoading] = useState(false);
	const [loadError, setLoadError] = useState(false);
	const [activeIndex, setActiveIndex] = useState(null);
	const postsRef = useRef(visibleInitialPosts);
	const pageRef = useRef(1);
	const loadingRef = useRef(false);
	const activeIndexRef = useRef(null);
	const pauseAutoLoadRef = useRef(false);
	const requestControllerRef = useRef(null);
	const sentinelRef = useRef(null);
	const videoRef = useRef(null);
	const [loadedVideoUrl, setLoadedVideoUrl] = useState(null);
	const post = activeIndex === null ? null : posts[activeIndex];
	const videoUrl = post?.videos?.[0]?.url;
	const isVideoLoading = Boolean(videoUrl) && loadedVideoUrl !== videoUrl;
	const hasMore = loadedPage < pageCount;

	useEffect(() => {
		setLoadedVideoUrl(null);
		if (videoRef.current?.readyState >= 2) setLoadedVideoUrl(videoUrl);
	}, [videoUrl]);

	const setActive = (index) => {
		activeIndexRef.current = index;
		setActiveIndex(index);
	};

	const loadNextPage = useCallback(async ({ automatic = false } = {}) => {
		if (automatic && pauseAutoLoadRef.current) return null;
		if (loadingRef.current || pageRef.current >= pageCount) return null;
		loadingRef.current = true;
		setIsLoading(true);
		setLoadError(false);
		const controller = new AbortController();
		requestControllerRef.current = controller;
		const nextPage = pageRef.current + 1;
		const pageNumber = String(nextPage).padStart(3, "0");
		try {
			const response = await fetch(`${import.meta.env.BASE_URL}instagram-feed/pages/page-${pageNumber}.json`, { signal: controller.signal });
			if (!response.ok) throw new Error(`Feed page request failed with ${response.status}`);
			const data = await response.json();
			const addedPosts = Array.isArray(data.posts) ? data.posts.map(normalizePostText) : [];
			postsRef.current = [...postsRef.current, ...addedPosts];
			pageRef.current = nextPage;
			setPosts(postsRef.current);
			setLoadedPage(nextPage);
			return addedPosts;
		} catch (error) {
			if (error.name !== "AbortError") setLoadError(true);
			return null;
		} finally {
			if (requestControllerRef.current === controller) requestControllerRef.current = null;
			loadingRef.current = false;
			setIsLoading(false);
		}
	}, [pageCount]);

	useEffect(() => {
		const returningFromContact = new URLSearchParams(window.location.search).has("contact");
		if (returningFromContact) pauseAutoLoadRef.current = true;

		const pauseForContactClick = (event) => {
			if (event.target instanceof Element && event.target.closest("[data-contact-jump]")) {
				pauseAutoLoadRef.current = true;
				requestControllerRef.current?.abort();
			}
		};
		document.addEventListener("click", pauseForContactClick, true);

		const contactSection = document.getElementById("kontakt");
		const contactObserver = contactSection && "IntersectionObserver" in window
			? new IntersectionObserver(([entry]) => {
					if (entry.isIntersecting && !returningFromContact) {
						pauseAutoLoadRef.current = false;
					}
				})
			: null;
		if (contactObserver) contactObserver.observe(contactSection);

		return () => {
			document.removeEventListener("click", pauseForContactClick, true);
			contactObserver?.disconnect();
		};
	}, []);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel || !hasMore || !("IntersectionObserver" in window)) return undefined;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) void loadNextPage({ automatic: true });
			},
			{ rootMargin: "320px 0px" },
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hasMore, loadedPage, loadNextPage]);

	const showPrevious = useCallback(() => {
		const index = activeIndexRef.current;
		if (index !== null && index > 0) setActive(index - 1);
	}, []);

	const showNext = useCallback(async () => {
		const index = activeIndexRef.current;
		if (index === null) return;
		if (index + 1 < postsRef.current.length) {
			setActive(index + 1);
			return;
		}
		if (pageRef.current < pageCount && !loadingRef.current) {
			const nextIndex = postsRef.current.length;
			const added = await loadNextPage();
			if (added?.length) setActive(nextIndex);
		}
	}, [loadNextPage, pageCount]);

	useEffect(() => {
		if (activeIndex === null) return undefined;
		const handleKeyDown = (event) => {
			if (event.key === "ArrowLeft") {
				event.preventDefault();
				showPrevious();
			} else if (event.key === "ArrowRight") {
				event.preventDefault();
				void showNext();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [activeIndex, showNext, showPrevious]);

	return (
		<section aria-labelledby="instagram-heading" className="py-16 sm:py-20">
			<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">Instagram</p>
					<h2 id="instagram-heading" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
						A little flower inspiration
					</h2>
				</div>
				<a
					href={`https://www.instagram.com/${profile.username}/`}
					target="_blank"
					rel="noreferrer"
					className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
				>
					Follow @{profile.username}
					<Camera size={18} aria-hidden="true" />
				</a>
			</div>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{posts.map((item, index) => {
					return (
						<InstagramPostTile
							key={item.code}
							item={item}
							onClick={() => setActive(index)}
							label={`Open Instagram post: ${captionPreview(item.caption, item.location || "Flowers")}`}
						/>
					);
				})}
				{hasMore && <div ref={sentinelRef} className="col-span-full h-1" aria-hidden="true" />}
			</div>

			<div className="mt-8 flex flex-col items-center gap-3 text-center">
				<p className="text-sm text-muted-foreground" aria-live="polite">
					Showing {posts.length} of {visibleTotalPosts} posts
				</p>
				{hasMore && (
					<Button type="button" variant="outline" onClick={() => void loadNextPage()} disabled={isLoading}>
						{isLoading && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
						{isLoading ? "Loading photos…" : loadError ? "Try loading again" : `Load ${pageSize} more posts`}
					</Button>
				)}
			</div>

			<Dialog open={activeIndex !== null} onOpenChange={(open) => !open && setActive(null)}>
				{post && (
					<DialogContent
						closeButtonClassName="right-3 top-3 z-50 grid size-11 place-items-center rounded-full bg-white/95 text-zinc-900 opacity-100 shadow-lg ring-1 ring-black/20 hover:bg-white focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 [&_svg]:size-5"
						className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden border-0 bg-white p-0 text-[#262626] shadow-2xl sm:w-[calc(100vw-3rem)] sm:max-w-5xl"
					>
						<DialogTitle className="sr-only">Post by @{profile.username}</DialogTitle>
						<DialogDescription className="sr-only">
							Use the left and right arrow keys to browse posts. Press Escape to close.
						</DialogDescription>

						<div className="grid h-[calc(100dvh-1rem)] max-h-[860px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:h-[min(82vh,860px)] md:grid-cols-[minmax(0,1fr)_360px] md:grid-rows-1">
							<div className="relative flex aspect-square min-h-0 items-center justify-center bg-black md:aspect-auto md:min-h-0">
								{videoUrl ? (
									<>
										<video
											key={videoUrl}
											ref={videoRef}
											src={videoUrl}
											controls
											playsInline
											preload="metadata"
											autoPlay
											muted
											aria-label={`Video from post by @${profile.username}`}
											onLoadedData={() => setLoadedVideoUrl(videoUrl)}
											onError={() => setLoadedVideoUrl(videoUrl)}
											className="h-full w-full object-contain"
										>
											Your browser does not support video playback.
										</video>
										{isVideoLoading && (
											<span className="absolute inset-0 z-10 grid place-items-center text-white" role="status" aria-label="Loading video">
												<LoaderCircle size={40} className="animate-spin" aria-hidden="true" />
											</span>
										)}
									</>
								) : (
									<img
										src={postImage(post)}
										alt={captionPreview(post.caption, `Flowers${post.location ? ` at ${post.location}` : ""}`)}
										className="h-full w-full object-contain"
									/>
								)}
								<button
									type="button"
									onClick={showPrevious}
									disabled={activeIndex === 0}
									aria-label="Previous Instagram post"
									className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#262626] shadow transition hover:bg-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
								>
									<ChevronLeft size={22} aria-hidden="true" />
								</button>
								<button
									type="button"
									onClick={() => void showNext()}
									disabled={activeIndex === posts.length - 1 && !hasMore}
									aria-label="Next Instagram post"
									className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#262626] shadow transition hover:bg-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
								>
									<ChevronRight size={22} aria-hidden="true" />
								</button>
							</div>

							<aside className="flex min-h-0 flex-col border-t border-[#efefef] md:border-l md:border-t-0">
								<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
									<div className="flex items-start gap-3">
										<img src={profile.image} alt="" className="size-8 shrink-0 rounded-full object-cover" />
										<div className="min-w-0 text-sm leading-5">
											<p className="whitespace-pre-wrap break-words">
												<strong className="mr-2 font-semibold">{profile.username}</strong>
												{post.caption}
											</p>
											{post.location && <p className="mt-2 text-xs text-muted-foreground">Location · {post.location}</p>}
										</div>
									</div>
									{post.comments > 0 && (
										<a
											href={`https://www.instagram.com/p/${post.code}/`}
											target="_blank"
											rel="noreferrer"
											className="mt-5 inline-block text-sm text-muted-foreground hover:text-[#262626]"
										>
											View all {post.comments} comments
										</a>
									)}
								</div>

								<footer className="border-t border-[#efefef] px-4 py-3">
									<div className="mb-3 flex items-center gap-4">
										<Heart size={24} aria-hidden="true" />
									</div>
									<p className="text-sm font-semibold">{post.likes.toLocaleString("en-US")} likes</p>
									<time dateTime={post.date} className="mt-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
										{formatDate(post.date)}
									</time>
									<a
										href={`https://www.instagram.com/p/${post.code}/`}
										target="_blank"
										rel="noreferrer"
										className="mt-3 inline-block text-xs font-medium text-brand hover:underline"
									>
										View on Instagram
									</a>
								</footer>
							</aside>
						</div>
					</DialogContent>
				)}
			</Dialog>
		</section>
	);
}
