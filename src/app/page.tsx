import { About } from "@/components/About";
import { Connect } from "@/components/Connect";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { PostsTeaser } from "@/components/PostsTeaser";
import { ScrollProgress } from "@/components/ScrollProgress";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Story } from "@/components/Story";
import { WatchTeaser } from "@/components/WatchTeaser";
import { getAllPosts } from "@/lib/posts";
import { getAllVideos } from "@/lib/videos";

export const dynamic = "force-static";

export default function Home() {
  const posts = getAllPosts();
  const videos = getAllVideos();

  return (
    <SmoothScroll>
      <ScrollProgress />
      <Nav />
      <main className="flex-1">
        <Hero />
        <PostsTeaser posts={posts} />
        <WatchTeaser videos={videos} />
        <Story />
        <About />
        <Connect />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
