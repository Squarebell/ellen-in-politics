import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ellen in Politics",
    template: "%s · Ellen in Politics",
  },
  description:
    "Advocate. Student. Creator. American. Politics, civic life, and public voice — based out of Philadelphia and Washington D.C.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Ellen in Politics",
    description:
      "Advocate. Student. Creator. American. Politics, civic life, and public voice — based out of Philadelphia and Washington D.C.",
    type: "website",
    url: "/",
    siteName: "Ellen in Politics",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ellen in Politics",
    description:
      "Advocate. Student. Creator. American. Politics, civic life, and public voice — based out of Philadelphia and Washington D.C.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
