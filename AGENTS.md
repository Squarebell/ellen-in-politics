<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

This is a Next.js 16 (App Router, React 19, Tailwind 4) editorial site deployed to Cloudflare via OpenNext. Uses **npm** (Node 22, matching `.github/workflows/deploy.yml`). Dependencies are installed automatically by the startup update script (`npm ci`), so you normally don't need to install anything.

Scripts live in `package.json`; run them with `npm run <script>`. Key ones: `dev`, `build`, `lint`, `preview`/`deploy` (Cloudflare).

Non-obvious notes:
- **Content is compiled, not read live.** The app renders from `src/data/posts.json` and `src/data/videos.json`, which are *generated* from the markdown in `content/posts` and `content/videos` by `npm run build:content` (`scripts/build-*.mjs`). `predev` runs `build:content` before `next dev`, but the dev server does not re-run it when you only edit a markdown file — after editing `content/**`, re-run `npm run build:content` (or restart `npm run dev`) to see changes. Those generated JSON files are committed; avoid committing incidental churn to them.
- **`predev` vs `prebuild`.** `predev` runs only `build:content`; `prebuild` also runs `check:media` (`scripts/check-media.mjs`), which exits non-zero if any local media path referenced in `content/**` is missing. So a missing asset breaks `npm run build`/CI but not `npm run dev`.
- **Lint has 2 pre-existing errors** in the vendored Decap CMS bundle `public/admin/cms.js` (`no-this-alias`). These are not from your changes; `npm run lint` otherwise passes.
- **Optional services.** The Decap CMS at `/admin` and the two Cloudflare Workers (`workers/contact`, `workers/decap-oauth`) are not needed for local dev — the public site runs fully without them. The contact form defaults to the deployed prod Worker URL (`NEXT_PUBLIC_CONTACT_API`); no env vars/secrets are required to run `npm run dev`.
- **`preview`/`deploy`** use `opennextjs-cloudflare` and require Cloudflare credentials; they target production and are not part of the local dev loop.
- The Python scripts in `scripts/*.py` are an offline media/transcription pipeline and are not invoked by dev or build.
