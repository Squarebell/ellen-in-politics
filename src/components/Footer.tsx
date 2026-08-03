import Link from "next/link";
import { socials } from "@/lib/socials";

export function Footer() {
  return (
    <footer className="bg-surface-navy text-white">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-10 px-6 py-14 md:flex-row md:items-end md:justify-between md:px-10">
        <div>
          <Link
            href="/"
            className="font-display text-[2rem] font-medium tracking-[-0.02em]"
          >
            Ellen Carty
          </Link>
          <p className="font-display mt-2 text-[1.1rem] italic text-white/55">
            That&rsquo;s all she wrote.
          </p>
        </div>
        <div className="flex flex-wrap gap-8 text-[12px] font-medium tracking-[0.1em] uppercase">
          <Link href="/watch" className="text-white/50 transition hover:text-white">
            Watch
          </Link>
          {[socials.instagram, socials.linkedin].map(
            (item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/50 transition hover:text-white"
              >
                {item.label}
              </a>
            ),
          )}
        </div>
      </div>
    </footer>
  );
}
