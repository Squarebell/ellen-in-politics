import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const videosDir = path.join(root, "content", "videos");
const outFile = path.join(root, "src", "data", "videos.json");
const publicRoot = path.join(root, "public");

const FOCUS_VALUES = new Set(["center", "top", "bottom", "left", "right"]);

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

/** Find a media file on disk, including CMS misplacement under content/videos/public/. */
function findMediaFile(publicPath) {
  if (!publicPath || /^https?:\/\//i.test(publicPath)) return null;
  const rel = publicPath.replace(/^\//, "");
  const candidates = [
    path.join(publicRoot, rel),
    path.join(videosDir, "public", rel),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** Prefer the processed slug.mp4 for new CMS uploads under /uploads/videos/. */
function resolveVideoSrc(slug, dataVideo) {
  const declared = resolvePublicPath(dataVideo) ?? "";
  if (!dataVideo?.startsWith("/uploads/")) {
    return declared;
  }
  const processed = `/uploads/videos/${slug}.mp4`;
  if (fs.existsSync(path.join(publicRoot, processed.slice(1)))) {
    return processed;
  }
  const found = findMediaFile(dataVideo);
  if (found) {
    return resolvePublicPath(`/uploads/videos/${path.basename(found)}`);
  }
  return declared;
}

function normalizeDurationLabel(raw) {
  if (raw == null || raw === "") return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const total = Math.max(0, Math.round(raw));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  const text = String(raw).trim();
  const cleaned = text.replace(/\s+/g, "");
  const match = cleaned.match(/^(\d+):(\d{1,2})$/);
  if (match) {
    return `${Number(match[1])}:${Number(match[2]).toString().padStart(2, "0")}`;
  }
  return text;
}

/** Prefer a .jpg poster; fall back to slug-based auto-generated poster. */
function resolvePoster(slug, dataPoster) {
  const autoPoster = `/uploads/posters/${slug}.jpg`;
  if (fs.existsSync(path.join(publicRoot, autoPoster.replace(/^\//, "")))) {
    return autoPoster;
  }
  const found = findMediaFile(dataPoster);
  if (found) {
    const ext = path.extname(found).toLowerCase();
    if (ext === ".heic" || ext === ".heif") {
      const jpg = autoPoster;
      if (fs.existsSync(path.join(publicRoot, jpg.replace(/^\//, "")))) return jpg;
    }
    return resolvePublicPath(dataPoster);
  }
  return (
    resolvePublicPath(dataPoster) ??
    "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80"
  );
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

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function isPublished(data, today) {
  if (data.draft === true || data.draft === "true") return false;
  const after = formatDate(data.publishAfter);
  if (after && after > today) return false;
  return true;
}

function normalizeFocus(value) {
  const focus = String(value ?? "center").toLowerCase();
  return FOCUS_VALUES.has(focus) ? focus : "center";
}

function loadCaptionsTranscript(captionsSrc) {
  if (!captionsSrc || /^https?:\/\//i.test(captionsSrc)) return [];
  const absolute = path.join(publicRoot, captionsSrc.replace(/^\//, ""));
  if (!fs.existsSync(absolute)) return [];
  return parseVtt(fs.readFileSync(absolute, "utf8"));
}

function compareVideos(a, b) {
  const aOrder = Number.isFinite(a.sortOrder) ? a.sortOrder : Number.POSITIVE_INFINITY;
  const bOrder = Number.isFinite(b.sortOrder) ? b.sortOrder : Number.POSITIVE_INFINITY;
  if (aOrder !== bOrder) return aOrder - bOrder;
  const aTime = a.date ? new Date(a.date).getTime() : 0;
  const bTime = b.date ? new Date(b.date).getTime() : 0;
  return bTime - aTime;
}

if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

const today = todayUtc();

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

    const sortRaw = data.sortOrder;
    const sortOrder =
      sortRaw === "" || sortRaw == null ? null : Number(sortRaw);

    return {
      slug,
      title: String(data.title ?? slug),
      eyebrow: String(data.eyebrow ?? "Watch"),
      description: String(data.description ?? ""),
      date: formatDate(data.date),
      src: resolveVideoSrc(slug, data.video),
      poster: resolvePoster(slug, data.poster),
      posterFocus: normalizeFocus(data.posterFocus),
      captionsSrc,
      durationLabel: normalizeDurationLabel(data.durationLabel),
      orientation: data.orientation === "landscape" ? "landscape" : "portrait",
      instagramUrl: data.instagramUrl
        ? String(data.instagramUrl)
        : "https://www.instagram.com/elleninpolitics/",
      transcript,
      featured: data.featured === true || data.featured === "true",
      series: data.series ? String(data.series).trim() : "",
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : null,
      _published: isPublished(data, today),
    };
  })
  .filter((video) => video.src && video._published)
  .map(({ _published, ...video }) => video)
  .sort(compareVideos);

/** Only the newest featured video keeps featured:true in the public JSON. */
const featuredVideos = videos.filter((video) => video.featured);
const featuredWinnerSlug =
  featuredVideos.length <= 1
    ? featuredVideos[0]?.slug
    : [...featuredVideos].sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        if (bTime !== aTime) return bTime - aTime;
        return a.slug.localeCompare(b.slug);
      })[0].slug;

const exclusiveVideos = videos.map((video) => ({
  ...video,
  featured: featuredWinnerSlug ? video.slug === featuredWinnerSlug : false,
}));

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(exclusiveVideos, null, 2) + "\n");
console.log(
  `Wrote ${exclusiveVideos.length} published videos → src/data/videos.json` +
    (featuredWinnerSlug ? ` (featured: ${featuredWinnerSlug})` : ""),
);
