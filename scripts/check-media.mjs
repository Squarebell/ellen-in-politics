/**
 * Broken-media check for CMS content.
 * Validates that local image/video/caption paths referenced in
 * content/posts and content/videos exist under public/.
 *
 * Exit 1 when any local asset is missing (CI-friendly).
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicRoot = path.join(root, "public");
const postsDir = path.join(root, "content", "posts");
const videosDir = path.join(root, "content", "videos");

const missing = [];

function checkLocal(relOrUrl, label) {
  if (!relOrUrl) return;
  const value = String(relOrUrl).trim();
  if (!value || /^https?:\/\//i.test(value)) return;
  const rel = value.replace(/^\//, "");
  const absolute = path.join(publicRoot, rel);
  if (!fs.existsSync(absolute)) {
    missing.push(`${label}: /${rel}`);
  }
}

function scanMarkdownDir(dir, kind) {
  if (!fs.existsSync(dir)) return;
  for (const filename of fs.readdirSync(dir)) {
    if (!filename.endsWith(".md")) continue;
    const slug = filename.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(dir, filename), "utf8");
    const { data, content } = matter(raw);

    if (kind === "post") {
      checkLocal(data.image, `post ${slug} image`);
      checkLocal(data.ogImage, `post ${slug} ogImage`);
      const inlineImages = content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g);
      for (const match of inlineImages) {
        checkLocal(match[1], `post ${slug} inline image`);
      }
    }

    if (kind === "video") {
      checkLocal(data.video, `video ${slug} video`);
      checkLocal(data.poster, `video ${slug} poster`);
      checkLocal(data.captions, `video ${slug} captions`);
    }
  }
}

scanMarkdownDir(postsDir, "post");
scanMarkdownDir(videosDir, "video");

if (missing.length) {
  console.error("Broken media references:\n" + missing.map((m) => `  - ${m}`).join("\n"));
  process.exit(1);
}

console.log("Media check passed — all local CMS asset paths exist.");
