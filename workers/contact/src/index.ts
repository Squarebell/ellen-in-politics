import { EmailMessage } from "cloudflare:email";

export interface Env {
  CONTACT_EMAIL: SendEmail;
  CONTACT_TO_EMAIL: string;
  ALLOWED_ORIGINS: string;
}

type ContactBody = {
  name?: string;
  email?: string;
  message?: string;
};

function corsHeaders(origin: string | null, allowed: string[]) {
  const ok = origin && allowed.includes(origin) ? origin : allowed[0] || "*";
  return {
    "Access-Control-Allow-Origin": ok,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildRawEmail(options: {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  name: string;
  email: string;
  message: string;
}) {
  const safeSubject = options.subject.replace(/[\r\n]+/g, " ").slice(0, 120);
  const boundary = `ellen_${crypto.randomUUID().replaceAll("-", "")}`;
  const messageId = `<${crypto.randomUUID()}@elleninpolitics.com>`;
  const date = new Date().toUTCString();

  const text = [
    "You received a new message from the elleninpolitics.com contact form.",
    "",
    "From:",
    options.name,
    options.email,
    "",
    "Message:",
    options.message,
    "",
    "—",
    "Ellen in Politics",
    "https://elleninpolitics.com",
  ].join("\n");

  const html = [
    "<!doctype html><html><body style=\"font-family:Georgia,serif;line-height:1.5;color:#111;\">",
    "<p>You received a new message from the <a href=\"https://elleninpolitics.com\">elleninpolitics.com</a> contact form.</p>",
    `<p><strong>From:</strong><br>${escapeHtml(options.name)}<br>${escapeHtml(options.email)}</p>`,
    `<p><strong>Message:</strong><br>${escapeHtml(options.message).replaceAll("\n", "<br>")}</p>`,
    "<p style=\"color:#555;\">— Ellen in Politics<br>https://elleninpolitics.com</p>",
    "</body></html>",
  ].join("");

  return [
    `From: Ellen Carty <${options.from}>`,
    `To: <${options.to}>`,
    `Reply-To: ${options.name} <${options.replyTo}>`,
    `Subject: ${safeSubject}`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    "Auto-Submitted: auto-generated",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowed = env.ALLOWED_ORIGINS.split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const origin = request.headers.get("Origin");
    const headers = {
      ...corsHeaders(origin, allowed),
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed" }),
        { status: 405, headers },
      );
    }

    if (origin && !allowed.includes(origin)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Origin not allowed" }),
        { status: 403, headers },
      );
    }

    try {
      const body = (await request.json()) as ContactBody;
      const name = String(body.name ?? "").trim();
      const email = String(body.email ?? "").trim();
      const message = String(body.message ?? "").trim();

      if (!name || !email || !message) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Name, email, and message are required.",
          }),
          { status: 400, headers },
        );
      }

      if (!isValidEmail(email)) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Please enter a valid email address.",
          }),
          { status: 400, headers },
        );
      }

      if (message.length > 5000) {
        return new Response(
          JSON.stringify({ ok: false, error: "Message is too long." }),
          { status: 400, headers },
        );
      }

      const to = env.CONTACT_TO_EMAIL;
      const from = "hello@elleninpolitics.com";
      const raw = buildRawEmail({
        from,
        to,
        replyTo: email,
        subject: `New message from ${name}`,
        name,
        email,
        message,
      });

      await env.CONTACT_EMAIL.send(new EmailMessage(from, to, raw));

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers,
      });
    } catch (error) {
      console.error(error);
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not send message. Please try again.",
        }),
        { status: 500, headers },
      );
    }
  },
};
