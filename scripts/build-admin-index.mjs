/**
 * Admin content index for Decap custom widgets.
 * Includes drafts so editors can see/feature/related-pick across all entries.
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const postsDir = path.join(root, "content", "posts");
const videosDir = path.join(root, "content", "videos");
const outFile = path.join(root, "public", "admin", "content-index.json");

const SUGGESTED_TOPICS = [
  "Civic",
  "Feminism",
  "Democracy",
  "Career",
  "Policy",
  "Connection",
];

function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : text;
}

function readPosts() {
  if (!fs.existsSync(postsDir)) return [];
  return fs
    .readdirSync(postsDir)
    .filter((file) => file.endsWith(".md"))
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const { data } = matter(
        fs.readFileSync(path.join(postsDir, filename), "utf8"),
      );
      return {
        slug,
        title: String(data.title ?? slug),
        topic: String(data.topic ?? "Civic"),
        featured: data.featured === true || data.featured === "true",
        draft: data.draft === true || data.draft === "true",
        image: data.image ? String(data.image) : "",
        ogImage: data.ogImage ? String(data.ogImage) : "",
        date: formatDate(data.date),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

function readVideos() {
  if (!fs.existsSync(videosDir)) return [];
  return fs
    .readdirSync(videosDir)
    .filter((file) => file.endsWith(".md"))
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const { data } = matter(
        fs.readFileSync(path.join(videosDir, filename), "utf8"),
      );
      return {
        slug,
        title: String(data.title ?? slug),
        series: data.series ? String(data.series).trim() : "",
        featured: data.featured === true || data.featured === "true",
        draft: data.draft === true || data.draft === "true",
        video: data.video ? String(data.video) : "",
        poster: data.poster ? String(data.poster) : "",
        captions: data.captions ? String(data.captions) : "",
        durationLabel: data.durationLabel != null ? String(data.durationLabel) : "",
        date: formatDate(data.date),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

const posts = readPosts();
const videos = readVideos();

const topics = Array.from(
  new Set([
    ...SUGGESTED_TOPICS,
    ...posts.map((post) => post.topic).filter(Boolean),
  ]),
).sort((a, b) => a.localeCompare(b));

const series = Array.from(
  new Set(videos.map((video) => video.series).filter(Boolean)),
).sort((a, b) => a.localeCompare(b));

const index = {
  generatedAt: new Date().toISOString(),
  topics,
  series,
  posts,
  videos,
};

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(index, null, 2) + "\n");
console.log(
  `Wrote admin index (${posts.length} posts, ${videos.length} videos) → public/admin/content-index.json`,
);
