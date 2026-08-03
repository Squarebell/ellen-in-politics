/**
 * Ensure only one Writing post and one Watch video are featured.
 * Winner = newest publish date (then slug). Rewrites markdown frontmatter
 * so the CMS stays in sync after Ellen features a new homepage item.
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : text;
}

function isFeatured(data) {
  return data.featured === true || data.featured === "true";
}

function readEntries(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((filename) => {
      const abs = path.join(dir, filename);
      const raw = fs.readFileSync(abs, "utf8");
      const parsed = matter(raw);
      return {
        abs,
        filename,
        slug: filename.replace(/\.md$/, ""),
        date: formatDate(parsed.data.date),
        featured: isFeatured(parsed.data),
        parsed,
        raw,
      };
    });
}

function pickWinner(entries) {
  const featured = entries.filter((entry) => entry.featured);
  if (featured.length <= 1) return featured[0] ?? null;
  return [...featured].sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.slug.localeCompare(b.slug);
  })[0];
}

function normalizeCollection(label, dir) {
  const entries = readEntries(dir);
  const featured = entries.filter((entry) => entry.featured);
  if (featured.length <= 1) {
    console.log(`${label}: ${featured.length} featured — nothing to clear`);
    return 0;
  }

  const winner = pickWinner(entries);
  let changed = 0;

  for (const entry of featured) {
    if (entry.slug === winner.slug) continue;
    const data = { ...entry.parsed.data, featured: false };
    const next = matter.stringify(entry.parsed.content, data);
    if (next !== entry.raw) {
      fs.writeFileSync(entry.abs, next);
      changed += 1;
      console.log(`${label}: cleared featured on ${entry.slug}`);
    }
  }

  console.log(
    `${label}: kept featured → ${winner.slug} (newest of ${featured.length})`,
  );
  return changed;
}

const postsChanged = normalizeCollection(
  "Writing",
  path.join(root, "content", "posts"),
);
const videosChanged = normalizeCollection(
  "Watch",
  path.join(root, "content", "videos"),
);

const total = postsChanged + videosChanged;
console.log(
  total
    ? `Normalized featured flags (${total} file(s) updated)`
    : "Featured flags already exclusive",
);
process.exitCode = 0;
