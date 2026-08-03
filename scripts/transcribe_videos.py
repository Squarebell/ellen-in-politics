#!/usr/bin/env python3
"""
Auto-generate WebVTT captions for videos that don't have them yet.

Scans content/videos/*.md for entries with a `video:` file but no `captions:`,
transcribes the audio locally with faster-whisper (free, open-source), writes
the .vtt to public/uploads/captions/<slug>.vtt, and adds the `captions:` line
to the video's frontmatter.

The site build (scripts/build-videos.mjs) already turns the .vtt into the
on-page transcript, so no other step is needed.

Model choice: large-v2 at float32 precision. In side-by-side tests on these
reels it was the only combination with no hallucinated words (large-v3 and
int8 quantization both invented text over the background-music sections).

Environment variables:
  WHISPER_MODEL     faster-whisper model name (default: large-v2)
  WHISPER_COMPUTE   ctranslate2 compute type (default: float32)
  WHISPER_LANGUAGE  spoken language (default: en)

Usage:
  pip install faster-whisper
  python3 scripts/transcribe_videos.py            # only videos missing captions
  python3 scripts/transcribe_videos.py --force    # regenerate all captions
"""

import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIDEOS_DIR = ROOT / "content" / "videos"
PUBLIC_DIR = ROOT / "public"
CAPTIONS_DIR = PUBLIC_DIR / "uploads" / "captions"
VOCAB_FILE = ROOT / "scripts" / "transcribe-vocab.txt"

MODEL_NAME = os.environ.get("WHISPER_MODEL", "large-v2")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE", "float32")
LANGUAGE = os.environ.get("WHISPER_LANGUAGE", "en")

def resolve_public_file(public_path: str | None) -> Path | None:
    """Find a public-facing media file, including CMS misplacement."""
    if not public_path or public_path.startswith("http"):
        return None

    rel = public_path.lstrip("/")
    candidates = [
        PUBLIC_DIR / rel,
        VIDEOS_DIR / "public" / rel,
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def read_frontmatter_value(text: str, key: str) -> str | None:
    match = re.search(rf"^{key}:\s*(.+?)\s*$", text, re.MULTILINE)
    if not match:
        return None
    value = match.group(1).strip().strip("\"'")
    return value or None


def set_frontmatter_captions(text: str, captions_path: str) -> str:
    if re.search(r"^captions:", text, re.MULTILINE):
        return re.sub(
            r"^captions:.*$", f"captions: {captions_path}", text, count=1, flags=re.MULTILINE
        )
    # Insert right after the video: line so the frontmatter stays tidy.
    return re.sub(
        r"^(video:.*)$", rf"\1\ncaptions: {captions_path}", text, count=1, flags=re.MULTILINE
    )


def format_timestamp(seconds: float) -> str:
    ms = round(seconds * 1000)
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def extract_audio(video_path: Path, wav_path: Path) -> None:
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(video_path),
            "-vn", "-ac", "1", "-ar", "16000", "-f", "wav",
            str(wav_path),
        ],
        check=True,
    )


def load_vocab_prompt() -> str | None:
    """Names/terms fed to Whisper as context so they're spelled correctly."""
    if not VOCAB_FILE.exists():
        return None
    words = [
        line.strip()
        for line in VOCAB_FILE.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    return ", ".join(words) if words else None


def clean_text(text: str) -> str:
    """Safety net: drop stray non-Latin characters the decoder can emit."""
    text = re.sub(r"[\ufffd]", "", text)
    if LANGUAGE == "en":
        text = re.sub(r"[^\x00-\x7F\u00c0-\u024f\u2010-\u2027\u20ac]", "", text)
    return re.sub(r"\s{2,}", " ", text).strip()


def transcribe(model, wav_path: Path, vocab_prompt: str | None) -> list[dict]:
    segments, _info = model.transcribe(
        str(wav_path),
        language=LANGUAGE,
        temperature=0.0,
        beam_size=5,
        # VAD skips music/silence so Whisper doesn't hallucinate text there.
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
        # Avoids repetition-loop hallucinations on short clips.
        condition_on_previous_text=False,
        initial_prompt=vocab_prompt,
    )
    cues = []
    for seg in segments:
        text = clean_text(seg.text)
        if text:
            cues.append({"start": seg.start, "end": seg.end, "text": text})
    return cues


def write_vtt(cues: list[dict], out_path: Path) -> None:
    lines = ["WEBVTT", ""]
    for cue in cues:
        lines.append(f"{format_timestamp(cue['start'])} --> {format_timestamp(cue['end'])}")
        lines.append(cue["text"])
        lines.append("")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    force = "--force" in sys.argv

    pending = []
    for md_file in sorted(VIDEOS_DIR.glob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        video = read_frontmatter_value(text, "video")
        captions = read_frontmatter_value(text, "captions")

        if not video or video.startswith("http"):
            continue

        captions_exists = bool(
            captions
            and not captions.startswith("http")
            and (PUBLIC_DIR / captions.lstrip("/")).exists()
        )
        if captions_exists and not force:
            continue

        video_path = resolve_public_file(video)
        if not video_path:
            print(f"skip {md_file.name}: video file not found ({video})")
            continue

        pending.append((md_file, text, video_path))

    if not pending:
        print("All videos already have captions. Nothing to do.")
        return 0

    print(f"Transcribing {len(pending)} video(s) with model '{MODEL_NAME}'...")
    from faster_whisper import WhisperModel

    model = WhisperModel(MODEL_NAME, device="cpu", compute_type=COMPUTE_TYPE)
    vocab_prompt = load_vocab_prompt()

    for md_file, text, video_path in pending:
        slug = md_file.stem
        print(f"-> {slug} ({video_path.name})")

        with tempfile.TemporaryDirectory() as tmp:
            wav_path = Path(tmp) / "audio.wav"
            extract_audio(video_path, wav_path)
            cues = transcribe(model, wav_path, vocab_prompt)

        if not cues:
            print(f"   no speech detected, skipping {slug}")
            continue

        captions_rel = f"/uploads/captions/{slug}.vtt"
        write_vtt(cues, PUBLIC_DIR / captions_rel.lstrip("/"))
        md_file.write_text(set_frontmatter_captions(text, captions_rel), encoding="utf-8")
        print(f"   wrote {captions_rel} ({len(cues)} cues)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
