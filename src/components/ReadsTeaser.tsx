import Image from "next/image";
import Link from "next/link";
import { canOptimizeImage } from "@/lib/posts";
import { type ReadItem } from "@/lib/reads";
import { Reveal } from "./Reveal";

type ReadsTeaserProps = {
  reads: ReadItem[];
};

export function ReadsTeaser({ reads }: ReadsTeaserProps) {
  if (!reads.length) return null;

  const preview = reads.slice(0, 3);

  return (
    <section id="reads" className="bg-surface py-24 md:py-36">
      <div className="mx-auto max-w-[1180px] px-6 md:px-10">
        <Reveal className="flex flex-col gap-4 border-b border-rule pb-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow">Reads</p>
            <h2 className="font-display mt-4 text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[1.05] tracking-[-0.025em] text-ink">
              Political Bookshelf
            </h2>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-muted md:text-[17px]">
              Understanding politics through reading.
            </p>
          </div>
          <Link href="/reads" className="btn-editorial shrink-0">
            Full bookshelf <span aria-hidden>→</span>
          </Link>
        </Reveal>

        <ul className="mt-6">
          {preview.map((item, index) => {
            const inner = (
              <>
                {item.image ? (
                  <div className="relative hidden aspect-[2/3] w-14 shrink-0 overflow-hidden bg-marble-deep sm:block md:w-16">
                    <Image
                      src={item.image}
                      alt={item.imageAlt || item.title}
                      fill
                      unoptimized={!canOptimizeImage(item.image)}
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  {item.topic ? (
                    <span className="text-[11px] font-medium tracking-[0.14em] text-denim uppercase">
                      {item.topic}
                    </span>
                  ) : null}
                  <h3 className="font-display mt-2 text-[1.55rem] font-medium leading-snug tracking-[-0.02em] text-ink transition group-hover:text-denim md:mt-0 md:text-[1.75rem]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[14px] text-muted md:text-[15px]">
                    {item.author}
                  </p>
                  {item.note ? (
                    <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted md:text-[15px]">
                      {item.note}
                    </p>
                  ) : null}
                </div>
              </>
            );

            return (
              <li key={item.slug}>
                <Reveal delay={0.04 * index}>
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex gap-6 border-t border-rule py-8 transition md:items-start md:gap-10 md:py-9"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className="group flex gap-6 border-t border-rule py-8 md:items-start md:gap-10 md:py-9">
                      {inner}
                    </div>
                  )}
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
