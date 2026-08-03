"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const media = mediaRef.current;
    const content = contentRef.current;
    if (!section || !media || !content) return;

    const ctx = gsap.context(() => {
      const lines = content.querySelectorAll<HTMLElement>("[data-hero-line]");

      gsap.set(lines, { y: 32, autoAlpha: 0 });
      gsap.to(lines, {
        y: 0,
        autoAlpha: 1,
        duration: 1,
        stagger: 0.09,
        ease: "power3.out",
        delay: 0.12,
      });

      gsap.to(media, {
        yPercent: 22,
        scale: 1.1,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });

      gsap.to(content, {
        autoAlpha: 0.15,
        y: -56,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });
    }, section);

    const t = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    return () => {
      window.clearTimeout(t);
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100svh] items-end overflow-hidden bg-surface-dark md:items-center"
    >
      <div ref={mediaRef} className="absolute inset-0 will-change-transform">
        <Image
          src="/ellen/hero-capitol.jpg"
          alt="The United States Capitol on a clear day"
          fill
          priority
          className="object-cover object-[center_45%]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
      </div>

      <div
        ref={contentRef}
        className="relative z-10 mx-auto w-full max-w-[1180px] px-6 pb-16 pt-28 will-change-transform md:px-10 md:pb-24 md:pt-32"
      >
        <p
          data-hero-line
          className="mb-6 text-[11px] font-medium tracking-[0.22em] text-white/55 uppercase"
        >
          Advocate. Student. Creator.
        </p>

        <h1
          data-hero-line
          className="font-display max-w-[11ch] text-[clamp(4.25rem,13vw,8.5rem)] font-medium leading-[0.88] tracking-[-0.03em] text-white"
        >
          Ellen
          <span className="mt-1 block font-normal italic text-white/90">
            In Politics
          </span>
        </h1>

        <p
          data-hero-line
          className="mt-8 max-w-2xl text-[17px] leading-relaxed tracking-[0.02em] text-white/80 md:text-[20px]"
        >
          Exploring politics, policy, and civic engagement through the eyes of
          the next generation.
        </p>

        <div data-hero-line className="mt-10 flex flex-wrap items-center gap-3">
          <a href="#about" className="btn-apple btn-apple-on-dark">
            About Ellen
          </a>
          <a href="#values" className="btn-apple btn-apple-ghost-on-dark">
            Values
          </a>
        </div>
      </div>
    </section>
  );
}
