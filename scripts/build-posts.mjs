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

const posts = fs
  .readdirSync(postsDir)
  .filter((file) => file.endsWith(".md"))
  .map((filename) => {
    const slug = filename.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(postsDir, filename), "utf8");
    const { data, content } = matter(raw);
    return {
      slug,
      title: String(data.title ?? slug),
      excerpt: String(data.excerpt ?? ""),
      date: String(data.date ?? ""),
      topic: String(data.topic ?? "Civic"),
      image: String(data.image ?? fallbackImage),
      imageAlt: String(data.imageAlt ?? data.title ?? "Post image"),
      content: content.trim(),
    };
  })
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(posts, null, 2) + "\n");
console.log(`Wrote ${posts.length} posts → src/data/posts.json`);
