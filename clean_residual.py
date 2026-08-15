from pathlib import Path

src = Path(r"C:\Users\kelly\.codex\.chatgpt-projects\g-p-6a74ed0881048191a7100211d3ec05a3\working\journal-app-live-v24.js")
dst = Path(r"C:\Users\kelly\.codex\.chatgpt-projects\g-p-6a74ed0881048191a7100211d3ec05a3\working\journal-app-live-v25.js")
text = src.read_text(encoding="utf-8")
text = text.replace("â€\x9d", "”").replace("â†\x90", "←")
text = text.replace("â€�", "”").replace("â†�", "←")
dst.write_text(text, encoding="utf-8")
