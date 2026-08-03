"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useHasMounted } from "@/hooks/useHasMounted";

gsap.registerPlugin(ScrollTrigger);

export function ScrollProgress() {
  const hasMounted = useHasMounted();

  useEffect(() => {
    if (!hasMounted) return;

    const bar = document.querySelector<HTMLElement>("[data-scroll-progress]");
    if (!bar) return;

    const tween = gsap.fromTo(
      bar,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          start: "top top",
          end: "max",
          scrub: 0.3,
        },
      },
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [hasMounted]);

  if (!hasMounted) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]"
    >
      <div
        data-scroll-progress
        className="h-full w-full origin-left scale-x-0 bg-white mix-blend-difference"
      />
    </div>
  );
}
