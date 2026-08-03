import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-surface px-6 text-center">
      <p className="text-[4rem] font-semibold tracking-[-0.04em] text-ink">
        404
      </p>
      <p className="mt-2 text-[17px] text-muted">That post isn’t here.</p>
      <Link
        href="/"
        className="mt-8 text-[15px] font-medium text-link transition hover:opacity-80"
      >
        Back home →
      </Link>
    </main>
  );
}
