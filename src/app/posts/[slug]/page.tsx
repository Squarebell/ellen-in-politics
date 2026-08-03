import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { PostBody } from "@/components/PostBody";
import {
  canOptimizeImage,
  formatPostDate,
  getAllPosts,
  getPostBySlug,
} from "@/lib/posts";

export const dynamic = "force-static";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post" };
  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-rule bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-6 py-4 md:px-10">
          <Link
            href="/"
            className="font-display text-[1.35rem] font-medium tracking-[-0.02em] text-ink"
          >
            Ellen Carty
          </Link>
          <Link
            href="/#work"
            className="text-[12px] font-medium tracking-[0.08em] text-muted uppercase transition hover:text-ink"
          >
            All writing
          </Link>
        </div>
      </header>

      <main className="flex-1 bg-surface">
        <article className="mx-auto max-w-[760px] px-6 py-14 md:px-10 md:py-20">
          <p className="text-[11px] font-medium tracking-[0.16em] text-denim uppercase">
            {post.topic}
          </p>
          <h1 className="font-display mt-5 text-[clamp(2.5rem,5.5vw,3.75rem)] font-medium leading-[1.08] tracking-[-0.025em] text-ink">
            {post.title}
          </h1>
          <time
            dateTime={post.date}
            className="mt-5 block text-[13px] text-muted"
          >
            {formatPostDate(post.date)}
          </time>

          <div className="media-frame relative mt-12 aspect-[16/10]">
            <Image
              src={post.image}
              alt={post.imageAlt}
              fill
              priority
              unoptimized={!canOptimizeImage(post.image)}
              className="object-cover"
              sizes="(max-width: 760px) 100vw, 760px"
            />
          </div>

          <div className="mt-12 border-t border-rule pt-10">
            <PostBody content={post.content} />
          </div>

          <div className="mt-16 border-t border-rule pt-8">
            <Link
              href="/#connect"
              className="btn-editorial"
            >
              Reach out about this piece <span aria-hidden>→</span>
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
