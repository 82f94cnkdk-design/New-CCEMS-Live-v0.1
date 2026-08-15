from PIL import Image

source = Image.open(r"C:\Users\kelly\OneDrive\Desktop\Codex Image 13 Aug 2026, 19_34_32.png").convert("RGB")

# Approved My Field Day screen: the engraved estate panorama immediately
# above its navigation bar, excluding the phone bezel and controls.
crop = source.crop((788, 602, 1001, 661))
crop.save("field-panorama-crop.png")

# Preserve the original engraved detail while making the ivory paper transparent.
crop = crop.resize((852, 236), Image.Resampling.LANCZOS)
crop.save("field-estate-panorama-approved-v3.png")
