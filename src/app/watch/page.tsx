import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { WatchExperience } from "@/components/WatchExperience";
import { getAllVideos, getFeaturedVideo } from "@/lib/videos";

export const dynamic = "force-static";

const videos = getAllVideos();
const featured = getFeaturedVideo(videos);

export const metadata: Metadata = {
  title: "Watch",
  description:
    featured?.description ??
    "Watch commentary and civic clips from Ellen Carty.",
};

export default function WatchPage() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-rule bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4 md:px-10">
          <Link
            href="/"
            className="font-display text-[1.35rem] font-medium tracking-[-0.02em] text-ink"
          >
            Ellen Carty
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/#work"
              className="hidden text-[12px] font-medium tracking-[0.08em] text-muted uppercase transition hover:text-ink sm:inline"
            >
              Writing
            </Link>
            <Link
              href="/"
              className="text-[12px] font-medium tracking-[0.08em] text-muted uppercase transition hover:text-ink"
            >
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[1180px] px-6 py-14 md:px-10 md:py-20">
          <WatchExperience videos={videos} />
        </div>
      </main>

      <Footer />
    </>
  );
}
