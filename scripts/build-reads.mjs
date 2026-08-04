import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const readsDir = path.join(root, "content", "reads");
const outFile = path.join(root, "src", "data", "reads.json");

function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : text;
}

function resolvePublicPath(filePath) {
  if (!filePath) return undefined;
  if (/^https?:\/\//i.test(filePath)) return filePath;
  return filePath.startsWith("/") ? filePath : `/${filePath}`;
}

if (!fs.existsSync(readsDir)) {
  fs.mkdirSync(readsDir, { recursive: true });
}

const reads = fs
  .readdirSync(readsDir)
  .filter((file) => file.endsWith(".md"))
  .map((filename) => {
    const slug = filename.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(readsDir, filename), "utf8");
    const { data } = matter(raw);
    const image = resolvePublicPath(data.image);

    return {
      slug,
      title: String(data.title ?? slug),
      author: String(data.author ?? ""),
      date: formatDate(data.date),
      note: String(data.note ?? ""),
      topic: data.topic ? String(data.topic) : "",
      image: image ?? "",
      imageAlt: String(data.imageAlt ?? data.title ?? "Book cover"),
      link: data.link ? String(data.link) : "",
    };
  })
  .filter((item) => item.title && item.author)
  .sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(reads, null, 2) + "\n");
console.log(`Wrote ${reads.length} reads → src/data/reads.json`);
