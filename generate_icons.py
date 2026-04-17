"""
Generate FitFlow PWA icons.

Design: Industrial/Editorial aesthetic per DESIGN.md
- Dark background (#111110) with rounded corners
- Geometric "F" letterform in amber (#C4925A)
- Minimal, precise, no decorative flourishes
"""
import struct
import zlib
import math

BG = (17, 17, 16, 255)
AMBER = (196, 146, 90, 255)
TRANSPARENT = (0, 0, 0, 0)


def make_png_bytes(size, radius_pct=0.15625):
    """Render the FitFlow icon at `size` x `size` and return raw PNG bytes."""
    radius = round(size * radius_pct)
    pixels = [[TRANSPARENT] * size for _ in range(size)]

    # Rounded-rect background
    for y in range(size):
        for x in range(size):
            # Determine if (x,y) is inside the rounded rectangle using
            # per-corner circle tests; elsewhere the rect is solid.
            cx = cy = None
            if x < radius and y < radius:
                cx, cy = radius - 1, radius - 1
            elif x >= size - radius and y < radius:
                cx, cy = size - radius, radius - 1
            elif x < radius and y >= size - radius:
                cx, cy = radius - 1, size - radius
            elif x >= size - radius and y >= size - radius:
                cx, cy = size - radius, size - radius

            if cx is not None:
                dx, dy = x - cx, y - cy
                if dx * dx + dy * dy <= radius * radius:
                    pixels[y][x] = BG
            else:
                pixels[y][x] = BG

    # F letterform — reference geometry at 512×512, then scale.
    # Bounding box: 116px inset on all sides → 280×280 mark,
    # perfectly centred in the 512×512 canvas.
    def sc(v):
        return max(1, round(v * size / 512))

    rects = [
        (sc(116), sc(116), sc(44),  sc(280)),   # vertical stem
        (sc(116), sc(116), sc(280), sc(44)),    # top horizontal bar
        (sc(116), sc(240), sc(210), sc(44)),    # mid horizontal bar
    ]

    for rx, ry, rw, rh in rects:
        for y in range(ry, min(ry + rh, size)):
            for x in range(rx, min(rx + rw, size)):
                pixels[y][x] = AMBER

    # Encode as PNG
    def chunk(name, data):
        body = name + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # RGBA

    raw = bytearray()
    for row in pixels:
        raw.append(0)  # filter = None
        for r, g, b, a in row:
            raw.extend((r, g, b, a))

    png = bytearray(b"\x89PNG\r\n\x1a\n")
    png += chunk(b"IHDR", ihdr)
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    return bytes(png)


def make_ico(png32: bytes) -> bytes:
    """Wrap a 32×32 PNG in a minimal ICO container."""
    offset = 6 + 16  # ICONDIR (6) + one ICONDIRENTRY (16)
    header = struct.pack("<HHH", 0, 1, 1)
    entry = struct.pack("<BBBBHHII", 32, 32, 0, 0, 1, 32, len(png32), offset)
    return header + entry + png32


if __name__ == "__main__":
    import os

    out = os.path.join(os.path.dirname(__file__), "public")

    png512 = make_png_bytes(512)
    png192 = make_png_bytes(192)
    png32  = make_png_bytes(32)

    with open(os.path.join(out, "icon-512.png"), "wb") as f:
        f.write(png512)
    with open(os.path.join(out, "icon-192.png"), "wb") as f:
        f.write(png192)
    with open(os.path.join(out, "favicon.ico"), "wb") as f:
        f.write(make_ico(png32))

    print("Icons written to public/")
    print(f"  icon-512.png  ({len(png512):,} bytes)")
    print(f"  icon-192.png  ({len(png192):,} bytes)")
    print(f"  favicon.ico   ({len(make_ico(png32)):,} bytes)")
