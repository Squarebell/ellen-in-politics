"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { type VideoFeature } from "@/lib/videos";

type WatchExperienceProps = {
  videos: VideoFeature[];
  initialSlug?: string;
};

export function WatchExperience({ videos, initialSlug }: WatchExperienceProps) {
  const initial =
    videos.find((video) => video.slug === initialSlug) ?? videos[0];
  const [active, setActive] = useState<VideoFeature>(initial);

  const list = useMemo(() => videos, [videos]);

  if (!videos.length) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow">Watch</p>
        <h1 className="font-display mt-4 text-[clamp(2.6rem,6vw,4.25rem)] font-medium leading-[1.05] tracking-[-0.03em] text-ink">
          Coming soon
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed text-muted md:text-[17px]">
          New videos will appear here after they&apos;re published in the CMS.
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="mx-auto max-w-3xl text-center md:text-left">
        <p className="eyebrow">{active.eyebrow}</p>
        <h1 className="font-display mt-4 text-[clamp(2.6rem,6vw,4.25rem)] font-medium leading-[1.05] tracking-[-0.03em] text-ink">
          {active.title}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-muted md:mx-0 md:text-[17px]">
          {active.description}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] tracking-[0.06em] text-muted uppercase md:justify-start">
          <span>{active.durationLabel}</span>
          {active.captionsSrc && (
            <>
              <span className="text-rule">·</span>
              <span>Captions available</span>
            </>
          )}
          {active.transcript.length > 0 && (
            <>
              <span className="text-rule">·</span>
              <span>Full transcript</span>
            </>
          )}
          {active.instagramUrl && (
            <>
              <span className="text-rule">·</span>
              <a
                href={active.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-denim transition hover:text-ink"
              >
                @elleninpolitics
              </a>
            </>
          )}
        </div>
      </header>

      <div className="mt-12 md:mt-16">
        <VideoPlayer key={active.slug} video={active} />
      </div>

      {list.length > 1 && (
        <section className="mt-16 border-t border-rule pt-12 md:mt-20">
          <p className="eyebrow">More to watch</p>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {list.map((video) => {
              const selected = video.slug === active.slug;
              const portrait = video.orientation === "portrait";
              return (
                <li key={video.slug}>
                  <button
                    type="button"
                    onClick={() => setActive(video)}
                    className={`group w-full text-left transition ${
                      selected
                        ? "opacity-100 ring-1 ring-ink/20 ring-offset-4 ring-offset-marble"
                        : "opacity-90 hover:opacity-100"
                    }`}
                  >
                    <div
                      className={`media-frame relative overflow-hidden bg-marble-deep ${
                        portrait ? "aspect-[9/16]" : "aspect-video"
                      }`}
                    >
                      <Image
                        src={video.poster}
                        alt=""
                        fill
                        className="object-cover transition duration-700 group-hover:scale-[1.03]"
                        sizes="(max-width: 640px) 100vw, 20vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <span className="absolute bottom-3 left-3 text-[11px] font-medium tracking-[0.08em] text-white uppercase">
                        {video.durationLabel}
                      </span>
                    </div>
                    <p className="font-display mt-3 text-[1.2rem] font-medium leading-snug tracking-[-0.02em] text-ink md:text-[1.25rem]">
                      {video.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[13px] text-muted">
                      {video.description}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <aside className="mx-auto mt-16 max-w-2xl border-t border-rule pt-10 md:mt-20">
        <p className="eyebrow">More from Instagram</p>
        <p className="mt-4 text-[16px] leading-relaxed text-muted md:text-[17px]">
          These clips come from{" "}
          <a
            href="https://www.instagram.com/elleninpolitics/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink underline decoration-rule underline-offset-4 transition hover:text-denim"
          >
            @elleninpolitics
          </a>
          . New videos, captions, and transcripts are published from the{" "}
          <a
            href="/admin/"
            className="font-medium text-ink underline decoration-rule underline-offset-4 transition hover:text-denim"
          >
            site admin
          </a>
          .
        </p>
      </aside>
    </div>
  );
}
