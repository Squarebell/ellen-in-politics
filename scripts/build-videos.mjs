import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const videosDir = path.join(root, "content", "videos");
const outFile = path.join(root, "src", "data", "videos.json");
const publicRoot = path.join(root, "public");

/**
 * Parse a WebVTT file into timed transcript cues.
 * Supports common Instagram/export formats.
 */
function parseVtt(contents) {
  const cues = [];
  const blocks = contents
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .split(/\n\n+/);

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length || lines[0] === "WEBVTT" || lines[0].startsWith("NOTE")) {
      continue;
    }

    const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeLineIndex === -1) continue;

    const [startRaw, endRaw] = lines[timeLineIndex]
      .split("-->")
      .map((part) => part.trim().split(/\s+/)[0]);
    const text = lines
      .slice(timeLineIndex + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (!text) continue;

    const start = vttTimeToSeconds(startRaw);
    const end = vttTimeToSeconds(endRaw);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      cues.push({ start, end, text });
    }
  }

  return cues;
}

function vttTimeToSeconds(value) {
  const parts = String(value).split(":");
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return Number(m) * 60 + Number(s);
  }
  return Number(value);
}

function resolvePublicPath(filePath) {
  if (!filePath) return undefined;
  if (/^https?:\/\//i.test(filePath)) return filePath;
  return filePath.startsWith("/") ? filePath : `/${filePath}`;
}

function basenameFromPath(filePath) {
  return path.basename(String(filePath).split("?")[0]);
}

function normalizeDurationLabel(label) {
  if (label == null || label === "") return "";
  // YAML may parse "1:24" as sexagesimal (84) — recover when possible
  if (typeof label === "number" && Number.isFinite(label) && label >= 60) {
    const minutes = Math.floor(label / 60);
    const seconds = label % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }
  const text = String(label).trim();
  const cleaned = text.replace(/\s+/g, "");
  const match = cleaned.match(/^(\d+):(\d{1,2})$/);
  if (match) {
    return `${Number(match[1])}:${match[2].padStart(2, "0")}`;
  }
  return text;
}

function resolveVideoPath(slug, videoRef) {
  if (!videoRef || /^https?:\/\//i.test(videoRef)) return videoRef;

  const misplacedDir = path.join(
    root,
    "content",
    "videos",
    "public",
    "uploads",
    "videos",
  );
  const candidates = [
    path.join(publicRoot, videoRef.replace(/^\//, "")),
    path.join(publicRoot, "uploads", "videos", `${slug}.mp4`),
    path.join(misplacedDir, basenameFromPath(videoRef)),
    path.join(publicRoot, "uploads", "videos", basenameFromPath(videoRef)),
    path.join(publicRoot, "uploads", basenameFromPath(videoRef)),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      if (candidate.includes(`${path.sep}uploads${path.sep}videos${path.sep}${slug}.mp4`)) {
        return `/uploads/videos/${slug}.mp4`;
      }
      return resolvePublicPath(videoRef);
    }
  }

  return resolvePublicPath(videoRef);
}

function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : text;
}

function loadCaptionsTranscript(captionsSrc) {
  if (!captionsSrc || /^https?:\/\//i.test(captionsSrc)) return [];
  const absolute = path.join(publicRoot, captionsSrc.replace(/^\//, ""));
  if (!fs.existsSync(absolute)) return [];
  return parseVtt(fs.readFileSync(absolute, "utf8"));
}

if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

const videos = fs
  .readdirSync(videosDir)
  .filter((file) => file.endsWith(".md"))
  .map((filename) => {
    const slug = filename.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(videosDir, filename), "utf8");
    const { data, content } = matter(raw);

    const captionsSrc = resolvePublicPath(data.captions);
    const manualTranscript = Array.isArray(data.transcript)
      ? data.transcript
          .map((cue) => ({
            start: Number(cue.start),
            end: Number(cue.end),
            text: String(cue.text ?? "").trim(),
          }))
          .filter(
            (cue) =>
              cue.text &&
              Number.isFinite(cue.start) &&
              Number.isFinite(cue.end),
          )
      : [];

    const bodyText = content.trim();
    let transcript = manualTranscript;
    if (!transcript.length && captionsSrc) {
      transcript = loadCaptionsTranscript(captionsSrc);
    }
    if (!transcript.length && bodyText) {
      transcript = [{ start: 0, end: 9999, text: bodyText }];
    }

    return {
      slug,
      title: String(data.title ?? slug),
      eyebrow: String(data.eyebrow ?? "Watch"),
      description: String(data.description ?? ""),
      date: formatDate(data.date),
      src: resolveVideoPath(slug, data.video) ?? "",
      poster:
        resolvePublicPath(data.poster) ??
        "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80",
      captionsSrc,
      durationLabel: normalizeDurationLabel(data.durationLabel ?? ""),
      orientation: data.orientation === "landscape" ? "landscape" : "portrait",
      instagramUrl: data.instagramUrl
        ? String(data.instagramUrl)
        : "https://www.instagram.com/elleninpolitics/",
      transcript,
    };
  })
  .filter((video) => video.src)
  .sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(videos, null, 2) + "\n");
console.log(`Wrote ${videos.length} videos → src/data/videos.json`);
