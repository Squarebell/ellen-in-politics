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

export function formatPostDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}
