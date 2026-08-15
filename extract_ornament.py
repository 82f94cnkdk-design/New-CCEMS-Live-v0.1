from PIL import Image, ImageFilter, ImageOps

source = Image.open(r"C:\Users\kelly\.codex\generated_images\019ff659-e216-72d0-8efc-af7c7c51237e\exec-43e6f971-f7e4-4948-8649-017f0866bee8.png").convert("RGB")
gray = ImageOps.grayscale(source)
edges = gray.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(0.45))
edges = edges.point(lambda v: 0 if v < 9 else min(255, (v - 9) * 8))
out = Image.new("RGBA", source.size, (155, 121, 61, 0))
out.putalpha(edges)
bbox = out.getbbox()
if bbox:
    out = out.crop(bbox)
out.thumbnail((1100, 310), Image.Resampling.LANCZOS)
out.save(r"C:\Users\kelly\.codex\.chatgpt-projects\g-p-6a74ed0881048191a7100211d3ec05a3\working\faith-botanical-divider-v1.png")
