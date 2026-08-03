#!/usr/bin/env python3
"""
Prepare uploaded videos for the web after Ellen publishes from her iPhone.

Handles the common CMS upload issues automatically:
  - Relocates videos saved under content/videos/public/ (Decap path bug)
  - Accepts iPhone .mov / .m4v and remuxes to web-friendly .mp4
  - Converts iPhone .heic / .heif poster images to .jpg
  - Generates a poster frame from the video when none is set
  - Fills in durationLabel from the file metadata

Only touches *new* uploads under /uploads/videos/ — existing reels at
/videos/ellen/ are left alone.

Run locally:  python3 scripts/process_videos.py
Runs in CI before transcription (see .github/workflows/transcribe.yml).

Requires ffmpeg + ffprobe on PATH.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIDEOS_DIR = ROOT / "content" / "videos"
PUBLIC_DIR = ROOT / "public"
VIDEOS_UPLOAD_DIR = PUBLIC_DIR / "uploads" / "videos"
POSTERS_UPLOAD_DIR = PUBLIC_DIR / "uploads" / "posters"
MISPLACED_ROOT = VIDEOS_DIR / "public"


def read_frontmatter_value(text: str, key: str) -> str | None:
    match = re.search(rf"^{key}:\s*(.+?)\s*$", text, re.MULTILINE)
    if not match:
        return None
    value = match.group(1).strip().strip("\"'")
    return value or None


def set_frontmatter_value(text: str, key: str, value: str) -> str:
    if re.search(rf"^{key}:", text, re.MULTILINE):
        return re.sub(
            rf"^{key}:.*$",
            f"{key}: {value}",
            text,
            count=1,
            flags=re.MULTILINE,
        )
    if key in {"poster", "durationLabel", "captions"} and re.search(
        r"^video:", text, re.MULTILINE
    ):
        return re.sub(
            r"^(video:.*)$",
            rf"\1\n{key}: {value}",
            text,
            count=1,
            flags=re.MULTILINE,
        )
    return text


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def probe_duration_seconds(path: Path) -> float | None:
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(path),
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        return float(result.stdout.strip())
    except (subprocess.CalledProcessError, ValueError):
        return None


def format_duration_label(seconds: float) -> str:
    total = max(0, int(round(seconds)))
    minutes, secs = divmod(total, 60)
    return f"{minutes}:{secs:02d}"


def normalize_duration_label(raw: str | None) -> str | None:
    if not raw:
        return None
    cleaned = re.sub(r"\s+", "", raw.strip().strip("\"'"))
    match = re.match(r"^(\d+):(\d{1,2})$", cleaned)
    if not match:
        return None
    return f"{int(match.group(1))}:{int(match.group(2)):02d}"


def is_misplaced(path: Path) -> bool:
    try:
        path.relative_to(MISPLACED_ROOT)
        return True
    except ValueError:
        return False


def resolve_public_file(public_path: str | None) -> Path | None:
    """Find a public-facing media file, including CMS misplacement."""
    if not public_path or public_path.startswith("http"):
        return None

    rel = public_path.lstrip("/")
    candidates = [
        PUBLIC_DIR / rel,
        MISPLACED_ROOT / rel,
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def is_new_upload(video: str | None) -> bool:
    """True for CMS uploads — not legacy reels under /videos/ellen/."""
    return bool(video and video.startswith("/uploads/"))


def needs_video_processing(slug: str, video: str, source: Path) -> bool:
    if not is_new_upload(video):
        return False
    if is_misplaced(source):
        return True
    if source.suffix.lower() in {".mov", ".m4v"}:
        return True
    target = VIDEOS_UPLOAD_DIR / f"{slug}.mp4"
    if source != target:
        return True
    return False


def remux_to_mp4(source: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source),
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            str(dest),
        ]
    )


def generate_poster(video_path: Path, poster_path: Path) -> None:
    poster_path.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-ss",
            "1",
            "-i",
            str(video_path),
            "-frames:v",
            "1",
            "-q:v",
            "2",
            str(poster_path),
        ]
    )


def convert_image_to_jpg(source: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source),
            "-q:v",
            "2",
            str(dest),
        ]
    )


def process_poster(slug: str, text: str, video_path: Path) -> tuple[str, bool]:
    if not is_new_upload(read_frontmatter_value(text, "video")):
        return text, False

    changed = False
    poster = read_frontmatter_value(text, "poster")
    poster_rel = f"/uploads/posters/{slug}.jpg"
    poster_path = POSTERS_UPLOAD_DIR / f"{slug}.jpg"

    if poster:
        poster_source = resolve_public_file(poster)
        if poster_source:
            ext = poster_source.suffix.lower()
            if ext in {".heic", ".heif"}:
                convert_image_to_jpg(poster_source, poster_path)
                text = set_frontmatter_value(text, "poster", poster_rel)
                print(f"   poster: converted {poster_source.name} -> {poster_rel}")
                return text, True
            if poster_source.resolve() == poster_path.resolve():
                if poster != poster_rel:
                    text = set_frontmatter_value(text, "poster", poster_rel)
                    changed = True
                return text, changed

    if poster_path.exists():
        if poster != poster_rel:
            text = set_frontmatter_value(text, "poster", poster_rel)
            changed = True
        return text, changed

    generate_poster(video_path, poster_path)
    text = set_frontmatter_value(text, "poster", poster_rel)
    print(f"   poster: generated {poster_rel}")
    return text, True


def process_video_entry(md_file: Path) -> bool:
    slug = md_file.stem
    text = md_file.read_text(encoding="utf-8")
    original = text
    video = read_frontmatter_value(text, "video")
    if not video or video.startswith("http"):
        return False

    if not is_new_upload(video):
        return False

    source = resolve_public_file(video)
    if not source:
        print(f"skip {slug}: video file not found ({video})")
        return False

    target_rel = f"/uploads/videos/{slug}.mp4"
    target_path = VIDEOS_UPLOAD_DIR / f"{slug}.mp4"

    if needs_video_processing(slug, video, source):
        remux_to_mp4(source, target_path)
        print(f"-> {slug}: {source.name} -> {target_rel}")
        if is_misplaced(source) or (
            source.parent.resolve() == VIDEOS_UPLOAD_DIR.resolve()
            and source.resolve() != target_path.resolve()
        ):
            source.unlink()
        text = set_frontmatter_value(text, "video", target_rel)

    duration = probe_duration_seconds(target_path if target_path.exists() else source)
    if duration:
        label = format_duration_label(duration)
        current = normalize_duration_label(read_frontmatter_value(text, "durationLabel"))
        if current != label:
            text = set_frontmatter_value(text, "durationLabel", f'"{label}"')
            print(f"   duration: {label}")

    playable = target_path if target_path.exists() else source
    text, _ = process_poster(slug, text, playable)

    if text != original:
        md_file.write_text(text, encoding="utf-8")
        return True
    return False


def cleanup_misplaced_tree() -> None:
    if MISPLACED_ROOT.exists():
        shutil.rmtree(MISPLACED_ROOT)
        print("Removed misplaced content/videos/public/")


def process_post_covers() -> bool:
    """Convert iPhone HEIC cover images in blog posts to web-friendly JPG."""
    posts_dir = ROOT / "content" / "posts"
    if not posts_dir.exists():
        return False

    changed = False
    for md_file in sorted(posts_dir.glob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        image = read_frontmatter_value(text, "image")
        if not image or image.startswith("http"):
            continue
        source = resolve_public_file(image)
        if not source or source.suffix.lower() not in {".heic", ".heif"}:
            continue

        jpg_rel = str(Path(image).with_suffix(".jpg")).replace("\\", "/")
        if not jpg_rel.startswith("/"):
            jpg_rel = f"/{jpg_rel}"
        jpg_path = PUBLIC_DIR / jpg_rel.lstrip("/")
        convert_image_to_jpg(source, jpg_path)
        text = set_frontmatter_value(text, "image", jpg_rel)
        md_file.write_text(text, encoding="utf-8")
        print(f"-> {md_file.stem}: cover {source.name} -> {jpg_rel}")
        changed = True
    return changed


def main() -> int:
    changed = False
    for md_file in sorted(VIDEOS_DIR.glob("*.md")):
        if process_video_entry(md_file):
            changed = True

    if process_post_covers():
        changed = True

    cleanup_misplaced_tree()

    if not changed:
        print("All new uploads already processed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
