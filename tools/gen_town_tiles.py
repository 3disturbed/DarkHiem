#!/usr/bin/env python3
"""
Generate 96x96 autotile PNG sprites for town tiles.
Each texture is a 3x3 grid of 32x32 sub-tiles (same format as generateTileArt.js).
Uses raw PNG encoding (no external deps beyond stdlib).
"""

import struct
import zlib
import os
import math

TILE = 32          # individual sub-tile size
GRID = 3           # 3x3 sub-tile grid
SIZE = TILE * GRID # 96 - full texture size

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tileArt')


# ── Seeded PRNG (matches JS mulberry32 behaviour) ──────────────────────

class SeededRandom:
    def __init__(self, seed):
        self._seed = seed & 0xFFFFFFFF

    def next(self):
        self._seed = (self._seed + 0x6D2B79F5) & 0xFFFFFFFF
        t = self._seed ^ (self._seed >> 15)
        t = (t * (1 | self._seed)) & 0xFFFFFFFF
        t = (t + ((t ^ (t >> 7)) * (61 | t) & 0xFFFFFFFF)) & 0xFFFFFFFF
        t = (t ^ (t >> 14)) & 0xFFFFFFFF
        return t / 4294967296.0


def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(round(v))))


# ── PNG encoder (same approach as generateTileArt.js) ──────────────────

def encode_png(pixels, width, height):
    """Encode RGBA pixel buffer to PNG bytes."""
    raw_rows = []
    for y in range(height):
        row = bytearray([0])  # filter: none
        for x in range(width):
            i = (y * width + x) * 4
            row.extend(pixels[i:i + 4])
        raw_rows.append(bytes(row))
    raw_data = b''.join(raw_rows)
    compressed = zlib.compress(raw_data)

    # PNG signature
    sig = b'\x89PNG\r\n\x1a\n'

    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = _make_chunk(b'IHDR', ihdr_data)

    # IDAT
    idat = _make_chunk(b'IDAT', compressed)

    # IEND
    iend = _make_chunk(b'IEND', b'')

    return sig + ihdr + idat + iend


def _make_chunk(chunk_type, data):
    length = struct.pack('>I', len(data))
    crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xFFFFFFFF)
    return length + chunk_type + data + crc


# ── Edge darkening (matches JS applyEdgeDarkening) ─────────────────────

def apply_edge_darkening(pixels, img_w, ox, oy, ts, col, row):
    open_top = (row == 0)
    open_bottom = (row == 2)
    open_left = (col == 0)
    open_right = (col == 2)

    if not (open_top or open_bottom or open_left or open_right):
        return

    BORDER = 4
    DARKEN = 0.70
    OUTLINE_DARKEN = 0.55

    for y in range(ts):
        for x in range(ts):
            min_dist = ts
            if open_top:
                min_dist = min(min_dist, y)
            if open_bottom:
                min_dist = min(min_dist, ts - 1 - y)
            if open_left:
                min_dist = min(min_dist, x)
            if open_right:
                min_dist = min(min_dist, ts - 1 - x)

            if min_dist < BORDER:
                t = 1.0 - (min_dist / BORDER)
                factor = 1.0 - t * (1.0 - DARKEN)
                if min_dist == 0:
                    factor = OUTLINE_DARKEN

                i = ((oy + y) * img_w + (ox + x)) * 4
                pixels[i] = clamp(pixels[i] * factor)
                pixels[i + 1] = clamp(pixels[i + 1] * factor)
                pixels[i + 2] = clamp(pixels[i + 2] * factor)


# ── Pattern renderers ──────────────────────────────────────────────────

def pattern_wall(pixels, img_w, ox, oy, ts, base, rng):
    """Stone/brick wall with mortar lines and individual brick texturing."""
    br, bg, bb = base

    # Brick layout: rows of bricks with mortar
    brick_h = 6       # brick height in pixels
    mortar_w = 1      # mortar line thickness
    mortar_color_base = (br * 0.55, bg * 0.55, bb * 0.55)

    for y in range(ts):
        for x in range(ts):
            i = ((oy + y) * img_w + (ox + x)) * 4

            brick_row = y // brick_h
            local_y = y % brick_h

            # Offset every other row for staggered brick pattern
            offset = 10 if brick_row % 2 else 0
            brick_x = (x + offset) % ts

            brick_w = 12 + (brick_row % 3) * 2  # vary brick width
            brick_col = brick_x // brick_w
            local_x = brick_x % brick_w

            # Is this pixel a mortar line?
            is_mortar = (local_y < mortar_w) or (local_x < mortar_w)

            if is_mortar:
                r, g, b = mortar_color_base
                n = (rng.next() - 0.5) * 12
                r += n
                g += n
                b += n
            else:
                # Brick body with per-brick color variation
                brick_seed = brick_row * 17 + brick_col * 7
                variation = ((brick_seed * 31) % 30) - 15
                r = br + variation
                g = bg + variation * 0.7
                b = bb + variation * 0.5

                # Subtle noise within brick
                n = (rng.next() - 0.5) * 14
                r += n
                g += n * 0.8
                b += n * 0.6

                # Highlight top edge of brick
                if local_y == mortar_w:
                    r += 12
                    g += 10
                    b += 8

                # Shadow bottom edge of brick
                if local_y == brick_h - 1:
                    r -= 10
                    g -= 8
                    b -= 6

            pixels[i] = clamp(r)
            pixels[i + 1] = clamp(g)
            pixels[i + 2] = clamp(b)
            pixels[i + 3] = 255


def pattern_floor_wood(pixels, img_w, ox, oy, ts, base, rng):
    """Wooden plank floor with grain lines and plank gaps."""
    br, bg, bb = base

    plank_w = 8  # plank width in pixels

    for y in range(ts):
        for x in range(ts):
            i = ((oy + y) * img_w + (ox + x)) * 4

            plank_idx = x // plank_w
            local_x = x % plank_w

            # Per-plank shade variation
            plank_variation = ((plank_idx * 23 + 11) % 20) - 10

            r = br + plank_variation
            g = bg + plank_variation * 0.8
            b = bb + plank_variation * 0.5

            # Wood grain effect (horizontal wavy lines)
            grain = math.sin((y + plank_idx * 7) * 0.6 + plank_idx * 2.1) * 6
            r += grain * 0.8
            g += grain * 0.5
            b += grain * 0.3

            # Subtle noise
            n = (rng.next() - 0.5) * 10
            r += n
            g += n * 0.8
            b += n * 0.5

            # Plank gap (dark line between planks)
            if local_x == 0:
                r -= 30
                g -= 25
                b -= 20

            # Occasional knot
            if rng.next() < 0.003:
                r -= 20
                g -= 15
                b -= 10

            # Subtle plank end joints (horizontal lines at intervals)
            joint_y = (plank_idx * 13 + 5) % 24
            if y == joint_y and local_x > 0:
                r -= 15
                g -= 12
                b -= 8

            pixels[i] = clamp(r)
            pixels[i + 1] = clamp(g)
            pixels[i + 2] = clamp(b)
            pixels[i + 3] = 255


def pattern_floor_stone(pixels, img_w, ox, oy, ts, base, rng):
    """Cobblestone floor with irregular stone shapes and mortar gaps."""
    br, bg, bb = base

    # Generate a voronoi-like stone pattern using precomputed points
    num_stones = 8
    stone_points = []
    stone_rng = SeededRandom(ox * 17 + oy * 31)
    for _ in range(num_stones):
        sx = int(stone_rng.next() * ts)
        sy = int(stone_rng.next() * ts)
        # Per-stone color shift
        shade = (stone_rng.next() - 0.5) * 30
        stone_points.append((sx, sy, shade))

    for y in range(ts):
        for x in range(ts):
            i = ((oy + y) * img_w + (ox + x)) * 4

            # Find nearest and second nearest stone center
            min_d = 999
            min2_d = 999
            nearest_shade = 0.0
            for sx, sy, shade in stone_points:
                dx = x - sx
                dy = y - sy
                d = math.sqrt(dx * dx + dy * dy)
                if d < min_d:
                    min2_d = min_d
                    min_d = d
                    nearest_shade = shade
                elif d < min2_d:
                    min2_d = d

            # Mortar line: where distance to two nearest stones is similar
            mortar_factor = min2_d - min_d
            is_mortar = mortar_factor < 1.8

            if is_mortar:
                r = br * 0.5
                g = bg * 0.5
                b = bb * 0.5
                n = (rng.next() - 0.5) * 8
                r += n
                g += n
                b += n
            else:
                r = br + nearest_shade
                g = bg + nearest_shade * 0.9
                b = bb + nearest_shade * 0.8

                # Subtle noise
                n = (rng.next() - 0.5) * 12
                r += n
                g += n
                b += n

                # Edge highlight near mortar (gives 3D depth)
                if mortar_factor < 3.5:
                    edge_t = 1.0 - (mortar_factor - 1.8) / 1.7
                    r -= edge_t * 8
                    g -= edge_t * 8
                    b -= edge_t * 8

            pixels[i] = clamp(r)
            pixels[i + 1] = clamp(g)
            pixels[i + 2] = clamp(b)
            pixels[i + 3] = 255


def pattern_door(pixels, img_w, ox, oy, ts, base, rng):
    """Wooden door with vertical planks, iron studs, and frame."""
    br, bg, bb = base

    frame_size = 3    # door frame thickness
    plank_w = 7       # door plank width

    for y in range(ts):
        for x in range(ts):
            i = ((oy + y) * img_w + (ox + x)) * 4

            # Door frame (darker wood border)
            is_frame = (x < frame_size or x >= ts - frame_size or
                        y < frame_size or y >= ts - frame_size)

            if is_frame:
                r = br * 0.65
                g = bg * 0.65
                b = bb * 0.65
                n = (rng.next() - 0.5) * 8
                r += n
                g += n * 0.8
                b += n * 0.5
            else:
                # Door interior: vertical planks
                inner_x = x - frame_size
                plank_idx = inner_x // plank_w
                local_x = inner_x % plank_w

                plank_variation = ((plank_idx * 19 + 7) % 16) - 8

                r = br + plank_variation
                g = bg + plank_variation * 0.7
                b = bb + plank_variation * 0.4

                # Vertical wood grain
                grain = math.sin((x + plank_idx * 3) * 0.4) * 5
                r += grain * 0.6
                g += grain * 0.4
                b += grain * 0.2

                # Subtle noise
                n = (rng.next() - 0.5) * 10
                r += n
                g += n * 0.7
                b += n * 0.4

                # Plank gap
                if local_x == 0:
                    r -= 25
                    g -= 20
                    b -= 15

                # Iron studs (small dark circles at plank intersections)
                stud_y1 = ts // 4
                stud_y2 = 3 * ts // 4
                if local_x == plank_w // 2:
                    if abs(y - frame_size - stud_y1) < 2 or abs(y - frame_size - stud_y2) < 2:
                        r = 50
                        g = 50
                        b = 55

                # Door handle (right side, middle)
                center_y = ts // 2
                handle_x = ts - frame_size - 6
                if abs(x - handle_x) < 2 and abs(y - center_y) < 3:
                    r = 70
                    g = 65
                    b = 60

            pixels[i] = clamp(r)
            pixels[i + 1] = clamp(g)
            pixels[i + 2] = clamp(b)
            pixels[i + 3] = 255


def pattern_market_stall(pixels, img_w, ox, oy, ts, base, rng):
    """Market ground: packed earth/stone with scattered colorful accents."""
    br, bg, bb = base

    for y in range(ts):
        for x in range(ts):
            i = ((oy + y) * img_w + (ox + x)) * 4

            # Base ground with warm noise
            n = (rng.next() - 0.5) * 22
            r = br + n * 0.9
            g = bg + n * 0.8
            b = bb + n * 0.5

            # Subtle stone-like pattern
            grid_x = x % 10
            grid_y = y % 10
            if grid_x == 0 or grid_y == 0:
                r -= 8
                g -= 7
                b -= 5

            # Scattered colorful market hints (fabric/goods on ground)
            rv = rng.next()
            if rv < 0.01:
                # Red fabric
                r = 160 + rng.next() * 40
                g = 40 + rng.next() * 20
                b = 30 + rng.next() * 20
            elif rv < 0.018:
                # Blue cloth
                r = 40 + rng.next() * 20
                g = 60 + rng.next() * 30
                b = 140 + rng.next() * 40
            elif rv < 0.025:
                # Green produce
                r = 50 + rng.next() * 20
                g = 120 + rng.next() * 40
                b = 40 + rng.next() * 20
            elif rv < 0.04:
                # Straw/hay
                r = br + 30
                g = bg + 25
                b = bb - 10

            pixels[i] = clamp(r)
            pixels[i + 1] = clamp(g)
            pixels[i + 2] = clamp(b)
            pixels[i + 3] = 255


# ── Tile definitions ───────────────────────────────────────────────────

TOWN_TILES = {
    'wall':         {'color': (85, 102, 119),  'pattern': pattern_wall},
    'floor_wood':   {'color': (139, 115, 85),  'pattern': pattern_floor_wood},
    'floor_stone':  {'color': (112, 112, 112), 'pattern': pattern_floor_stone},
    'door':         {'color': (107, 66, 38),   'pattern': pattern_door},
    'market_stall': {'color': (196, 163, 90),  'pattern': pattern_market_stall},
}


# ── Main generation ───────────────────────────────────────────────────

def generate_tile(name, definition):
    pixels = bytearray(SIZE * SIZE * 4)
    color = definition['color']
    pattern_fn = definition['pattern']

    for row in range(GRID):
        for col in range(GRID):
            seed = len(name) * 1337 + ord(name[0]) * 7 + row * 3 + col
            rng = SeededRandom(seed)

            ox = col * TILE
            oy = row * TILE

            pattern_fn(pixels, SIZE, ox, oy, TILE, color, rng)
            apply_edge_darkening(pixels, SIZE, ox, oy, TILE, col, row)

    return encode_png(pixels, SIZE, SIZE)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    count = 0
    for name, definition in TOWN_TILES.items():
        png_data = generate_tile(name, definition)
        path = os.path.join(OUT_DIR, f'{name}.png')
        with open(path, 'wb') as f:
            f.write(png_data)
        print(f'  {name}.png ({len(png_data)} bytes)')
        count += 1

    print(f'\nGenerated {count} town autotile sprites ({SIZE}x{SIZE}) in {os.path.abspath(OUT_DIR)}')


if __name__ == '__main__':
    main()
