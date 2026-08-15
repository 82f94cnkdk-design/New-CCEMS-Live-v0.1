from pathlib import Path
import re

src = Path(r"C:\Users\kelly\.codex\.chatgpt-projects\g-p-6a74ed0881048191a7100211d3ec05a3\working\journal-app-live-v22.js")
dst = Path(r"C:\Users\kelly\.codex\.chatgpt-projects\g-p-6a74ed0881048191a7100211d3ec05a3\working\journal-app-live-v24.js")
text = src.read_text(encoding="utf-8-sig")

def repair_segment(segment: str) -> str:
    try:
        return segment.encode("cp1252").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return segment

fixed = text
for _ in range(3):
    previous = fixed
    fixed = re.sub(r"â..", lambda m: repair_segment(m.group(0)), fixed)
    fixed = re.sub(r"Â.", lambda m: repair_segment(m.group(0)), fixed)
    if fixed == previous:
        break
fixed = fixed.replace("â€�", "”").replace("â†�", "←")
dst.write_text(fixed, encoding="utf-8")
