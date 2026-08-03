import Link from "next/link";
import { VideoPlayer } from "@/components/VideoPlayer";
import { type VideoFeature } from "@/lib/videos";
import { Reveal } from "./Reveal";

type WatchTeaserProps = {
  videos: VideoFeature[];
};

export function WatchTeaser({ videos }: WatchTeaserProps) {
  const [featured] = videos;
  if (!featured) return null;

  return (
    <section id="watch" className="bg-surface-elevated py-24 md:py-36">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-6 md:grid-cols-[1fr_0.85fr] md:gap-16 md:px-10 lg:gap-20">
        <Reveal>
          <p className="eyebrow">Watch</p>
          <h2 className="font-display mt-4 text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[1.05] tracking-[-0.025em] text-ink">
            Speaking up about what matters.
          </h2>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-muted md:text-[17px]">
            Short commentary on the news, the policy behind it, and why it
            matters — recorded for{" "}
            <span className="text-ink">@elleninpolitics</span>.
          </p>

          <p className="mt-10 text-[11px] font-medium tracking-[0.16em] text-denim uppercase">
            Now playing
          </p>
          <p className="font-display mt-3 text-[1.35rem] font-medium leading-snug tracking-[-0.02em] text-ink md:text-[1.5rem]">
            {featured.title}
          </p>

          <div className="mt-8">
            <Link href="/watch" className="btn-editorial">
              All videos <span aria-hidden>→</span>
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <VideoPlayer video={featured} portraitHeight="min(70vh, 620px)" />
        </Reveal>
      </div>
    </section>
  );
}
