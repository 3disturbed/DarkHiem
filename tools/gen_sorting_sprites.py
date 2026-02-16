#!/usr/bin/env python3
"""Generate pixel-art sorting minigame sprites as 32x32 PNGs."""

import struct, zlib, os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'tileArt', 'sorting')
SIZE = 32

def hex_to_rgba(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2],16), int(h[2:4],16), int(h[4:6],16), a)

def darken(c, f=0.65):
    return (int(c[0]*f), int(c[1]*f), int(c[2]*f), c[3])

def lighten(c, f=1.4):
    return (min(255,int(c[0]*f)), min(255,int(c[1]*f)), min(255,int(c[2]*f)), c[3])

TRANSPARENT = (0,0,0,0)

def make_png(pixels, w, h):
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    raw = b''
    for row in pixels:
        raw += b'\x00'
        for r,g,b,a in row:
            raw += struct.pack('BBBB', r, g, b, a)
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    return sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')

def new_canvas(w=SIZE, h=SIZE):
    return [[TRANSPARENT for _ in range(w)] for _ in range(h)]

def fill_rect(px, x, y, w, h, c):
    for dy in range(h):
        for dx in range(w):
            py, pxx = y+dy, x+dx
            if 0 <= py < len(px) and 0 <= pxx < len(px[0]):
                px[py][pxx] = c

def set_px(px, x, y, c):
    if 0 <= y < len(px) and 0 <= x < len(px[0]):
        px[y][x] = c

def draw_border(px, x, y, w, h, c):
    for dx in range(w):
        if 0 <= y < len(px) and 0 <= x+dx < len(px[0]): px[y][x+dx] = c
        if 0 <= y+h-1 < len(px) and 0 <= x+dx < len(px[0]): px[y+h-1][x+dx] = c
    for dy in range(h):
        if 0 <= y+dy < len(px) and 0 <= x < len(px[0]): px[y+dy][x] = c
        if 0 <= y+dy < len(px) and 0 <= x+w-1 < len(px[0]): px[y+dy][x+w-1] = c

def draw_line(px, x0, y0, x1, y1, c):
    dx = abs(x1 - x0); dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1; sy = 1 if y0 < y1 else -1
    err = dx + dy
    while True:
        set_px(px, x0, y0, c)
        if x0 == x1 and y0 == y1: break
        e2 = 2 * err
        if e2 >= dy: err += dy; x0 += sx
        if e2 <= dx: err += dx; y0 += sy

# ═══════════════════════════════════════════════════════
# LETTER SPRITES (Envelopes)
# ═══════════════════════════════════════════════════════

LETTER_COLORS = [
    ('#F5E6D0', '#C4A882', '#E74C3C'),  # cream envelope, red stamp
    ('#D6EAF8', '#85C1E9', '#2980B9'),  # blue envelope, blue stamp
    ('#FEF9E7', '#F9E79F', '#F39C12'),  # yellow envelope, orange stamp
    ('#FADBD8', '#F1948A', '#E91E63'),  # pink envelope, pink stamp
    ('#D5F5E3', '#82E0AA', '#27AE60'),  # green envelope, green stamp
]

def gen_letter(variant):
    px = new_canvas()
    base_c, accent_c, stamp_c = [hex_to_rgba(c) for c in LETTER_COLORS[variant]]
    border = darken(accent_c, 0.6)

    # Envelope body
    fill_rect(px, 3, 8, 26, 18, base_c)
    draw_border(px, 3, 8, 26, 18, border)

    # Envelope flap (V shape at top)
    for i in range(13):
        y = 8 + i // 2
        set_px(px, 3 + i, y, accent_c)
        set_px(px, 28 - i, y, accent_c)
        set_px(px, 3 + i, y, border if i == 0 or i == 12 else accent_c)
        set_px(px, 28 - i, y, border if i == 0 or i == 12 else accent_c)
    # Flap outline
    for i in range(13):
        set_px(px, 3 + i, 8 + i // 2, border)
        set_px(px, 28 - i, 8 + i // 2, border)

    # Address lines
    fill_rect(px, 7, 18, 14, 1, darken(base_c, 0.8))
    fill_rect(px, 7, 21, 10, 1, darken(base_c, 0.8))

    # Stamp (top-right)
    fill_rect(px, 22, 10, 5, 5, stamp_c)
    draw_border(px, 22, 10, 5, 5, darken(stamp_c, 0.5))
    # Stamp detail
    set_px(px, 24, 12, lighten(stamp_c))

    return px

# ═══════════════════════════════════════════════════════
# BOX SPRITES (Cardboard boxes)
# ═══════════════════════════════════════════════════════

BOX_COLORS = [
    '#C4A06E',  # standard cardboard
    '#A0826E',  # brown
    '#D4A960',  # light cardboard
    '#8B6F4E',  # dark brown
    '#B89060',  # tan
]

def gen_box(variant):
    px = new_canvas()
    base = hex_to_rgba(BOX_COLORS[variant])
    dark = darken(base, 0.55)
    light = lighten(base, 1.3)
    tape = hex_to_rgba('#C8B888')

    # Box body (3D perspective)
    fill_rect(px, 4, 6, 24, 22, base)

    # Top face (lighter for 3D)
    fill_rect(px, 4, 6, 24, 5, light)
    draw_line(px, 4, 10, 28, 10, dark)

    # Flap lines on top
    draw_line(px, 16, 6, 16, 10, dark)

    # Side shading (right edge darker)
    fill_rect(px, 25, 6, 3, 22, darken(base, 0.75))

    # Tape strip (vertical center)
    fill_rect(px, 14, 6, 4, 22, tape)
    draw_line(px, 14, 6, 14, 27, darken(tape, 0.7))
    draw_line(px, 17, 6, 17, 27, darken(tape, 0.7))

    # Border
    draw_border(px, 4, 6, 24, 22, dark)

    # Handle cutouts
    fill_rect(px, 8, 15, 4, 2, darken(base, 0.4))
    fill_rect(px, 20, 15, 4, 2, darken(base, 0.4))

    return px

# ═══════════════════════════════════════════════════════
# PARCEL SPRITES (Wrapped packages)
# ═══════════════════════════════════════════════════════

PARCEL_COLORS = [
    ('#8E6AC8', '#FFD700'),  # purple wrap, gold ribbon
    ('#E74C3C', '#FFFFFF'),  # red wrap, white ribbon
    ('#2ECC71', '#E74C3C'),  # green wrap, red ribbon
    ('#3498DB', '#F1C40F'),  # blue wrap, yellow ribbon
    ('#E67E22', '#2ECC71'),  # orange wrap, green ribbon
]

def gen_parcel(variant):
    px = new_canvas()
    wrap_c = hex_to_rgba(PARCEL_COLORS[variant][0])
    ribbon_c = hex_to_rgba(PARCEL_COLORS[variant][1])
    dark = darken(wrap_c, 0.5)

    # Package body
    fill_rect(px, 4, 7, 24, 19, wrap_c)
    draw_border(px, 4, 7, 24, 19, dark)

    # Wrapping paper pattern (subtle diagonal stripes)
    for i in range(0, 32, 4):
        for j in range(19):
            x = 4 + (i + j) % 24
            y = 7 + j
            if 4 <= x < 28 and 7 <= y < 26:
                if (i + j) % 8 < 2:
                    set_px(px, x, y, lighten(wrap_c, 1.15))

    # Ribbon horizontal
    fill_rect(px, 4, 15, 24, 3, ribbon_c)
    draw_line(px, 4, 15, 28, 15, darken(ribbon_c, 0.7))
    draw_line(px, 4, 17, 28, 17, darken(ribbon_c, 0.7))

    # Ribbon vertical
    fill_rect(px, 14, 7, 3, 19, ribbon_c)
    draw_line(px, 14, 7, 14, 26, darken(ribbon_c, 0.7))
    draw_line(px, 16, 7, 16, 26, darken(ribbon_c, 0.7))

    # Bow/knot at intersection
    fill_rect(px, 12, 13, 7, 5, lighten(ribbon_c, 1.2))
    draw_border(px, 12, 13, 7, 5, darken(ribbon_c, 0.6))
    set_px(px, 15, 15, darken(ribbon_c, 0.5))

    return px

# ═══════════════════════════════════════════════════════
# DELICATE SPRITES (Fragile items)
# ═══════════════════════════════════════════════════════

DELICATE_COLORS = [
    ('#F0E0C0', '#E74C3C'),  # cream box, red fragile mark
    ('#E8E8E8', '#FF6B6B'),  # white box, pink mark
    ('#D5E8D4', '#C0392B'),  # light green box, dark red mark
    ('#E0D4F0', '#E74C3C'),  # lavender box, red mark
    ('#F0E8D0', '#FF4444'),  # beige box, bright red mark
]

def gen_delicate(variant):
    px = new_canvas()
    box_c = hex_to_rgba(DELICATE_COLORS[variant][0])
    mark_c = hex_to_rgba(DELICATE_COLORS[variant][1])
    dark = darken(box_c, 0.55)

    # Box body
    fill_rect(px, 4, 6, 24, 22, box_c)
    draw_border(px, 4, 6, 24, 22, dark)

    # Bubble wrap texture (small circles pattern)
    bubble = lighten(box_c, 1.2)
    for by in range(8, 26, 4):
        for bx in range(6, 26, 4):
            set_px(px, bx, by, bubble)
            set_px(px, bx+1, by, bubble)
            set_px(px, bx, by+1, bubble)
            set_px(px, bx+1, by+1, bubble)
            # bubble highlight
            set_px(px, bx, by, lighten(bubble, 1.2))

    # Fragile diamond symbol (center)
    cx, cy = 16, 16
    for dy in range(-4, 5):
        w = 4 - abs(dy)
        for dx in range(-w, w+1):
            set_px(px, cx+dx, cy+dy, mark_c)
    # Inner diamond (lighter)
    for dy in range(-2, 3):
        w = 2 - abs(dy)
        for dx in range(-w, w+1):
            set_px(px, cx+dx, cy+dy, lighten(mark_c, 1.3))

    # Crack lines from diamond
    draw_line(px, cx-4, cy, cx-6, cy-3, mark_c)
    draw_line(px, cx+4, cy, cx+6, cy+3, mark_c)
    draw_line(px, cx, cy-4, cx+2, cy-7, mark_c)

    # "FRAGILE" text area at bottom
    fill_rect(px, 6, 22, 20, 4, hex_to_rgba('#FFFFFF', 200))
    # Small red dots as text placeholder
    for tx in range(8, 24, 2):
        set_px(px, tx, 24, mark_c)

    return px


# ═══════════════════════════════════════════════════════
# GENERATE ALL SPRITES
# ═══════════════════════════════════════════════════════

def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    generators = {
        'letter': gen_letter,
        'box': gen_box,
        'parcel': gen_parcel,
        'delicate': gen_delicate,
    }

    for name, gen_fn in generators.items():
        for v in range(5):
            px = gen_fn(v)
            data = make_png(px, SIZE, SIZE)
            path = os.path.join(OUT_DIR, f'{name}_{v}.png')
            with open(path, 'wb') as f:
                f.write(data)
            print(f'  {name}_{v}.png')

    print(f'\nGenerated {4 * 5} sorting sprites in {OUT_DIR}')

if __name__ == '__main__':
    main()
