import postsData from "@/data/posts.json";

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  topic: string;
  image: string;
  imageAlt: string;
  content: string;
};

const posts = postsData as Post[];

export function getAllPosts(): Post[] {
  return posts;
}

export function getPostBySlug(slug: string): Post | null {
  return posts.find((post) => post.slug === slug) ?? null;
}

// Hosts allowed through the next/image optimizer (see next.config.ts).
// Uploaded covers live in /public and are always safe to optimize; covers
// pasted from arbitrary external sites are rendered unoptimized so they
// don't break the static build.
const OPTIMIZED_IMAGE_HOSTS = new Set(["images.unsplash.com"]);

export function canOptimizeImage(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    return OPTIMIZED_IMAGE_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

export function formatPostDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}
