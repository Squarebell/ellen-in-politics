import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const postsDir = path.join(root, "content", "posts");
const outFile = path.join(root, "src", "data", "posts.json");

const fallbackImage =
  "https://images.unsplash.com/photo-1501466044931-62695aada8e9?auto=format&fit=crop&w=1200&q=80";

const FOCUS_VALUES = new Set(["center", "top", "bottom", "left", "right"]);

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
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

function isPublished(data, today) {
  if (data.draft === true || data.draft === "true") return false;
  const after = formatDate(data.publishAfter);
  if (after && after > today) return false;
  return true;
}

function readingTimeMinutes(content) {
  const words = content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function normalizeFocus(value) {
  const focus = String(value ?? "center").toLowerCase();
  return FOCUS_VALUES.has(focus) ? focus : "center";
}

function resolvePublicPath(filePath) {
  if (!filePath) return undefined;
  if (/^https?:\/\//i.test(filePath)) return filePath;
  return filePath.startsWith("/") ? filePath : `/${filePath}`;
}

function comparePosts(a, b) {
  const aOrder = Number.isFinite(a.sortOrder) ? a.sortOrder : Number.POSITIVE_INFINITY;
  const bOrder = Number.isFinite(b.sortOrder) ? b.sortOrder : Number.POSITIVE_INFINITY;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

const today = todayUtc();

const posts = fs
  .readdirSync(postsDir)
  .filter((file) => file.endsWith(".md"))
  .map((filename) => {
    const slug = filename.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(postsDir, filename), "utf8");
    const { data, content } = matter(raw);
    const body = content.trim();
    const image = String(data.image ?? fallbackImage);
    const ogImage = resolvePublicPath(data.ogImage) || image;
    const sortRaw = data.sortOrder;
    const sortOrder =
      sortRaw === "" || sortRaw == null ? null : Number(sortRaw);

    return {
      slug,
      title: String(data.title ?? slug),
      excerpt: String(data.excerpt ?? ""),
      date: formatDate(data.date),
      topic: String(data.topic ?? "Civic"),
      image,
      imageAlt: String(data.imageAlt ?? data.title ?? "Post image"),
      imageFocus: normalizeFocus(data.imageFocus),
      content: body,
      featured: data.featured === true || data.featured === "true",
      homepage: data.homepage !== false && data.homepage !== "false",
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : null,
      seoTitle: data.seoTitle ? String(data.seoTitle) : "",
      seoDescription: data.seoDescription ? String(data.seoDescription) : "",
      ogImage,
      related: Array.isArray(data.related)
        ? data.related.map(String).filter(Boolean)
        : [],
      readingTimeMinutes: readingTimeMinutes(body),
    _published: isPublished(data, today),
  };
})
.filter((post) => post._published)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
.map(({ _published, ...post }) => post)
  .sort(comparePosts);

/** Only the newest featured post keeps featured:true in the public JSON. */
const featuredPosts = posts.filter((post) => post.featured);
const featuredWinnerSlug =
  featuredPosts.length <= 1
    ? featuredPosts[0]?.slug
    : [...featuredPosts].sort((a, b) => {
        const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (byDate !== 0) return byDate;
        return a.slug.localeCompare(b.slug);
      })[0].slug;

const exclusivePosts = posts.map((post) => ({
  ...post,
  featured: featuredWinnerSlug ? post.slug === featuredWinnerSlug : false,
}));

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(exclusivePosts, null, 2) + "\n");
console.log(
  `Wrote ${exclusivePosts.length} published posts → src/data/posts.json` +
    (featuredWinnerSlug ? ` (featured: ${featuredWinnerSlug})` : ""),
);
