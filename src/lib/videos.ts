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

/**
 * Watch library — videos from Ellen’s shared Drive folder
 * (originally Instagram / export clips).
 *
 * To add more: drop .mp4 (+ optional poster) in public/videos/ellen/
 * and add an entry below.
 */
export const videos: VideoFeature[] = [
  {
    slug: "n-word-as-a-white-person",
    title: "Using the N-word as a white person",
    eyebrow: "Watch · Commentary",
    description:
      "A direct conversation about language, accountability, and why intent isn’t enough.",
    src: "/videos/ellen/reel-01.mp4",
    poster: "/videos/ellen/reel-01-poster.jpg",
    durationLabel: "1:30",
    orientation: "portrait",
    instagramUrl: "https://www.instagram.com/elleninpolitics/",
    transcript: [],
  },
  {
    slug: "trump-admin-womens-healthcare",
    title: "How the Trump admin is attacking women’s healthcare",
    eyebrow: "Watch · Policy",
    description:
      "Breaking down what’s at stake for reproductive care and women’s health rights.",
    src: "/videos/ellen/reel-02.mp4",
    poster: "/videos/ellen/reel-02-poster.jpg",
    durationLabel: "1:29",
    orientation: "portrait",
    instagramUrl: "https://www.instagram.com/elleninpolitics/",
    transcript: [],
  },
  {
    slug: "election-denialism",
    title: "Election denialism & the threat it poses to democracy",
    eyebrow: "Watch · Democracy",
    description:
      "Why refusing election results isn’t just rhetoric — and what it does to democratic trust.",
    src: "/videos/ellen/reel-03.mp4",
    poster: "/videos/ellen/reel-03-poster.jpg",
    durationLabel: "1:10",
    orientation: "portrait",
    instagramUrl: "https://www.instagram.com/elleninpolitics/",
    transcript: [],
  },
  {
    slug: "why-we-still-need-feminism",
    title: "Why we still need feminism",
    eyebrow: "Watch · Feminism",
    description:
      "A clear case for feminism as unfinished civic work — not a vibe, a practice.",
    src: "/videos/ellen/reel-04.mp4",
    poster: "/videos/ellen/reel-04-poster.jpg",
    durationLabel: "1:07",
    orientation: "portrait",
    instagramUrl: "https://www.instagram.com/elleninpolitics/",
    transcript: [],
  },
  {
    slug: "universal-healthcare",
    title: "Why universal healthcare isn’t the ‘perfect’ solution it’s sold as",
    eyebrow: "Watch · Healthcare",
    description:
      "A closer look at the tradeoffs, talking points, and what a serious healthcare debate requires.",
    src: "/videos/ellen/reel-05.mp4",
    poster: "/videos/ellen/reel-05-poster.jpg",
    durationLabel: "1:34",
    orientation: "portrait",
    instagramUrl: "https://www.instagram.com/elleninpolitics/",
    transcript: [],
  },
];

export const featuredVideo = videos[0];

export function getVideoBySlug(slug: string): VideoFeature | undefined {
  return videos.find((video) => video.slug === slug);
}

export function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
