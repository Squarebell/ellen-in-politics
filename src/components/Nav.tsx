"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { usePathname } from "next/navigation";

const links = [
  { href: "/#work", label: "Writing" },
  { href: "/watch", label: "Watch" },
  { href: "/#story", label: "Focus" },
  { href: "/#about", label: "About" },
  { href: "/#connect", label: "Contact" },
];

export function Nav() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (value) => {
    setScrolled(value > 40);
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const onLight = !onHome || scrolled || open;

  return (
    <motion.header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        onLight
          ? "border-b border-rule bg-surface/85 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4 md:px-10">
        <Link
          href="/"
          className={`font-display text-[1.35rem] font-medium tracking-[-0.02em] transition-colors md:text-[1.5rem] ${
            onLight ? "text-ink" : "text-white"
          }`}
          onClick={() => setOpen(false)}
        >
          Ellen Carty
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active =
              link.href === "/watch" ? pathname === "/watch" : false;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`px-3.5 py-1.5 text-[12px] font-medium tracking-[0.06em] uppercase transition-colors ${
                    onLight
                      ? active
                        ? "text-ink"
                        : "text-ink-soft hover:text-ink"
                      : "text-white/70 hover:text-white"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className={`text-[12px] font-medium tracking-[0.08em] uppercase md:hidden ${
            onLight ? "text-ink" : "text-white"
          }`}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </nav>

      {open && (
        <div className="border-t border-rule bg-surface px-6 py-10 md:hidden">
          <ul className="space-y-6">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-display text-[2.5rem] font-medium tracking-[-0.02em] text-ink"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.header>
  );
}
