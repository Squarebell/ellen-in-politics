import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { WatchExperience } from "@/components/WatchExperience";
import { getAllVideos, getFeaturedVideo } from "@/lib/videos";

export const dynamic = "force-static";

const videos = getAllVideos();
const featured = getFeaturedVideo(videos);

export const metadata: Metadata = {
  title: "Watch",
  description:
    featured?.description ??
    "Watch commentary and civic clips from Ellen Carty.",
};

export default function WatchPage() {
  return (
    <>
      <Nav />
      <main className="flex-1 bg-surface pt-20">
        <div className="mx-auto max-w-[1180px] px-6 py-14 md:px-10 md:py-20">
          <WatchExperience videos={videos} />
        </div>
      </main>

      <Footer />
    </>
  );
}
