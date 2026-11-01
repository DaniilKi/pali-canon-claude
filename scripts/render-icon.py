"""Render assets/icon.svg's palm-leaf manuscript mark to PNG without an SVG library.

The shapes below mirror assets/icon.svg exactly (256-unit canvas). Keep the two in step.
Usage: python scripts/render-icon.py   (writes assets/icon.png and .claude-plugin/icon.png, 512 px)
Needs Pillow. Drawn at 8x and downsampled for smooth edges.
"""
from pathlib import Path
from PIL import Image, ImageDraw

SIZE, SS = 512, 8
K = SIZE * SS / 256  # SVG units -> supersampled pixels
ROOT = Path(__file__).resolve().parent.parent

BG, LEAF, EDGE, LINE, CORD = '#7a2e1d', '#f3d9a4', '#5a1f12', '#c9963b', '#e8b04a'


def s(*v):
    return [round(x * K) for x in v]


def line(d, x1, y1, x2, y2, width, colour):
    d.line(s(x1, y1, x2, y2), fill=colour, width=round(width * K))
    r = width / 2  # round caps
    for x, y in ((x1, y1), (x2, y2)):
        d.ellipse(s(x - r, y - r, x + r, y + r), fill=colour)


img = Image.new('RGBA', (SIZE * SS,) * 2, (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle(s(0, 0, 256, 256), radius=round(48 * K), fill=BG)
for y in (64, 111, 158):  # leaves: 184x34, rx 17, stroke 4 centred on the edge
    d.rounded_rectangle(s(36 - 2, y - 2, 220 + 2, y + 34 + 2), radius=round(19 * K), fill=EDGE)
    d.rounded_rectangle(s(36 + 2, y + 2, 220 - 2, y + 34 - 2), radius=round(15 * K), fill=LEAF)
for y in (81, 128, 175):
    line(d, 62, y, 194, y, 3, LINE)
    for x in (84, 172):  # string holes
        d.ellipse(s(x - 6, y - 6, x + 6, y + 6), fill=BG)
for x in (84, 172):  # binding cords
    line(d, x, 48, x, 208, 4, CORD)

out = img.resize((SIZE, SIZE), Image.LANCZOS)
for target in (ROOT / 'assets' / 'icon.png', ROOT / '.claude-plugin' / 'icon.png'):
    out.save(target, optimize=True)
    print(target.relative_to(ROOT), target.stat().st_size, 'bytes')
