"use client";

import { useState, type FormEvent } from "react";
import { socials } from "@/lib/socials";
import { Reveal } from "./Reveal";

export function Connect() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_CONTACT_API ||
          "https://ellen-contact.squarebell.workers.dev",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, message }),
        },
      );
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Could not send message.");
      }

      setStatus("sent");
      form.reset();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not send message. Please try again.",
      );
    }
  }

  return (
    <section id="connect" className="bg-surface py-24 md:py-36">
      <div className="mx-auto grid max-w-[1180px] gap-14 px-6 md:grid-cols-2 md:gap-20 md:px-10">
        <Reveal>
          <p className="eyebrow">Contact</p>
          <h2 className="font-display mt-4 text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[1.05] tracking-[-0.025em] text-ink">
            Let’s talk.
          </h2>
          <p className="mt-5 max-w-sm text-[16px] leading-relaxed text-muted md:text-[17px]">
            For collaboration, conversation, mentorship, or a thoughtful
            disagreement — reach out.
          </p>

          <ul className="mt-10 space-y-0">
            {[socials.instagram, socials.linkedin, socials.email].map((item) => (
              <li key={item.href} className="border-t border-rule">
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-baseline justify-between py-4 transition"
                >
                  <span className="text-[13px] font-medium tracking-[0.08em] text-ink uppercase">
                    {item.label}
                  </span>
                  <span className="text-[14px] text-muted transition group-hover:text-denim">
                    {item.handle}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.08}>
          <form onSubmit={handleSubmit} className="space-y-6 md:pt-10">
            <div>
              <label htmlFor="name" className="eyebrow mb-3 block">
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                disabled={status === "sending"}
                className="w-full border-b border-rule bg-transparent py-3 text-[16px] text-ink outline-none transition placeholder:text-muted/50 focus:border-ink disabled:opacity-60"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="eyebrow mb-3 block">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={status === "sending"}
                className="w-full border-b border-rule bg-transparent py-3 text-[16px] text-ink outline-none transition placeholder:text-muted/50 focus:border-ink disabled:opacity-60"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <label htmlFor="message" className="eyebrow mb-3 block">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={4}
                disabled={status === "sending"}
                className="w-full resize-y border-b border-rule bg-transparent py-3 text-[16px] text-ink outline-none transition placeholder:text-muted/50 focus:border-ink disabled:opacity-60"
                placeholder="What should we talk about?"
              />
            </div>
            <div className="pt-4">
              <button
                type="submit"
                disabled={status === "sending"}
                className="btn-apple bg-ink text-white hover:opacity-90 disabled:opacity-60"
              >
                {status === "sending" ? "Sending…" : "Send message"}
              </button>
              {status === "sent" && (
                <p className="mt-4 text-[13px] text-muted">
                  Message sent — thanks for reaching out.
                </p>
              )}
              {status === "error" && (
                <p className="mt-4 text-[13px] text-flag">{errorMessage}</p>
              )}
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
