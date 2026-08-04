"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { focusObjectPosition } from "@/lib/posts";
import { getVideoSeries, type VideoFeature } from "@/lib/videos";

type WatchExperienceProps = {
  videos: VideoFeature[];
  initialSlug?: string;
};

export function WatchExperience({ videos, initialSlug }: WatchExperienceProps) {
  const seriesList = useMemo(() => getVideoSeries(videos), [videos]);
  const [seriesFilter, setSeriesFilter] = useState<string>("all");

  const list = useMemo(() => {
    if (seriesFilter === "all") return videos;
    return videos.filter((video) => video.series === seriesFilter);
  }, [videos, seriesFilter]);

  const initial =
    list.find((video) => video.slug === initialSlug) ??
    list.find((video) => video.featured) ??
    list[0];
  const [active, setActive] = useState<VideoFeature | undefined>(initial);

  const current =
    (active && list.find((video) => video.slug === active.slug)) || list[0];

  if (!videos.length || !current) {
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
        <p className="eyebrow">{current.eyebrow}</p>
        <h1 className="font-display mt-4 text-[clamp(2.6rem,6vw,4.25rem)] font-medium leading-[1.05] tracking-[-0.03em] text-ink">
          {current.title}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-muted md:mx-0 md:text-[17px]">
          {current.description}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] tracking-[0.06em] text-muted uppercase md:justify-start">
          {current.series && (
            <>
              <span className="text-denim">{current.series}</span>
              <span className="text-rule">·</span>
            </>
          )}
          <span>{current.durationLabel}</span>
          {current.captionsSrc && (
            <>
              <span className="text-rule">·</span>
              <span>Captions available</span>
            </>
          )}
          {current.transcript.length > 0 && (
            <>
              <span className="text-rule">·</span>
              <span>Full transcript</span>
            </>
          )}
          {current.instagramUrl && (
            <>
              <span className="text-rule">·</span>
              <a
                href={current.instagramUrl}
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
        <VideoPlayer key={current.slug} video={current} />
      </div>

      {seriesList.length > 0 && (
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2 md:justify-start">
          <button
            type="button"
            onClick={() => setSeriesFilter("all")}
            className={`text-[11px] font-medium tracking-[0.14em] uppercase transition ${
              seriesFilter === "all" ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            All
          </button>
          {seriesList.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setSeriesFilter(name);
                const first = videos.find((video) => video.series === name);
                if (first) setActive(first);
              }}
              className={`text-[11px] font-medium tracking-[0.14em] uppercase transition ${
                seriesFilter === name ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {list.length > 1 && (
        <section className="mt-16 border-t border-rule pt-12 md:mt-20">
          <p className="eyebrow">More to watch</p>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {list.map((video) => {
              const selected = video.slug === current.slug;
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
                        style={{
                          objectPosition: focusObjectPosition(video.posterFocus),
                        }}
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
                    {video.series ? (
                      <p className="mt-1 text-[11px] tracking-[0.12em] text-denim uppercase">
                        {video.series}
                      </p>
                    ) : null}
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
          .
        </p>
      </aside>
    </div>
  );
}
