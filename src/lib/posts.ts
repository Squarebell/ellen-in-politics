import postsData from "@/data/posts.json";

export type ImageFocus = "center" | "top" | "bottom" | "left" | "right";

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  topic: string;
  image: string;
  imageAlt: string;
  imageFocus: ImageFocus;
  content: string;
  featured: boolean;
  homepage: boolean;
  sortOrder: number | null;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  related: string[];
  readingTimeMinutes: number;
};

const posts = postsData as Post[];

export function getAllPosts(): Post[] {
  return posts;
}

export function getHomepagePosts(): Post[] {
  return posts.filter((post) => post.homepage !== false);
}

/** Newest publish date wins if more than one post is marked featured. */
export function getFeaturedPost(list: Post[] = getHomepagePosts()): Post | null {
  if (!list.length) return null;
  const featured = list.filter((post) => post.featured);
  if (!featured.length) return list[0];
  return [...featured].sort((a, b) => {
    const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (byDate !== 0) return byDate;
    return a.slug.localeCompare(b.slug);
  })[0];
}

export function getPostBySlug(slug: string): Post | null {
  return posts.find((post) => post.slug === slug) ?? null;
}

export function getRelatedPosts(slug: string, limit = 3): Post[] {
  const current = getPostBySlug(slug);
  if (!current) return [];

  if (current.related?.length) {
    const picked = current.related
      .map((relatedSlug) => getPostBySlug(relatedSlug))
      .filter((post): post is Post => !!post && post.slug !== slug);
    if (picked.length) return picked.slice(0, limit);
  }

  return posts
    .filter((post) => post.slug !== slug && post.topic === current.topic)
    .slice(0, limit);
}

export function focusObjectPosition(focus?: ImageFocus | string): string {
  switch (focus) {
    case "top":
      return "center top";
    case "bottom":
      return "center bottom";
    case "left":
      return "left center";
    case "right":
      return "right center";
    default:
      return "center";
  }
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
