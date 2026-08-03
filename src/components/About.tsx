import fs from "fs";
import path from "path";
import Image from "next/image";
import { socials } from "@/lib/socials";
import { Reveal } from "./Reveal";

const ellenDir = path.join(process.cwd(), "public", "ellen");

function ellenAsset(filename: string) {
  return fs.existsSync(path.join(ellenDir, filename))
    ? `/ellen/${filename}`
    : null;
}

export function About() {
  const linkedInPortrait =
    ellenAsset("linkedin-portrait.jpg") ??
    ellenAsset("linkedin-portrait.png") ??
    ellenAsset("linkedin-portrait.webp");
  const lifestyle =
    ellenAsset("about-city.jpg") ??
    ellenAsset("about-lifestyle.jpg") ??
    ellenAsset("portrait-personal.jpg");

  return (
    <section id="about" className="bg-surface-elevated py-24 md:py-36">
      <div className="mx-auto grid max-w-[1180px] items-start gap-12 px-6 md:grid-cols-[0.95fr_1.05fr] md:gap-16 md:px-10 lg:gap-24">
        <Reveal>
          <div className="media-frame relative aspect-[4/5] bg-marble-deep">
            {linkedInPortrait ? (
              <Image
                src={linkedInPortrait}
                alt="Ellen Carty — professional portrait"
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 45vw"
                priority
              />
            ) : lifestyle ? (
              <Image
                src={lifestyle}
                alt="Ellen Carty"
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 45vw"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-marble-deep to-surface px-8 text-center">
                <p className="font-display text-2xl font-medium text-ink">
                  Portrait
                </p>
                <p className="max-w-xs text-[14px] leading-relaxed text-muted">
                  Add{" "}
                  <span className="font-medium text-ink">
                    public/ellen/linkedin-portrait.jpg
                  </span>
                </p>
              </div>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.08} className="md:pt-6">
          <p className="eyebrow">About</p>
          <h2 className="font-display mt-4 text-[clamp(2.4rem,4.5vw,3.5rem)] font-medium leading-[1.08] tracking-[-0.025em] text-ink">
            Ellen Carty
          </h2>
          <p className="mt-2 text-[15px] font-medium tracking-[0.04em] text-denim">
            Politics · Philly // D.C.
          </p>

          <div className="mt-8 space-y-5 text-[16px] leading-relaxed text-muted md:text-[17px]">
            <p>
              Ellen runs{" "}
              <a
                href={socials.instagram.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ink underline decoration-rule underline-offset-4 transition hover:text-denim hover:decoration-denim"
              >
                @elleninpolitics
              </a>{" "}
              as a personal practice — writing to spread awareness, grow
              connections, and learn out loud.
            </p>
            <p>
              This site is the long-form home for that work: civic essays,
              commentary, and a clear place to reach out. Think of it as a
              journalism portfolio for someone building a public voice — not a
              campaign HQ.
            </p>
          </div>

          <hr className="rule mt-10" />

          <dl className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="eyebrow">Based</dt>
              <dd className="mt-2 text-[15px] text-ink">Washington, D.C.</dd>
            </div>
            <div>
              <dt className="eyebrow">Writing on</dt>
              <dd className="mt-2 text-[15px] text-ink">
                Civic life, equality, feminism
              </dd>
            </div>
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
