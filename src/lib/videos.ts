import videosData from "@/data/videos.json";
import type { ImageFocus } from "@/lib/posts";

export type TranscriptCue = {
  start: number;
  end: number;
  text: string;
};

export type VideoFeature = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  /** Local path under /public or remote mp4/webm */
  src: string;
  poster: string;
  posterFocus?: ImageFocus;
  captionsSrc?: string;
  durationLabel: string;
  /** portrait = Instagram reel (9:16), landscape = widescreen */
  orientation?: "portrait" | "landscape";
  transcript: TranscriptCue[];
  /** Optional Instagram reel URL or profile fallback — always set by the build script */
  instagramUrl: string;
  featured?: boolean;
  series?: string;
  sortOrder?: number | null;
  date?: string;
};

const videos = videosData as VideoFeature[];

export { videos };

export function getAllVideos(): VideoFeature[] {
  return videos;
}

/** Newest publish date wins if more than one video is marked featured. */
export function getFeaturedVideo(
  list: VideoFeature[] = videos,
): VideoFeature | undefined {
  if (!list.length) return undefined;
  const featured = list.filter((video) => video.featured);
  if (!featured.length) return list[0];
  return [...featured].sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.slug.localeCompare(b.slug);
  })[0];
}

export const featuredVideo = getFeaturedVideo();

export function getVideoBySlug(slug: string): VideoFeature | undefined {
  return videos.find((video) => video.slug === slug);
}

export function getVideoSeries(list: VideoFeature[] = videos): string[] {
  const seen = new Set<string>();
  const series: string[] = [];
  for (const video of list) {
    const name = video.series?.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    series.push(name);
  }
  return series;
}

export function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** MIME type for native <video> — supports iPhone .mov uploads before CI remuxes them. */
export function videoMimeType(src: string): string {
  const ext = src.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    case "m4v":
      return "video/x-m4v";
    default:
      return "video/mp4";
  }
}
