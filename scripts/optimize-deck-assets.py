"""Resize and convert deck-v2 photography to web-sized WebP.

The raw PNGs in assets/deck-v2 are print sized. Pages link the WebP files this
script writes, never the raw PNGs. Run it again if a source image changes.

    python scripts/optimize-deck-assets.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "deck-v2"

# --sl-ink-900, the page background the images sit on
INK = (1, 8, 18, 255)

# name, longest edge in px, square crop
JOBS = [
    ("ian_c", 320, True),
    ("anthony_c", 320, True),
    ("karla_c", 320, True),
    ("joel_c", 320, True),
    ("shot_home", 1184, False),
]


def square(img):
    side = min(img.size)
    left = (img.width - side) // 2
    top = 0 if img.height > img.width else (img.height - side) // 2
    return img.crop((left, top, left + side, top + side))


def on_ink(img):
    """Flatten transparency onto the page background so edges never show black."""
    img = img.convert("RGBA")
    base = Image.new("RGBA", img.size, INK)
    return Image.alpha_composite(base, img).convert("RGB")


def main():
    for name, edge, crop in JOBS:
        src = SRC / f"{name}.png"
        img = on_ink(Image.open(src))
        if crop:
            img = square(img)
        scale = edge / max(img.size)
        if scale < 1:
            img = img.resize(
                (round(img.width * scale), round(img.height * scale)),
                Image.LANCZOS,
            )
        out = SRC / f"{name}.webp"
        img.save(out, "WEBP", quality=82, method=6)
        print(f"{out.name} {img.width}x{img.height} {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
