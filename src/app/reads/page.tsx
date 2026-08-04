import type { Metadata } from "next";
import Image from "next/image";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { canOptimizeImage } from "@/lib/posts";
import { getAllReads } from "@/lib/reads";

export const dynamic = "force-static";

const reads = getAllReads();

export const metadata: Metadata = {
  title: "Reads",
  description:
    "Political Bookshelf — understanding politics through reading. Books and essays recommended by Ellen Carty.",
  alternates: { canonical: "/reads" },
  openGraph: { url: "/reads" },
};

export default function ReadsPage() {
  return (
    <>
      <Nav />
      <main className="flex-1 bg-surface pt-20">
        <div className="mx-auto max-w-[1180px] px-6 py-14 md:px-10 md:py-20">
          <div className="max-w-2xl border-b border-rule pb-10">
            <p className="eyebrow">Reads</p>
            <h1 className="font-display mt-4 text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[1.05] tracking-[-0.025em] text-ink">
              Political Bookshelf
            </h1>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-muted md:text-[17px]">
              Understanding politics through reading.
            </p>
          </div>

          {reads.length === 0 ? (
            <p className="mt-12 text-[16px] text-muted">
              Books will appear here once they&rsquo;re added in the CMS.
            </p>
          ) : (
            <ul className="mt-4">
              {reads.map((item) => {
                const inner = (
                  <>
                    {item.image ? (
                      <div className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden bg-marble-deep sm:w-24">
                        <Image
                          src={item.image}
                          alt={item.imageAlt || item.title}
                          fill
                          unoptimized={!canOptimizeImage(item.image)}
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>
                    ) : (
                      <div
                        className="hidden aspect-[2/3] w-20 shrink-0 bg-marble-deep sm:block sm:w-24"
                        aria-hidden
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      {item.topic ? (
                        <span className="text-[11px] font-medium tracking-[0.14em] text-denim uppercase">
                          {item.topic}
                        </span>
                      ) : null}
                      <h2 className="font-display mt-2 text-[1.55rem] font-medium leading-snug tracking-[-0.02em] text-ink transition group-hover:text-denim md:text-[1.85rem]">
                        {item.title}
                      </h2>
                      <p className="mt-1 text-[15px] text-muted">{item.author}</p>
                      {item.note ? (
                        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted md:text-[16px]">
                          {item.note}
                        </p>
                      ) : null}
                      {item.link ? (
                        <span className="mt-4 inline-block text-[12px] font-medium tracking-[0.08em] text-denim uppercase">
                          Learn more <span aria-hidden>→</span>
                        </span>
                      ) : null}
                    </div>
                  </>
                );

                return (
                  <li key={item.slug}>
                    {item.link ? (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex gap-6 border-t border-rule py-8 transition md:gap-10 md:py-10"
                      >
                        {inner}
                      </a>
                    ) : (
                      <div className="group flex gap-6 border-t border-rule py-8 md:gap-10 md:py-10">
                        {inner}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
