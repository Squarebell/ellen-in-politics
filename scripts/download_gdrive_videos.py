from pathlib import Path
from urllib.request import urlopen, Request
import ssl
import re

files = [
    ("1ko5l8HBIdcw9sNY9Z6tInsPyth9AwiBJ", "reel-01.mov"),
    ("1qaSTjXn2oMBP_ReUNpYnjlMfZZ6_94_k", "reel-02.mov"),
    ("1UdMREzykg2SGDmVrJ7RGpGqaJ1yhAz7d", "reel-03.mov"),
    ("11Xn-yJ8cXDjWGeSscNAP5TgdZ8ph9CUy", "reel-04.mov"),
    ("1A4QRTLdj_CcJsyTySCHoKaortFNmLx46", "reel-05.mp4"),
]

out = Path(r"C:\Users\brady\.cursor\ellensitefun\public\videos\ellen")
out.mkdir(parents=True, exist_ok=True)
ctx = ssl.create_default_context()
headers = {"User-Agent": "Mozilla/5.0"}


def download(fid: str, dest: Path) -> None:
    url = f"https://drive.google.com/uc?export=download&id={fid}&confirm=t"
    print("Downloading", dest.name, "...")
    with urlopen(Request(url, headers=headers), context=ctx, timeout=300) as r:
        data = r.read()

    head = data[:500].lstrip()
    if head.startswith(b"<") or b"<!DOCTYPE" in head or b"<html" in head.lower():
        text = data.decode("utf-8", errors="ignore")
        m = re.search(r"confirm=([0-9A-Za-z_]+)", text)
        uuid = re.search(r'name="uuid"\s+value="([^"]+)"', text)
        print("  interstitial; confirm=", m.group(1) if m else None)
        if uuid:
            url2 = (
                f"https://drive.google.com/uc?export=download&id={fid}"
                f"&confirm=t&uuid={uuid.group(1)}"
            )
        elif m:
            url2 = f"https://drive.google.com/uc?export=download&id={fid}&confirm={m.group(1)}"
        else:
            # gdown-style
            url2 = f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t"
        with urlopen(Request(url2, headers=headers), context=ctx, timeout=300) as r2:
            data = r2.read()

    dest.write_bytes(data)
    print("  saved", len(data), "bytes; magic=", data[:12])


for fid, name in files:
    download(fid, out / name)

print("\nDone:")
for p in sorted(out.iterdir()):
    print(p.name, p.stat().st_size)
