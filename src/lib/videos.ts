import videosData from "@/data/videos.json";

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
  captionsSrc?: string;
  durationLabel: string;
  /** portrait = Instagram reel (9:16), landscape = widescreen */
  orientation?: "portrait" | "landscape";
  transcript: TranscriptCue[];
  /** Optional Instagram reel URL for “view on Instagram” */
  instagramUrl?: string;
};

const videos = videosData as VideoFeature[];

export { videos };

export const featuredVideo = videos[0];

export function getVideoBySlug(slug: string): VideoFeature | undefined {
  return videos.find((video) => video.slug === slug);
}

export function getAllVideos(): VideoFeature[] {
  return videos;
}

export function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
