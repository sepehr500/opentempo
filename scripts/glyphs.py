"""Rasterise Space Grotesk Bold digits into dot-matrix glyphs for the display.
Usage: python scripts/glyphs.py > src/ui/glyphs.json   (needs Pillow)"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

FONT = str(Path(__file__).with_name("SpaceGrotesk.ttf"))
ROWS, WEIGHT, S, THRESH = 17, 700, 24, 0.45

def font_for(rows):
    f = ImageFont.truetype(FONT, 400); f.set_variation_by_axes([WEIGHT])
    _, t, _, b = f.getbbox("0")
    f = ImageFont.truetype(FONT, int(400 * rows * S / (b - t))); f.set_variation_by_axes([WEIGHT])
    return f

def glyph(f, ch, rows):
    _, t0, _, _ = f.getbbox("0")
    l, _, r, _ = f.getbbox(ch); w = r - l; cols = max(1, round(w / S))
    im = Image.new("L", (cols * S, rows * S), 0)
    ImageDraw.Draw(im).text((-l + (cols * S - w) / 2, -t0), ch, font=f, fill=255)
    px = im.load()
    cell = lambda c, r: sum(px[c*S+i, r*S+j] for i in range(S) for j in range(S)) / (S*S*255) > THRESH
    return ["".join("#" if cell(c, r) else "." for c in range(cols)) for r in range(rows)]

f = font_for(ROWS)
json.dump({"rows": ROWS, "glyphs": {ch: glyph(f, ch, ROWS) for ch in "0123456789"}}, sys.stdout, separators=(",", ":"))
