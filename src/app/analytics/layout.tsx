import type { Metadata } from "next";
import "./analytics.css";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

export default function AdminAnalyticsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="analytics-root">{children}</div>;
}
