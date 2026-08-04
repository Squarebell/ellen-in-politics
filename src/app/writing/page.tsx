import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import {
  canOptimizeImage,
  focusObjectPosition,
  formatPostDate,
  getAllPosts,
  getFeaturedPost,
} from "@/lib/posts";

export const dynamic = "force-static";

const posts = getAllPosts();
const featured = getFeaturedPost(posts);
const rest = featured
  ? posts.filter((post) => post.slug !== featured.slug)
  : posts;

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Essays and commentary from Ellen Carty on politics, civic life, and public voice.",
};

export default function WritingPage() {
  return (
    <>
      <Nav />
      <main className="flex-1 bg-surface pt-20">
        <div className="mx-auto max-w-[1180px] px-6 py-14 md:px-10 md:py-20">
          <div className="max-w-2xl border-b border-rule pb-10">
            <p className="eyebrow">Writing</p>
            <h1 className="font-display mt-4 text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[1.05] tracking-[-0.025em] text-ink">
              Work worth sitting with.
            </h1>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-muted md:text-[17px]">
              Essays and commentary on politics, civic life, and public voice.
            </p>
          </div>

          {posts.length === 0 ? (
            <p className="mt-12 text-[16px] text-muted">
              Essays will appear here once they&rsquo;re published in the CMS.
            </p>
          ) : (
            <>
              {featured ? (
                <Link
                  href={`/posts/${featured.slug}`}
                  className="group mt-12 grid items-center gap-8 md:grid-cols-2 md:gap-14"
                >
                  <div className="media-frame relative aspect-[4/5] bg-marble-deep sm:aspect-[5/4] md:aspect-[4/5]">
                    <Image
                      src={featured.image}
                      alt={featured.imageAlt}
                      fill
                      unoptimized={!canOptimizeImage(featured.image)}
                      className="object-cover transition duration-[800ms] ease-out group-hover:scale-[1.025]"
                      style={{
                        objectPosition: focusObjectPosition(featured.imageFocus),
                      }}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-[11px] font-medium tracking-[0.16em] text-flag uppercase">
                        Featured
                      </span>
                      <span className="text-muted/40">·</span>
                      <span className="text-[11px] font-medium tracking-[0.14em] text-denim uppercase">
                        {featured.topic}
                      </span>
                      <span className="text-muted/40">·</span>
                      <span className="text-[11px] font-medium tracking-[0.14em] text-muted uppercase">
                        {featured.readingTimeMinutes} min read
                      </span>
                    </div>
                    <h2 className="font-display mt-5 text-[clamp(2rem,4vw,3.35rem)] font-medium leading-[1.08] tracking-[-0.025em] text-ink transition group-hover:text-denim">
                      {featured.title}
                    </h2>
                    <p className="mt-5 max-w-md text-[16px] leading-relaxed text-muted md:text-[17px]">
                      {featured.excerpt}
                    </p>
                    <div className="mt-8 flex items-center gap-4">
                      <time
                        dateTime={featured.date}
                        className="text-[13px] text-muted"
                      >
                        {formatPostDate(featured.date)}
                      </time>
                      <span className="btn-editorial">
                        Read essay <span aria-hidden>→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ) : null}

              <ul className="mt-6">
                {rest.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={`/posts/${post.slug}`}
                      className="group grid gap-4 border-t border-rule py-8 transition md:grid-cols-[7.5rem_1fr_auto] md:items-baseline md:gap-10 md:py-9"
                    >
                      <span className="text-[11px] font-medium tracking-[0.14em] text-denim uppercase">
                        {post.topic}
                      </span>
                      <div className="min-w-0">
                        <h2 className="font-display text-[1.55rem] font-medium leading-snug tracking-[-0.02em] text-ink transition group-hover:text-denim md:text-[1.75rem]">
                          {post.title}
                        </h2>
                        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted md:text-[15px]">
                          {post.excerpt}
                        </p>
                        <p className="mt-2 text-[12px] text-muted">
                          {post.readingTimeMinutes} min read
                        </p>
                      </div>
                      <time
                        dateTime={post.date}
                        className="text-[13px] text-muted md:text-right"
                      >
                        {formatPostDate(post.date)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
