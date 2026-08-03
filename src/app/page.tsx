import { About } from "@/components/About";
import { Connect } from "@/components/Connect";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { PostsTeaser } from "@/components/PostsTeaser";
import { ScrollProgress } from "@/components/ScrollProgress";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Story } from "@/components/Story";
import { getAllPosts } from "@/lib/posts";

export default function Home() {
  const posts = getAllPosts();

  return (
    <SmoothScroll>
      <ScrollProgress />
      <Nav />
      <main className="flex-1">
        <Hero />
        <PostsTeaser posts={posts} />
        <Story />
        <About />
        <Connect />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
