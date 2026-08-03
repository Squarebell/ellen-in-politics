import Image from "next/image";
import Link from "next/link";
import {
  canOptimizeImage,
  focusObjectPosition,
  formatPostDate,
  getFeaturedPost,
  type Post,
} from "@/lib/posts";
import { socials } from "@/lib/socials";
import { Reveal } from "./Reveal";

type PostsTeaserProps = {
  posts: Post[];
};

export function PostsTeaser({ posts }: PostsTeaserProps) {
  const featured = getFeaturedPost(posts);
  const rest = featured
    ? posts.filter((post) => post.slug !== featured.slug)
    : posts;

  return (
    <section id="work" className="bg-surface py-24 md:py-36">
      <div className="mx-auto max-w-[1180px] px-6 md:px-10">
        <Reveal className="flex flex-col gap-4 border-b border-rule pb-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow">Selected writing</p>
            <h2 className="font-display mt-4 text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[1.05] tracking-[-0.025em] text-ink">
              Work worth sitting with.
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/watch" className="btn-editorial shrink-0">
              Watch
              <span aria-hidden>→</span>
            </Link>
            <a
              href={socials.instagram.href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-editorial shrink-0 text-muted"
            >
              @elleninpolitics
              <span aria-hidden>→</span>
            </a>
          </div>
        </Reveal>

        {featured && (
          <Reveal delay={0.05} className="mt-12">
            <Link
              href={`/posts/${featured.slug}`}
              className="group grid items-center gap-8 md:grid-cols-2 md:gap-14"
            >
              <div className="media-frame relative aspect-[4/5] bg-marble-deep sm:aspect-[5/4] md:aspect-[4/5]">
                <Image
                  src={featured.image}
                  alt={featured.imageAlt}
                  fill
                  unoptimized={!canOptimizeImage(featured.image)}
                  className="object-cover transition duration-[800ms] ease-out group-hover:scale-[1.025]"
                  style={{ objectPosition: focusObjectPosition(featured.imageFocus) }}
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
                <h3 className="font-display mt-5 text-[clamp(2rem,4vw,3.35rem)] font-medium leading-[1.08] tracking-[-0.025em] text-ink transition group-hover:text-denim">
                  {featured.title}
                </h3>
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
          </Reveal>
        )}

        <ul className="mt-6">
          {rest.map((post, index) => (
            <Reveal key={post.slug} delay={0.04 * index}>
              <li>
                <Link
                  href={`/posts/${post.slug}`}
                  className="group grid gap-4 border-t border-rule py-8 transition md:grid-cols-[7.5rem_1fr_auto] md:items-baseline md:gap-10 md:py-9"
                >
                  <span className="text-[11px] font-medium tracking-[0.14em] text-denim uppercase">
                    {post.topic}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-[1.55rem] font-medium leading-snug tracking-[-0.02em] text-ink transition group-hover:text-denim md:text-[1.75rem]">
                      {post.title}
                    </h3>
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
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
