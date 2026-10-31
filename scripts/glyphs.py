"""Rasterise Space Grotesk Bold into dot-matrix glyph sets for the display.
Usage: python scripts/glyphs.py > src/ui/glyphs.json   (needs Pillow)

Sets:
  big    digits, 17 rows tall (cap height) — the BPM on the Unit screen
  small  digits + lowercase, 11 rows from ascender to descender — names and small numbers
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

FONT = str(Path(__file__).with_name("SpaceGrotesk.ttf"))
WEIGHT, S, THRESH = 700, 24, 0.45

def font(size):
    f = ImageFont.truetype(FONT, size); f.set_variation_by_axes([WEIGHT]); return f

def raster(f, ch, rows, top, bottom):
    l, _, r, _ = f.getbbox(ch); w = max(1, r - l); cols = max(1, round(w / S))
    im = Image.new("L", (cols * S, rows * S), 0)
    scale = rows * S / (bottom - top)
    ImageDraw.Draw(im).text((-l + (cols * S - w) / 2, -top), ch, font=f, fill=255)
    px = im.load()
    on = lambda c, r: sum(px[c*S+i, r*S+j] for i in range(S) for j in range(S)) / (S*S*255) > THRESH
    return ["".join("#" if on(c, r) else "." for c in range(cols)) for r in range(rows)]

def glyph_set(chars, rows, ref_top, ref_bottom):
    probe = font(400)
    _, t, _, _ = probe.getbbox(ref_top); _, _, _, b = probe.getbbox(ref_bottom)
    f = font(int(400 * rows * S / (b - t)))
    _, top, _, _ = f.getbbox(ref_top); _, _, _, bottom = f.getbbox(ref_bottom)
    return {"rows": rows, "glyphs": {ch: raster(f, ch, rows, top, bottom) for ch in chars}}

out = {
    "big": glyph_set("0123456789", 17, "0", "0"),
    "small": glyph_set("0123456789abcdefghijklmnopqrstuvwxyz-", 11, "b", "p"),
}
json.dump(out, sys.stdout, separators=(",", ":"))
