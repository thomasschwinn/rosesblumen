import { useCallback, useEffect, useRef, useState } from "react";
import {
	Bookmark,
	Camera,
	ChevronLeft,
	ChevronRight,
	Heart,
	Layers2,
	MessageCircle,
	MoreHorizontal,
	Play,
	Send,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog.jsx";

const pageSize = 12;

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

export default function InstagramFeed({ profile, posts: initialPosts, pageCount, totalPosts }) {
	const [posts, setPosts] = useState(initialPosts);
	const [loadedPage, setLoadedPage] = useState(1);
	const [isLoading, setIsLoading] = useState(false);
	const [loadError, setLoadError] = useState(false);
	const [activeIndex, setActiveIndex] = useState(null);
	const postsRef = useRef(initialPosts);
	const pageRef = useRef(1);
	const loadingRef = useRef(false);
	const activeIndexRef = useRef(null);
	const sentinelRef = useRef(null);
	const post = activeIndex === null ? null : posts[activeIndex];
	const hasMore = loadedPage < pageCount;

	const setActive = (index) => {
		activeIndexRef.current = index;
		setActiveIndex(index);
	};

	const loadNextPage = useCallback(async () => {
		if (loadingRef.current || pageRef.current >= pageCount) return null;
		loadingRef.current = true;
		setIsLoading(true);
		setLoadError(false);
		const nextPage = pageRef.current + 1;
		const pageNumber = String(nextPage).padStart(3, "0");
		try {
			const response = await fetch(`${import.meta.env.BASE_URL}instagram-feed/pages/page-${pageNumber}.json`);
			if (!response.ok) throw new Error(`Feed page request failed with ${response.status}`);
			const data = await response.json();
			const addedPosts = Array.isArray(data.posts) ? data.posts : [];
			postsRef.current = [...postsRef.current, ...addedPosts];
			pageRef.current = nextPage;
			setPosts(postsRef.current);
			setLoadedPage(nextPage);
			return addedPosts;
		} catch {
			setLoadError(true);
			return null;
		} finally {
			loadingRef.current = false;
			setIsLoading(false);
		}
	}, [pageCount]);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel || !hasMore || !("IntersectionObserver" in window)) return undefined;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) void loadNextPage();
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
					const src = postImage(item);
					return (
						<button
							key={item.code}
							type="button"
							onClick={() => setActive(index)}
							aria-label={`Open Instagram post: ${captionPreview(item.caption, item.location || "Flowers")}`}
							className="group relative block aspect-square overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
						>
							<img
								src={src}
								alt={captionPreview(item.caption, `Flowers${item.location ? ` at ${item.location}` : ""}`)}
								width={item.images?.[0]?.width ?? 640}
								height={item.images?.[0]?.height ?? 640}
								loading="lazy"
								decoding="async"
								className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
							/>
							{item.mediaType === 2 && (
								<span className="absolute right-3 top-3 rounded-full bg-black/55 p-2 text-white" aria-label="Video post">
									<Play size={16} fill="currentColor" aria-hidden="true" />
								</span>
							)}
							{item.mediaType === 8 && (
								<span className="absolute right-3 top-3 rounded-full bg-black/55 p-2 text-white" aria-label="Carousel post">
									<Layers2 size={16} aria-hidden="true" />
								</span>
							)}
							<span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
								View post
							</span>
						</button>
					);
				})}
				{hasMore && <div ref={sentinelRef} className="col-span-full h-1" aria-hidden="true" />}
			</div>

			<div className="mt-8 flex flex-col items-center gap-3 text-center">
				<p className="text-sm text-muted-foreground" aria-live="polite">
					Showing {posts.length} of {totalPosts} posts
				</p>
				{hasMore && (
					<Button type="button" variant="outline" onClick={() => void loadNextPage()} disabled={isLoading}>
						{isLoading ? "Loading posts…" : loadError ? "Try loading again" : `Load ${pageSize} more posts`}
					</Button>
				)}
			</div>

			<Dialog open={activeIndex !== null} onOpenChange={(open) => !open && setActive(null)}>
				{post && (
					<DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden border-0 bg-white p-0 text-[#262626] shadow-2xl sm:w-[calc(100vw-3rem)] sm:max-w-5xl">
						<DialogTitle className="sr-only">Post by @{profile.username}</DialogTitle>
						<DialogDescription className="sr-only">
							Use the left and right arrow keys to browse posts. Press Escape to close.
						</DialogDescription>

						<div className="grid h-[calc(100dvh-1rem)] max-h-[860px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:h-[min(82vh,860px)] md:grid-cols-[minmax(0,1fr)_360px] md:grid-rows-1">
							<div className="relative flex aspect-square min-h-0 items-center justify-center bg-black md:aspect-auto md:min-h-0">
								<img
									src={postImage(post)}
									alt={captionPreview(post.caption, `Flowers${post.location ? ` at ${post.location}` : ""}`)}
									className="h-full w-full object-contain"
								/>
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
								<header className="flex items-center gap-3 border-b border-[#efefef] px-4 py-3">
									<img src={profile.image} alt="" className="size-8 rounded-full object-cover" />
									<div className="min-w-0 flex-1 leading-tight">
										<p className="truncate text-sm font-semibold">{profile.username}</p>
										<p className="truncate text-xs text-muted-foreground">{post.location}</p>
									</div>
									<a
										href={`https://www.instagram.com/p/${post.code}/`}
										target="_blank"
										rel="noreferrer"
										aria-label="Open original post on Instagram"
										className="rounded-full p-2 hover:bg-[#f5f5f5]"
									>
										<MoreHorizontal size={20} aria-hidden="true" />
									</a>
								</header>

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
										<MessageCircle size={24} className="-rotate-12" aria-hidden="true" />
										<Send size={23} aria-hidden="true" />
										<Bookmark size={23} className="ml-auto" aria-hidden="true" />
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
