import re
import json
from pathlib import Path
from urllib.request import Request, urlopen, urlretrieve
from urllib.parse import unquote

html_path = Path(r"C:\Users\brady\AppData\Local\Temp\gdrive.html")
raw = html_path.read_text(encoding="utf-8", errors="ignore")

# Common patterns for Drive folder listings
ids = set(re.findall(r'"([a-zA-Z0-9_-]{25,})"[^"]{0,40}?\.(?:MOV|mov|MP4|mp4)', raw))
ids |= set(re.findall(r'\[null,"([a-zA-Z0-9_-]{25,})"', raw))

# Look for file name + id pairs in AF_initDataCallback / JSON blobs
name_id = re.findall(
    r'(?:9c9ba525b6e1442faf98d731a392a8d5\.MOV|30f644099095436a82065cb29d0889d8\.mov|558ad0b6306c4bc989b006f097ece5a2\.mov|export_1782751897500\.mov|v15044gf0000d96ndu7og65iejdluf1g\.MP4)',
    raw,
)
print("names found", len(name_id), set(name_id))

# Drive embeds often have /file/d/ID/
file_ids = re.findall(r"/file/d/([a-zA-Z0-9_-]+)", raw)
print("file/d ids", file_ids[:20], "count", len(set(file_ids)))

# Another pattern from folder viewer
pat = re.findall(r'\["([a-zA-Z0-9_-]{20,})",\d+,\["[^"]+\.(?:MOV|mov|MP4|mp4)"', raw)
print("pair-ish", pat[:20])

# Broader: filenames near ids
for fname in [
    "9c9ba525b6e1442faf98d731a392a8d5.MOV",
    "30f644099095436a82065cb29d0889d8.mov",
    "558ad0b6306c4bc989b006f097ece5a2.mov",
    "export_1782751897500.mov",
    "v15044gf0000d96ndu7og65iejdluf1g.MP4",
]:
    idx = raw.find(fname)
    print("\n", fname, "idx", idx)
    if idx >= 0:
        snippet = raw[max(0, idx - 400) : idx + 200]
        ids_near = re.findall(r"[a-zA-Z0-9_-]{25,33}", snippet)
        print(" nearby ids", ids_near[:15])
        print(" snippet...", snippet[:180].replace("\n", " "))
