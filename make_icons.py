from PIL import Image, ImageDraw
import math

def make_icon(size, path):
    img = Image.new("RGBA", (size, size), (10, 25, 41, 255))
    d = ImageDraw.Draw(img)
    cx = cy = size / 2
    r = size * 0.42

    # outer ring
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(46, 196, 182, 255), width=max(2, size // 40))

    # compass needle (N-pointing arrow, accent orange) plus a drift arrow
    needle_len = r * 0.85
    # North point
    tip = (cx, cy - needle_len)
    left = (cx - needle_len * 0.28, cy + needle_len * 0.15)
    right = (cx + needle_len * 0.28, cy + needle_len * 0.15)
    d.polygon([tip, left, right], fill=(255, 159, 28, 255))

    # South tail
    tail = (cx, cy + needle_len * 0.65)
    left2 = (cx - needle_len * 0.16, cy)
    right2 = (cx + needle_len * 0.16, cy)
    d.polygon([tail, left2, right2], fill=(234, 242, 251, 255))

    # center dot
    dot_r = size * 0.035
    d.ellipse([cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r], fill=(234, 242, 251, 255))

    img.save(path)

make_icon(192, "icons/icon-192.png")
make_icon(512, "icons/icon-512.png")
print("done")
