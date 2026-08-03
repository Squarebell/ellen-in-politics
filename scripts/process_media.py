#!/usr/bin/env python3
"""
Convert iPhone HEIC/HEIF images in posts to browser-friendly JPEG.

Scans content/posts/*.md for cover images and inline markdown images that
reference .heic/.heif files (including misplaced CMS uploads under
content/posts/public/). Converts to .jpg under public/uploads/ and updates
the markdown references.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / "content" / "posts"
PUBLIC_DIR = ROOT / "public"
MISPLACED_POSTS_DIR = POSTS_DIR / "public"

HEIC_EXTENSIONS = {".heic", ".heif"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", *HEIC_EXTENSIONS}


def run_ffmpeg(args: list[str]) -> None:
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def public_path_to_abs(public_path: str) -> Path:
    return PUBLIC_DIR / public_path.lstrip("/")


def basename_from_path(path_str: str) -> str:
    return Path(path_str.split("?")[0]).name


def is_heic(path: Path) -> bool:
    return path.suffix.lower() in HEIC_EXTENSIONS


def resolve_image_file(image_ref: str) -> Path | None:
    candidates = [
        public_path_to_abs(image_ref),
        MISPLACED_POSTS_DIR / "uploads" / basename_from_path(image_ref),
        PUBLIC_DIR / "uploads" / basename_from_path(image_ref),
    ]
    covers = PUBLIC_DIR / "uploads" / "covers"
    posts = PUBLIC_DIR / "uploads" / "posts"
    candidates.extend(
        [
            covers / basename_from_path(image_ref),
            posts / basename_from_path(image_ref),
        ]
    )

    seen: set[Path] = set()
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        if candidate.is_file():
            return candidate
    return None


def heic_to_jpg_public_path(src: Path) -> str:
    """Return /uploads/.../*.jpg path next to the source file."""
    rel = src.relative_to(PUBLIC_DIR)
    dest = PUBLIC_DIR / rel.with_suffix(".jpg")
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists() or src.stat().st_mtime > dest.stat().st_mtime:
        run_ffmpeg(["-i", str(src), str(dest)])
    return "/" + dest.relative_to(PUBLIC_DIR).as_posix()


def replace_path_in_text(text: str, old: str, new: str) -> str:
    if old == new or old not in text:
        return text
    return text.replace(old, new)


def collect_image_refs(text: str) -> set[str]:
    refs: set[str] = set()

    image_fm = re.search(r"^image:\s*(.+?)\s*$", text, re.MULTILINE)
    if image_fm:
        refs.add(image_fm.group(1).strip().strip("\"'"))

    for match in re.finditer(r"!\[[^\]]*\]\(([^)]+)\)", text):
        refs.add(match.group(1).strip())

    return {ref for ref in refs if ref and not ref.startswith("http")}


def cleanup_misplaced_uploads() -> None:
    if not MISPLACED_POSTS_DIR.exists():
        return
    for path in sorted(MISPLACED_POSTS_DIR.rglob("*"), reverse=True):
        if path.is_file() and is_heic(path):
            path.unlink(missing_ok=True)
        elif path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
            continue
        elif path.is_file():
            path.unlink(missing_ok=True)
        elif path.is_dir():
            try:
                path.rmdir()
            except OSError:
                pass
    if MISPLACED_POSTS_DIR.exists() and not any(MISPLACED_POSTS_DIR.iterdir()):
        MISPLACED_POSTS_DIR.rmdir()


def process_post_md(md_file: Path) -> bool:
    text = md_file.read_text(encoding="utf-8")
    original = text

    for ref in collect_image_refs(text):
        src = resolve_image_file(ref)
        if not src or not is_heic(src):
            continue
        new_ref = heic_to_jpg_public_path(src)
        text = replace_path_in_text(text, ref, new_ref)
        if src.resolve().is_relative_to(MISPLACED_POSTS_DIR.resolve()):
            src.unlink(missing_ok=True)

    if text != original:
        md_file.write_text(text, encoding="utf-8")
        print(f"updated {md_file.name}")
        return True

    print(f"ok {md_file.name}")
    return False


def main() -> int:
    if not POSTS_DIR.is_dir():
        print("No content/posts directory found.")
        return 0

    changed = False
    for md_file in sorted(POSTS_DIR.glob("*.md")):
        if process_post_md(md_file):
            changed = True

    cleanup_misplaced_uploads()

    if not changed:
        print("All post images already processed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
