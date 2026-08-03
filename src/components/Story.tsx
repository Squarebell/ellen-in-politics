"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const beats = [
  {
    title: "Civic Engagement",
    body: "Democracy works best when citizens are informed, engaged, and active participants in civic life.",
    image:
      "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1800&q=80",
    alt: "US Capitol dome",
  },
  {
    title: "Political Moderation",
    body: "Practical solutions often come from the center. In a time of deep political polarization, Ellen advocates for evidence-based policymaking and thoughtful compromise.",
    image:
      "https://images.unsplash.com/photo-1555848962-6e79363ec58f?auto=format&fit=crop&w=1800&q=80",
    alt: "Steps of a government building",
  },
  {
    title: "Gender Equality",
    body: "Feminist forward. Ellen is committed to advocating for women's equality and educating others about the ways patriarchal systems continue to shape our society and everyday lives.",
    image:
      "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1800&q=80",
    alt: "American flag detail",
  },
  {
    title: "Patriotism",
    body: "Patriotism means loving your country enough to help it improve. Ellen believes in America's promise and its potential, while recognizing that acknowledging our shortcomings is essential to building a stronger and more just nation. Love of country includes celebrating its achievements, learning from its history, and working toward a more perfect union.",
    image:
      "https://images.unsplash.com/photo-1555881403-64995e62269b?auto=format&fit=crop&w=1800&q=80",
    alt: "Washington Monument at dusk",
  },
];

export function Story() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    const ctx = gsap.context(() => {
      const images = gsap.utils.toArray<HTMLElement>("[data-story-image]");
      const titles = gsap.utils.toArray<HTMLElement>("[data-story-title]");
      const bodies = gsap.utils.toArray<HTMLElement>("[data-story-body]");
      const progress = root.querySelector<HTMLElement>("[data-story-progress]");

      gsap.set(images, { autoAlpha: 0, scale: 1.06 });
      gsap.set(images[0], { autoAlpha: 1, scale: 1 });
      gsap.set(titles, { autoAlpha: 0, y: 40 });
      gsap.set(bodies, { autoAlpha: 0, y: 28 });
      gsap.set([titles[0], bodies[0]], { autoAlpha: 1, y: 0 });
      if (progress) gsap.set(progress, { scaleX: 0, transformOrigin: "left center" });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
          pin: stage,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      for (let index = 1; index < beats.length; index += 1) {
        const prev = index - 1;
        const at = index;

        tl.to(progress, { scaleX: index / (beats.length - 1), duration: 1 }, at - 0.45)
          .to(images[prev], { autoAlpha: 0, scale: 1.03, duration: 1 }, at)
          .to(images[index], { autoAlpha: 1, scale: 1, duration: 1 }, at)
          .to(titles[prev], { autoAlpha: 0, y: -28, duration: 0.45 }, at)
          .to(bodies[prev], { autoAlpha: 0, y: -18, duration: 0.45 }, at)
          .fromTo(
            titles[index],
            { autoAlpha: 0, y: 40 },
            { autoAlpha: 1, y: 0, duration: 0.55 },
            at + 0.2,
          )
          .fromTo(
            bodies[index],
            { autoAlpha: 0, y: 28 },
            { autoAlpha: 1, y: 0, duration: 0.55 },
            at + 0.28,
          );
      }

      ScrollTrigger.refresh();
    }, root);

    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    const t1 = window.setTimeout(() => ScrollTrigger.refresh(), 100);
    const t2 = window.setTimeout(() => ScrollTrigger.refresh(), 600);

    return () => {
      window.removeEventListener("load", onLoad);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="story"
      ref={rootRef}
      className="relative bg-surface-dark"
      style={{ height: `${beats.length * 100}vh` }}
    >
      <div
        ref={stageRef}
        data-story-stage
        className="relative flex h-[100svh] w-full items-end overflow-hidden md:items-center"
      >
        <div className="absolute inset-0">
          {beats.map((beat, index) => (
            <div
              key={beat.title}
              data-story-image
              className="absolute inset-0 will-change-transform"
            >
              <Image
                src={beat.image}
                alt={beat.alt}
                fill
                className="object-cover"
                sizes="100vw"
                priority={index === 0}
                onLoadingComplete={() => ScrollTrigger.refresh()}
              />
              <div className="absolute inset-0 bg-black/50" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/25" />
            </div>
          ))}
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-col px-6 pb-16 pt-28 md:px-10 md:pb-24">
          <p className="mb-5 text-[11px] font-medium tracking-[0.22em] text-white/50 uppercase">
            Focus · Scroll
          </p>

          <div className="relative min-h-[14rem] md:min-h-[18rem]">
            {beats.map((beat) => (
              <div key={beat.title} className="absolute inset-x-0 top-0">
                <h2
                  data-story-title
                  className="font-display max-w-[18ch] text-[clamp(2.6rem,7vw,4.75rem)] font-medium leading-[0.95] tracking-[-0.03em] text-white"
                >
                  {beat.title}
                </h2>
                <p
                  data-story-body
                  className="mt-5 max-w-xl text-[16px] leading-relaxed text-white/70 md:text-[18px]"
                >
                  {beat.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 h-[2px] w-full max-w-xs overflow-hidden bg-white/15">
            <div
              data-story-progress
              className="h-full w-full origin-left scale-x-0 bg-white"
            />
          </div>

          <p className="mt-4 text-[12px] tracking-[0.08em] text-white/40 uppercase">
            Keep scrolling
          </p>
        </div>
      </div>
    </section>
  );
}
