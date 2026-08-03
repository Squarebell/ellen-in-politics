import Image from "next/image";
import { socials } from "@/lib/socials";
import { Reveal } from "./Reveal";

/** Local About portrait — committed under public/ellen/ */
const PORTRAIT_SRC = "/ellen/about-portrait.jpg";

export function About() {
  return (
    <section id="about" className="bg-surface-elevated py-24 md:py-36">
      <div className="mx-auto grid max-w-[1180px] items-start gap-12 px-6 md:grid-cols-[0.95fr_1.05fr] md:gap-16 md:px-10 lg:gap-24">
        <Reveal>
          <div className="media-frame relative aspect-[4/5] bg-marble-deep">
            <Image
              src={PORTRAIT_SRC}
              alt="Ellen Carty"
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 45vw"
              priority
            />
          </div>
        </Reveal>

        <Reveal delay={0.08} className="md:pt-6">
          <p className="eyebrow">About</p>
          <h2 className="font-display mt-4 text-[clamp(2.4rem,4.5vw,3.5rem)] font-medium leading-[1.08] tracking-[-0.025em] text-ink">
            Ellen Carty
          </h2>
          <p className="mt-2 text-[15px] font-medium tracking-[0.04em] text-denim">
            Based out of Philadelphia and Washington D.C.
          </p>

          <div className="mt-8 space-y-5 text-[16px] leading-relaxed text-muted md:text-[17px]">
            <p>
              Ellen is an undergraduate politics student and political content
              creator committed to making politics more accessible, engaging,
              and understandable. Her work explores current events and public
              policy through a moderate Democratic lens, with a focus on
              political moderation, gender equality, and the issues shaping the
              future of American democracy.
            </p>
            <p>
              She believes informed civic engagement, respectful dialogue, and
              evidence-based discussion are essential to strengthening
              democratic institutions and finding common ground. Follow along
              at{" "}
              <a
                href={socials.instagram.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ink underline decoration-rule underline-offset-4 transition hover:text-denim hover:decoration-denim"
              >
                @elleninpolitics
              </a>
              .
            </p>
          </div>

          <hr className="rule mt-10" />

          <dl className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="eyebrow">Based</dt>
              <dd className="mt-2 text-[15px] text-ink">
                Philadelphia &amp; Washington D.C.
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Focused on</dt>
              <dd className="mt-2 text-[15px] text-ink">
                Political moderation, gender equality, American democracy
              </dd>
            </div>
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
