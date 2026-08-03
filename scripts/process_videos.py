#!/usr/bin/env python3
"""
Prepare uploaded videos for the site and transcription pipeline.

Runs in CI before transcribe_videos.py. For each content/videos/*.md entry:
- Resolves video files (including misplaced CMS uploads under content/videos/public/)
- Converts iPhone .mov to web-friendly .mp4 (copy h264 when possible, else re-encode)
- Generates poster thumbnails when missing
- Converts HEIC/HEIF posters to .jpg
- Probes and fills durationLabel when missing; normalizes existing labels (e.g. "1: 24" -> "1:24")
- Updates frontmatter paths to canonical /uploads/... locations
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
MISPLACED_VIDEOS_DIR = VIDEOS_DIR / "public" / "uploads" / "videos"
VIDEOS_UPLOAD_DIR = PUBLIC_DIR / "uploads" / "videos"
POSTERS_DIR = PUBLIC_DIR / "uploads" / "posters"

VIDEO_EXTENSIONS = {".mov", ".mp4", ".webm", ".m4v"}
HEIC_EXTENSIONS = {".heic", ".heif"}


def read_frontmatter_value(text: str, key: str) -> str | None:
    match = re.search(rf"^{re.escape(key)}:\s*(.+?)\s*$", text, re.MULTILINE)
    if not match:
        return None
    value = match.group(1).strip().strip("\"'")
    return value or None


def set_frontmatter_value(text: str, key: str, value: str) -> str:
    display = f'"{value}"' if key == "durationLabel" and ":" in value else value
    line = f"{key}: {display}"
    if re.search(rf"^{re.escape(key)}:", text, re.MULTILINE):
        return re.sub(rf"^{re.escape(key)}:.*$", line, text, count=1, flags=re.MULTILINE)
    # Insert before video: when adding media fields, or after date otherwise.
    if key in {"video", "poster", "captions", "durationLabel"} and re.search(
        r"^video:", text, re.MULTILINE
    ):
        return re.sub(r"^(video:.*)$", rf"{line}\n\1", text, count=1, flags=re.MULTILINE)
    if re.search(r"^date:", text, re.MULTILINE):
        return re.sub(r"^(date:.*)$", rf"\1\n{line}", text, count=1, flags=re.MULTILINE)
    return re.sub(r"^(---\n)", rf"\1{line}\n", text, count=1)


def normalize_duration_label(label: str) -> str:
    """Fix spacing in duration labels like '1: 24' -> '1:24'."""
    cleaned = re.sub(r"\s+", "", label.strip())
    match = re.match(r"^(\d+):(\d{1,2})$", cleaned)
    if match:
        return f"{int(match.group(1))}:{match.group(2).zfill(2)}"
    return label.strip()


def format_duration(seconds: float) -> str:
    total = max(0, int(round(seconds)))
    minutes, secs = divmod(total, 60)
    return f"{minutes}:{secs:02d}"


def public_path_to_abs(public_path: str) -> Path:
    return PUBLIC_DIR / public_path.lstrip("/")


def basename_from_path(path_str: str) -> str:
    return Path(path_str.split("?")[0]).name


def resolve_video_file(slug: str, video_ref: str | None) -> Path | None:
    """Find the video file on disk, including misplaced CMS uploads."""
    candidates: list[Path] = []

    if video_ref and not video_ref.startswith("http"):
        candidates.append(public_path_to_abs(video_ref))
        candidates.append(MISPLACED_VIDEOS_DIR / basename_from_path(video_ref))
        candidates.append(VIDEOS_UPLOAD_DIR / basename_from_path(video_ref))
        # CMS sometimes writes to public/uploads/ without videos/ subfolder
        candidates.append(PUBLIC_DIR / "uploads" / basename_from_path(video_ref))

    # Slug-based fallbacks for renamed/moved uploads
    for ext in (".mov", ".mp4", ".webm", ".m4v"):
        candidates.append(VIDEOS_UPLOAD_DIR / f"{slug}{ext}")
        candidates.append(MISPLACED_VIDEOS_DIR / f"{slug}{ext}")

    if MISPLACED_VIDEOS_DIR.is_dir():
        for path in MISPLACED_VIDEOS_DIR.iterdir():
            if path.suffix.lower() in VIDEO_EXTENSIONS:
                candidates.append(path)

    seen: set[Path] = set()
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        if candidate.is_file():
            return candidate
    return None


def resolve_poster_file(slug: str, poster_ref: str | None) -> Path | None:
    candidates: list[Path] = []
    if poster_ref and not poster_ref.startswith("http"):
        candidates.append(public_path_to_abs(poster_ref))
        candidates.append(VIDEOS_DIR / "public" / "uploads" / "posters" / basename_from_path(poster_ref))
        candidates.append(PUBLIC_DIR / "uploads" / basename_from_path(poster_ref))

    for ext in (".jpg", ".jpeg", ".png", ".webp", *HEIC_EXTENSIONS):
        candidates.append(POSTERS_DIR / f"{slug}{ext}")

    seen: set[Path] = set()
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        if candidate.is_file():
            return candidate
    return None


def run_ffmpeg(args: list[str]) -> None:
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def probe_duration(video_path: Path) -> float | None:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(video_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return None
    try:
        return float(result.stdout.strip())
    except ValueError:
        return None


def video_codec(video_path: Path) -> str | None:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=codec_name",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(video_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return None
    return result.stdout.strip() or None


def convert_mov_to_mp4(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    codec = video_codec(src)
    if codec == "h264":
        run_ffmpeg(["-i", str(src), "-c", "copy", "-movflags", "+faststart", str(dest)])
    else:
        run_ffmpeg(
            [
                "-i",
                str(src),
                "-c:v",
                "libx264",
                "-preset",
                "fast",
                "-crf",
                "23",
                "-c:a",
                "aac",
                "-movflags",
                "+faststart",
                str(dest),
            ]
        )


def extract_poster(video_path: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    run_ffmpeg(
        [
            "-ss",
            "1",
            "-i",
            str(video_path),
            "-frames:v",
            "1",
            "-q:v",
            "2",
            str(dest),
        ]
    )


def convert_heic_to_jpg(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    run_ffmpeg(["-i", str(src), str(dest)])


def is_misplaced(path: Path) -> bool:
    try:
        return path.resolve().is_relative_to((VIDEOS_DIR / "public").resolve())
    except ValueError:
        return False


def needs_video_processing(slug: str, video_ref: str | None, src: Path) -> bool:
    """Only migrate/convert uploads that are .mov, misplaced, or not at the referenced path."""
    if src.suffix.lower() == ".mov":
        return True
    if is_misplaced(src):
        return True
    if video_ref and not video_ref.startswith("http"):
        expected = public_path_to_abs(video_ref)
        if expected.resolve() != src.resolve() and not expected.exists():
            return True
    # New CMS uploads land as arbitrary filenames under /uploads/videos/
    if video_ref and basename_from_path(video_ref) != f"{slug}.mp4":
        if src.parent.resolve() == VIDEOS_UPLOAD_DIR.resolve():
            return True
    return False


def ensure_video(slug: str, video_ref: str | None) -> tuple[str | None, Path | None]:
    """Return canonical public video path and the file used for poster/duration."""
    src = resolve_video_file(slug, video_ref)
    if not src:
        return video_ref, None

    if not needs_video_processing(slug, video_ref, src):
        return video_ref, src

    VIDEOS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest_mp4 = VIDEOS_UPLOAD_DIR / f"{slug}.mp4"
    canonical = f"/uploads/videos/{slug}.mp4"

    ext = src.suffix.lower()
    if ext == ".mov":
        if not dest_mp4.exists() or src.stat().st_mtime > dest_mp4.stat().st_mtime:
            convert_mov_to_mp4(src, dest_mp4)
        if src != dest_mp4 and is_misplaced(src):
            src.unlink(missing_ok=True)
        return canonical, dest_mp4

    if ext == ".mp4":
        if src.resolve() != dest_mp4.resolve():
            if not dest_mp4.exists() or src.stat().st_mtime > dest_mp4.stat().st_mtime:
                shutil.copy2(src, dest_mp4)
            if is_misplaced(src):
                src.unlink(missing_ok=True)
        return canonical, dest_mp4

    # Other formats: copy as-is under slug name
    dest = VIDEOS_UPLOAD_DIR / f"{slug}{ext}"
    if src.resolve() != dest.resolve():
        shutil.copy2(src, dest)
    return f"/uploads/videos/{slug}{ext}", dest


def ensure_poster(slug: str, poster_ref: str | None, video_path: Path | None) -> str | None:
    canonical = f"/uploads/posters/{slug}.jpg"
    dest = POSTERS_DIR / f"{slug}.jpg"

    src = resolve_poster_file(slug, poster_ref)
    if src and src.suffix.lower() in HEIC_EXTENSIONS:
        convert_heic_to_jpg(src, dest)
        if src.resolve() != dest.resolve() and is_misplaced(src):
            src.unlink(missing_ok=True)
        return canonical

    if src and src.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
        if src.suffix.lower() in HEIC_EXTENSIONS or is_misplaced(src):
            if not dest.exists() or src.stat().st_mtime > dest.stat().st_mtime:
                if src.suffix.lower() in {".jpg", ".jpeg"}:
                    shutil.copy2(src, dest)
                else:
                    run_ffmpeg(["-i", str(src), str(dest)])
            return canonical
        # Existing poster at a stable path — leave frontmatter alone
        return poster_ref

    if dest.exists():
        return canonical

    if video_path and video_path.exists():
        extract_poster(video_path, dest)
        return canonical

    return poster_ref


def cleanup_misplaced_uploads() -> None:
    misplaced_root = VIDEOS_DIR / "public"
    if not misplaced_root.exists():
        return
    for path in sorted(misplaced_root.rglob("*"), reverse=True):
        if path.is_file():
            path.unlink(missing_ok=True)
        elif path.is_dir():
            path.rmdir()
    if misplaced_root.exists() and not any(misplaced_root.iterdir()):
        misplaced_root.rmdir()


def process_video_md(md_file: Path) -> bool:
    text = md_file.read_text(encoding="utf-8")
    slug = md_file.stem
    original = text

    video_ref = read_frontmatter_value(text, "video")
    if not video_ref or video_ref.startswith("http"):
        return False

    poster_ref = read_frontmatter_value(text, "poster")
    duration_label = read_frontmatter_value(text, "durationLabel")

    new_video_ref, video_path = ensure_video(slug, video_ref)
    if new_video_ref and new_video_ref != video_ref:
        text = set_frontmatter_value(text, "video", new_video_ref)

    new_poster_ref = ensure_poster(slug, poster_ref, video_path)
    if new_poster_ref and new_poster_ref != poster_ref:
        text = set_frontmatter_value(text, "poster", new_poster_ref)

    if video_path and video_path.exists():
        if not duration_label:
            duration = probe_duration(video_path)
            if duration is not None:
                text = set_frontmatter_value(text, "durationLabel", format_duration(duration))
        elif duration_label:
            normalized = normalize_duration_label(duration_label)
            if normalized != duration_label:
                text = set_frontmatter_value(text, "durationLabel", normalized)

    if text != original:
        md_file.write_text(text, encoding="utf-8")
        print(f"updated {md_file.name}")
        return True

    print(f"ok {md_file.name}")
    return False


def main() -> int:
    if not VIDEOS_DIR.is_dir():
        print("No content/videos directory found.")
        return 0

    changed = False
    for md_file in sorted(VIDEOS_DIR.glob("*.md")):
        if process_video_md(md_file):
            changed = True

    cleanup_misplaced_uploads()

    # Remove orphan uploads at public/uploads/ root (misplaced CMS uploads)
    uploads_root = PUBLIC_DIR / "uploads"
    if uploads_root.is_dir():
        for path in uploads_root.iterdir():
            if path.is_file() and path.suffix.lower() in VIDEO_EXTENSIONS:
                print(f"removing orphan upload {path.relative_to(ROOT)}")
                path.unlink(missing_ok=True)
                changed = True

    if not changed:
        print("All videos already processed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
