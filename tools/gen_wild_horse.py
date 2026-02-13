#!/usr/bin/env python3
"""Generate a wild_horse 32x32 pixel-art sprite PNG.

Uses the same pure-Python PNG approach as gen_enemy_sprites.py so there is
no dependency on Pillow or any third-party library.
"""

import struct, zlib, os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'tileArt', 'enemies')
SIZE = 32
TRANSPARENT = (0, 0, 0, 0)


# ---------- helpers (same as gen_enemy_sprites.py) ----------
def hex_to_rgba(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def darken(c, f=0.65):
    return (int(c[0]*f), int(c[1]*f), int(c[2]*f), c[3])


def lighten(c, f=1.4):
    return (min(255, int(c[0]*f)), min(255, int(c[1]*f)), min(255, int(c[2]*f)), c[3])


def make_png(pixels, w, h):
    def chunk(ctype, data):
        c = ctype + data
        return (struct.pack('>I', len(data)) + c +
                struct.pack('>I', zlib.crc32(c) & 0xffffffff))
    raw = b''
    for row in pixels:
        raw += b'\x00'
        for r, g, b, a in row:
            raw += struct.pack('BBBB', r, g, b, a)
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    return (sig + chunk(b'IHDR', ihdr) +
            chunk(b'IDAT', zlib.compress(raw)) +
            chunk(b'IEND', b''))


def new_canvas(w=SIZE, h=SIZE):
    return [[TRANSPARENT for _ in range(w)] for _ in range(h)]


def fill_rect(px, x, y, w, h, c):
    for dy in range(h):
        for dx in range(w):
            py, pxx = y + dy, x + dx
            if 0 <= py < len(px) and 0 <= pxx < len(px[0]):
                px[py][pxx] = c


def set_px(px, x, y, c):
    if 0 <= y < len(px) and 0 <= x < len(px[0]):
        px[y][x] = c


# ---------- wild horse generator ----------
def gen_wild_horse():
    px = new_canvas()

    # Colour palette
    body    = hex_to_rgba('#8B6C42')   # brown body
    body_dk = hex_to_rgba('#6B4C22')   # darker brown (legs, hooves, mane outline)
    belly   = hex_to_rgba('#A8936A')   # lighter belly
    mane    = hex_to_rgba('#4A3520')   # dark mane / tail
    eye     = hex_to_rgba('#1A1A1A')   # near-black eye
    hoof    = hex_to_rgba('#3A2A10')   # very dark hooves
    nose    = hex_to_rgba('#5A3A1A')   # nostril accent

    # ---- BODY (main barrel, side-on oval-ish shape) ----
    # Core body rectangle  (x=8..24, y=12..19)  => 17 wide, 8 tall
    fill_rect(px, 8, 12, 17, 8, body)
    # Rounded top edge (back line)
    fill_rect(px, 10, 11, 13, 1, body)
    # Belly highlight (lower third of body)
    fill_rect(px, 8, 17, 17, 3, belly)

    # ---- NECK (angled upward toward head) ----
    fill_rect(px, 5, 9, 5, 6, body)       # neck block
    fill_rect(px, 6, 8, 4, 1, body)       # top of neck
    fill_rect(px, 7, 7, 3, 1, body)       # upper neck narrowing

    # ---- HEAD ----
    fill_rect(px, 2, 7, 6, 5, body)       # head block
    fill_rect(px, 1, 8, 2, 3, body)       # snout extension
    # Nostril
    set_px(px, 1, 10, nose)
    # Eye
    set_px(px, 4, 8, eye)
    set_px(px, 5, 8, eye)
    # Ear (two pixels poking up)
    set_px(px, 4, 6, body_dk)
    set_px(px, 5, 6, body_dk)
    set_px(px, 4, 5, body_dk)

    # ---- MANE (runs along top of neck and head) ----
    # Mane on top of head / neck
    set_px(px, 3, 6, mane)
    set_px(px, 6, 6, mane)
    set_px(px, 6, 7, mane)
    set_px(px, 7, 6, mane)
    fill_rect(px, 7, 7, 1, 1, mane)
    fill_rect(px, 8, 7, 1, 2, mane)
    fill_rect(px, 9, 8, 1, 2, mane)
    fill_rect(px, 10, 9, 1, 3, mane)
    # Mane strands hanging down the far side of neck
    set_px(px, 5, 7, mane)
    set_px(px, 6, 8, mane)
    set_px(px, 7, 9, mane)
    set_px(px, 8, 10, mane)
    set_px(px, 9, 10, mane)
    set_px(px, 9, 11, mane)
    set_px(px, 10, 11, mane)

    # ---- TAIL (at rear, flowing down/back) ----
    fill_rect(px, 25, 11, 2, 2, mane)
    fill_rect(px, 26, 13, 2, 2, mane)
    fill_rect(px, 27, 15, 2, 3, mane)
    fill_rect(px, 28, 18, 2, 2, mane)
    set_px(px, 29, 20, mane)
    set_px(px, 25, 10, mane)

    # ---- FRONT LEGS (two visible, slightly offset) ----
    # Near front leg
    fill_rect(px, 10, 20, 3, 6, body_dk)
    # Far front leg (slightly behind)
    fill_rect(px, 14, 20, 3, 6, body_dk)
    # Hooves
    fill_rect(px, 10, 26, 3, 2, hoof)
    fill_rect(px, 14, 26, 3, 2, hoof)

    # ---- REAR LEGS (two visible, slightly offset) ----
    # Haunch / upper rear leg area
    fill_rect(px, 19, 18, 4, 2, body_dk)
    # Near rear leg
    fill_rect(px, 19, 20, 3, 6, body_dk)
    # Far rear leg
    fill_rect(px, 23, 20, 3, 6, body_dk)
    # Hooves
    fill_rect(px, 19, 26, 3, 2, hoof)
    fill_rect(px, 23, 26, 3, 2, hoof)

    # ---- Ground line shadow (subtle, 1-pixel) ----
    shadow = hex_to_rgba('#000000', 40)
    fill_rect(px, 9, 28, 18, 1, shadow)

    return px


# ---------- main ----------
if __name__ == '__main__':
    os.makedirs(OUT_DIR, exist_ok=True)
    px = gen_wild_horse()
    data = make_png(px, SIZE, SIZE)
    out_path = os.path.join(OUT_DIR, 'wild_horse.png')
    with open(out_path, 'wb') as f:
        f.write(data)
    print(f'Wrote {out_path}  ({len(data)} bytes)')
