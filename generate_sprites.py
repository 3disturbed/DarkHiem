#!/usr/bin/env python3
"""Generate missing 32x32 pixel-art sprites using pure Python (no PIL needed)."""

import struct
import zlib
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'tileArt', 'items')

def make_png(pixels):
    """Create a 32x32 RGBA PNG from a 2D pixel array.
    pixels: list of 32 rows, each row is list of 32 (r,g,b,a) tuples.
    """
    width, height = 32, 32

    def chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

    raw = b''
    for row in pixels:
        raw += b'\x00'  # filter byte
        for r, g, b, a in row:
            raw += struct.pack('BBBB', r, g, b, a)

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA
    return (
        b'\x89PNG\r\n\x1a\n' +
        chunk(b'IHDR', ihdr) +
        chunk(b'IDAT', zlib.compress(raw)) +
        chunk(b'IEND', b'')
    )


def blank():
    return [[(0, 0, 0, 0)] * 32 for _ in range(32)]


def set_pixel(pixels, x, y, color):
    if 0 <= x < 32 and 0 <= y < 32:
        pixels[y][x] = color


def fill_rect(pixels, x, y, w, h, color):
    for dy in range(h):
        for dx in range(w):
            set_pixel(pixels, x + dx, y + dy, color)


def outline_rect(pixels, x, y, w, h, color):
    for dx in range(w):
        set_pixel(pixels, x + dx, y, color)
        set_pixel(pixels, x + dx, y + h - 1, color)
    for dy in range(h):
        set_pixel(pixels, x, y + dy, color)
        set_pixel(pixels, x + w - 1, y + dy, color)


def draw_line(pixels, x0, y0, x1, y1, color):
    dx = abs(x1 - x0)
    dy = abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy
    while True:
        set_pixel(pixels, x0, y0, color)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x0 += sx
        if e2 < dx:
            err += dx
            y0 += sy


def fill_ellipse(pixels, cx, cy, rx, ry, color):
    for y in range(-ry, ry + 1):
        for x in range(-rx, rx + 1):
            if rx > 0 and ry > 0:
                if (x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.0:
                    set_pixel(pixels, cx + x, cy + y, color)


# ─── Sprite Definitions ───────────────────────────────────────

def make_smoked_fish(body_color, accent_color, stripe_color=None):
    """Generic smoked fish sprite - horizontal fish with smoke lines."""
    p = blank()
    outline = (40, 30, 20, 255)
    # Body (horizontal fish shape)
    fill_rect(p, 8, 13, 16, 6, body_color)
    fill_rect(p, 10, 12, 12, 8, body_color)
    # Head
    fill_rect(p, 22, 14, 3, 4, body_color)
    set_pixel(p, 24, 15, outline)  # eye
    # Tail
    fill_rect(p, 5, 12, 3, 2, accent_color)
    fill_rect(p, 5, 18, 3, 2, accent_color)
    fill_rect(p, 6, 14, 2, 4, accent_color)
    # Belly highlight
    fill_rect(p, 10, 18, 10, 1, (min(body_color[0]+30, 255), min(body_color[1]+30, 255), min(body_color[2]+10, 255), 255))
    # Optional stripe
    if stripe_color:
        fill_rect(p, 10, 15, 12, 1, stripe_color)
    # Smoke lines above
    smoke = (180, 170, 160, 120)
    for i, sx in enumerate([12, 16, 20]):
        for dy in range(3):
            set_pixel(p, sx + (i % 2), 9 - dy * 2, smoke)
            set_pixel(p, sx + 1 - (i % 2), 8 - dy * 2, smoke)
    # Outline
    outline_rect(p, 7, 11, 18, 10, outline)
    return p


def make_cage(bar_color, frame_color, accent):
    """Cage sprite - rectangular cage with vertical bars."""
    p = blank()
    # Frame
    fill_rect(p, 6, 6, 20, 2, frame_color)
    fill_rect(p, 6, 24, 20, 2, frame_color)
    fill_rect(p, 6, 6, 2, 20, frame_color)
    fill_rect(p, 24, 6, 2, 20, frame_color)
    # Bars
    for bx in [10, 14, 18, 22]:
        fill_rect(p, bx, 8, 1, 16, bar_color)
    # Door latch
    fill_rect(p, 12, 14, 3, 3, accent)
    # Outline
    outline_rect(p, 5, 5, 22, 22, (30, 25, 20, 255))
    return p


def make_pet_salve():
    """Healing salve jar - small green pot."""
    p = blank()
    outline = (30, 50, 30, 255)
    jar = (80, 160, 80, 255)
    jar_light = (110, 190, 100, 255)
    lid = (100, 80, 60, 255)
    # Jar body
    fill_rect(p, 10, 14, 12, 10, jar)
    fill_rect(p, 11, 13, 10, 12, jar)
    # Highlight
    fill_rect(p, 12, 15, 3, 6, jar_light)
    # Lid
    fill_rect(p, 9, 11, 14, 3, lid)
    fill_rect(p, 11, 10, 10, 1, lid)
    # Cross symbol (healing)
    cross = (220, 240, 220, 255)
    fill_rect(p, 15, 17, 2, 5, cross)
    fill_rect(p, 13, 19, 6, 1, cross)
    # Outline
    outline_rect(p, 9, 10, 14, 15, outline)
    return p


def make_pet_feast():
    """Pet feast - bowl of food."""
    p = blank()
    outline = (50, 35, 20, 255)
    bowl = (140, 100, 60, 255)
    bowl_light = (170, 130, 80, 255)
    food = (180, 80, 40, 255)
    food2 = (120, 160, 60, 255)
    # Bowl
    fill_rect(p, 8, 18, 16, 6, bowl)
    fill_rect(p, 7, 17, 18, 2, bowl_light)
    fill_rect(p, 9, 24, 14, 2, bowl)
    # Food mound
    fill_ellipse(p, 16, 16, 7, 3, food)
    fill_ellipse(p, 14, 15, 4, 2, food2)
    # Bowl rim highlight
    fill_rect(p, 8, 17, 16, 1, (190, 150, 100, 255))
    # Steam
    smoke = (200, 200, 200, 100)
    for sx in [12, 16, 20]:
        set_pixel(p, sx, 11, smoke)
        set_pixel(p, sx + 1, 10, smoke)
        set_pixel(p, sx, 9, smoke)
    # Outline
    outline_rect(p, 6, 16, 20, 11, outline)
    return p


def make_trainer_whistle():
    """Training whistle - small metal whistle."""
    p = blank()
    outline = (40, 40, 50, 255)
    metal = (180, 180, 200, 255)
    metal_light = (220, 220, 235, 255)
    metal_dark = (120, 120, 140, 255)
    # Whistle body (angled)
    fill_rect(p, 8, 14, 14, 5, metal)
    fill_rect(p, 9, 13, 12, 7, metal)
    # Mouthpiece
    fill_rect(p, 22, 15, 4, 3, metal_dark)
    # Highlight
    fill_rect(p, 10, 14, 8, 1, metal_light)
    # Sound hole
    set_pixel(p, 9, 16, (50, 50, 60, 255))
    set_pixel(p, 10, 16, (50, 50, 60, 255))
    # Ring/lanyard hole
    fill_rect(p, 6, 15, 2, 3, metal_dark)
    set_pixel(p, 7, 16, (0, 0, 0, 0))
    # String
    cord = (120, 80, 40, 255)
    draw_line(p, 5, 16, 5, 22, cord)
    draw_line(p, 5, 22, 8, 25, cord)
    # Outline
    outline_rect(p, 7, 12, 20, 9, outline)
    return p


def make_mail_package():
    """Mail package - brown wrapped parcel."""
    p = blank()
    outline = (50, 35, 20, 255)
    paper = (180, 150, 100, 255)
    paper_light = (200, 170, 120, 255)
    string = (120, 80, 40, 255)
    # Box shape
    fill_rect(p, 7, 10, 18, 14, paper)
    fill_rect(p, 8, 9, 16, 16, paper)
    # Light side
    fill_rect(p, 8, 10, 8, 14, paper_light)
    # String cross
    fill_rect(p, 15, 9, 2, 16, string)
    fill_rect(p, 8, 16, 16, 2, string)
    # Bow at center
    fill_rect(p, 13, 14, 6, 4, string)
    set_pixel(p, 14, 15, paper)
    set_pixel(p, 17, 15, paper)
    # Outline
    outline_rect(p, 6, 8, 20, 17, outline)
    return p


def make_collection_parcel():
    """Collection parcel - envelope with stamp."""
    p = blank()
    outline = (60, 50, 40, 255)
    envelope = (220, 200, 160, 255)
    flap = (200, 180, 140, 255)
    stamp = (180, 50, 50, 255)
    # Envelope body
    fill_rect(p, 6, 12, 20, 12, envelope)
    # Flap (triangle-ish top)
    for i in range(6):
        fill_rect(p, 6 + i, 12 - i, 20 - 2 * i, 1, flap)
    # Stamp
    fill_rect(p, 20, 14, 4, 4, stamp)
    fill_rect(p, 21, 15, 2, 2, (220, 80, 80, 255))
    # Address lines
    line_color = (140, 130, 110, 255)
    fill_rect(p, 9, 17, 10, 1, line_color)
    fill_rect(p, 9, 19, 8, 1, line_color)
    fill_rect(p, 9, 21, 6, 1, line_color)
    # Outline
    outline_rect(p, 5, 6, 22, 19, outline)
    return p


# ─── Main ─────────────────────────────────────────────────────

SPRITES = {
    # Smoked fish variants
    'smoked_bass': lambda: make_smoked_fish(
        (160, 120, 70, 255), (130, 100, 50, 255), (140, 110, 60, 255)),
    'smoked_carp': lambda: make_smoked_fish(
        (170, 130, 60, 255), (140, 110, 40, 255)),
    'smoked_eel': lambda: make_smoked_fish(
        (100, 90, 70, 255), (80, 70, 50, 255), (120, 100, 60, 255)),
    'smoked_lava_eel': lambda: make_smoked_fish(
        (140, 60, 30, 255), (110, 40, 20, 255), (180, 80, 30, 255)),
    'smoked_pike': lambda: make_smoked_fish(
        (130, 130, 80, 255), (110, 110, 60, 255), (150, 140, 90, 255)),
    'smoked_salmon': lambda: make_smoked_fish(
        (200, 120, 80, 255), (170, 100, 60, 255), (220, 140, 90, 255)),
    'smoked_trout': lambda: make_smoked_fish(
        (170, 140, 90, 255), (140, 120, 70, 255)),

    # Cages
    'wooden_cage': lambda: make_cage(
        (140, 100, 50, 255), (100, 70, 35, 255), (160, 120, 60, 255)),
    'iron_cage': lambda: make_cage(
        (160, 160, 170, 255), (120, 120, 130, 255), (200, 200, 210, 255)),
    'obsidian_cage': lambda: make_cage(
        (60, 50, 70, 255), (40, 30, 50, 255), (100, 60, 120, 255)),

    # Pet items
    'pet_salve': make_pet_salve,
    'pet_feast': make_pet_feast,
    'trainer_whistle': make_trainer_whistle,

    # Mail items
    'mail_package': make_mail_package,
    'collection_parcel': make_collection_parcel,
}


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    generated = []
    skipped = []

    for name, gen_func in SPRITES.items():
        path = os.path.join(OUTPUT_DIR, f'{name}.png')
        if os.path.exists(path):
            skipped.append(name)
            continue

        pixels = gen_func()
        png_data = make_png(pixels)
        with open(path, 'wb') as f:
            f.write(png_data)
        generated.append(name)
        print(f'  Generated: {name}.png ({len(png_data)} bytes)')

    print(f'\nDone! Generated {len(generated)} sprites, skipped {len(skipped)} existing.')
    if skipped:
        print(f'  Skipped: {", ".join(skipped)}')


if __name__ == '__main__':
    main()
