"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  featuredVideo,
  formatTimecode,
  type TranscriptCue,
  type VideoFeature,
} from "@/lib/videos";

type VideoPlayerProps = {
  video?: VideoFeature;
};

function videoMimeType(src: string): string {
  const ext = src.split("?")[0].split(".").pop()?.toLowerCase();
  switch (ext) {
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    case "m4v":
      return "video/x-m4v";
    case "mp4":
    default:
      return "video/mp4";
  }
}

export function VideoPlayer({ video = featuredVideo }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [activeCue, setActiveCue] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const syncCaptions = useCallback(
    (on: boolean) => {
      const el = videoRef.current;
      if (!el) return;
      const tracks = el.textTracks;
      for (let i = 0; i < tracks.length; i += 1) {
        tracks[i].mode = on ? "showing" : "hidden";
      }
    },
    [],
  );

  useEffect(() => {
    syncCaptions(captionsOn);
  }, [captionsOn, syncCaptions]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onTime = () => {
      setCurrentTime(el.currentTime);
      const index = video.transcript.findIndex(
        (cue) => el.currentTime >= cue.start && el.currentTime < cue.end,
      );
      if (index >= 0) setActiveCue(index);
    };
    const onMeta = () => setDuration(el.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    // Ensure track is ready
    syncCaptions(captionsOn);

    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [captionsOn, syncCaptions, video.transcript]);

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }

  function seekTo(cue: TranscriptCue, index: number) {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = cue.start + 0.05;
    setActiveCue(index);
    void el.play();
  }

  function onKeySeek(event: KeyboardEvent<HTMLButtonElement>, cue: TranscriptCue, index: number) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      seekTo(cue, index);
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isPortrait = video.orientation === "portrait";

  return (
    <div className="w-full">
      <div className="media-frame relative overflow-hidden bg-surface-dark shadow-[0_40px_80px_-40px_rgba(0,0,0,0.55)]">
        <div
          className={
            isPortrait
              ? "relative flex min-h-[min(82vh,920px)] items-center justify-center bg-black"
              : "relative aspect-video bg-black"
          }
        >
          <div
            className={
              isPortrait
                ? "relative aspect-[9/16] h-[min(82vh,920px)] w-auto max-w-full"
                : "absolute inset-0"
            }
          >
          <video
            ref={videoRef}
            className={`h-full w-full ${isPortrait ? "object-contain" : "object-cover"}`}
            poster={video.poster}
            playsInline
            preload="metadata"
          >
            <source src={video.src} type={videoMimeType(video.src)} />
            {video.captionsSrc ? (
              <track
                kind="captions"
                srcLang="en"
                label="English"
                src={video.captionsSrc}
              />
            ) : null}
          </video>

          {/* Soft vignette — cinematic, not clutter */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

          {/* Center play affordance when paused */}
          {!playing && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label="Play video"
              className="absolute inset-0 z-10 flex items-center justify-center"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-ink shadow-lg transition hover:scale-[1.03] md:h-20 md:w-20">
                <span className="ml-1 border-y-[10px] border-l-[16px] border-y-transparent border-l-ink" />
              </span>
            </button>
          )}
          </div>
        </div>

        {/* Control bar */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-16 md:px-6 md:pb-5">
          <div
            className="mb-3 h-[2px] w-full cursor-pointer overflow-hidden bg-white/20"
            onClick={(event) => {
              const el = videoRef.current;
              if (!el || !duration) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const ratio = Math.min(
                1,
                Math.max(0, (event.clientX - rect.left) / rect.width),
              );
              el.currentTime = ratio * duration;
            }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
              const el = videoRef.current;
              if (!el) return;
              event.preventDefault();
              el.currentTime = Math.min(
                duration,
                Math.max(
                  0,
                  el.currentTime + (event.key === "ArrowRight" ? 5 : -5),
                ),
              );
            }}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration) || 0}
            aria-valuenow={Math.floor(currentTime)}
            tabIndex={0}
          >
            <div
              className="h-full bg-white transition-[width] duration-150 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="rounded-full bg-white px-4 py-2 text-[12px] font-medium tracking-[0.06em] text-ink uppercase transition hover:bg-white/90"
              >
                {playing ? "Pause" : "Play"}
              </button>
              <span className="text-[12px] tabular-nums tracking-[0.04em] text-white/70">
                {formatTimecode(currentTime)}
                <span className="text-white/35"> / </span>
                {duration ? formatTimecode(duration) : video.durationLabel}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {video.captionsSrc && (
                <button
                  type="button"
                  aria-pressed={captionsOn}
                  onClick={() => setCaptionsOn((value) => !value)}
                  className={`rounded-full px-4 py-2 text-[12px] font-medium tracking-[0.08em] uppercase transition ${
                    captionsOn
                      ? "bg-white text-ink"
                      : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  CC
                </button>
              )}
              {video.transcript.length > 0 && (
                <button
                  type="button"
                  aria-expanded={transcriptOpen}
                  onClick={() => setTranscriptOpen((value) => !value)}
                  className={`rounded-full px-4 py-2 text-[12px] font-medium tracking-[0.06em] uppercase transition ${
                    transcriptOpen
                      ? "bg-white text-ink"
                      : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  Transcript
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transcript panel */}
      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          transcriptOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-8 border-t border-rule pt-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Transcript</p>
                <p className="mt-2 max-w-md text-[15px] text-muted">
                  Follow along, or jump to a moment. Captions stay available with
                  CC while you watch.
                </p>
              </div>
            </div>

            <ol className="space-y-1">
              {video.transcript.map((cue, index) => {
                const active = index === activeCue && playing;
                return (
                  <li key={`${cue.start}-${cue.text.slice(0, 12)}`}>
                    <button
                      type="button"
                      onClick={() => seekTo(cue, index)}
                      onKeyDown={(event) => onKeySeek(event, cue, index)}
                      className={`group flex w-full gap-5 rounded-sm px-3 py-4 text-left transition md:gap-8 md:px-4 ${
                        active
                          ? "bg-marble-deep"
                          : "hover:bg-marble-deep/70"
                      }`}
                    >
                      <span
                        className={`shrink-0 pt-0.5 text-[12px] tabular-nums tracking-[0.04em] ${
                          active ? "text-denim" : "text-muted"
                        }`}
                      >
                        {formatTimecode(cue.start)}
                      </span>
                      <span
                        className={`text-[15px] leading-relaxed md:text-[16px] ${
                          active ? "text-ink" : "text-ink-soft"
                        }`}
                      >
                        {cue.text}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
