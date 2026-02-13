#!/usr/bin/env python3
"""Generate grayscale player base sprite as 32x32 PNG using only stdlib."""

import struct, zlib, os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'tileArt')
SIZE = 32

TRANSPARENT = (0,0,0,0)

def gray(v, a=255):
    return (v, v, v, a)

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

def fill_circle(px, cx, cy, r, c):
    for y in range(-r, r+1):
        for x in range(-r, r+1):
            if x*x + y*y <= r*r:
                set_px(px, cx+x, cy+y, c)

# ─── Color constants (all grayscale for client-side tinting) ───
OUTLINE       = gray(65)       # dark gray outline - tintable
BODY          = gray(165)      # medium gray main body
BODY_LIGHT    = gray(210)      # highlight on top/left edges
BODY_SHADOW   = gray(115)      # shadow on bottom/right edges
SKIN          = gray(200)      # light gray face/skin
SKIN_SHADOW   = gray(160)      # face shadow
EYE           = gray(40)       # very dark eyes
HAIR          = gray(100)      # dark gray hair
BELT          = gray(90)       # dark belt/armor accent
BELT_BUCKLE   = gray(220)      # bright buckle highlight
BOOT          = gray(80)       # dark boots
BOOT_LIGHT    = gray(110)      # boot highlight
SWORD_BLADE   = gray(210)      # bright sword blade
SWORD_GUARD   = gray(140)      # sword crossguard
SWORD_GRIP    = gray(100)      # sword handle
WHITE_SHINE   = gray(245)      # near-white specular highlight
PAULDRON      = gray(140)      # shoulder armor
PAULDRON_LIGHT= gray(185)      # shoulder armor highlight


def gen_player():
    px = new_canvas()

    # =====================================================================
    # The player sprite: a front-facing heroic adventurer/warrior
    # Centered in the 32x32 canvas.  Approximately 16px wide, 24px tall.
    # Layout (y from top):
    #   y  3-4   : Hair top
    #   y  5-10  : Head (round, 8px wide including outline)
    #   y 11     : Neck
    #   y 12-13  : Shoulders / pauldrons
    #   y 14-20  : Torso (with armor detail, belt at y19-20)
    #   y 21-24  : Legs (two separate columns)
    #   y 25-27  : Boots
    #   Arms:     hang at sides of torso (x 7-8 left, x 23-24 right)
    #   Sword:    at right side, x 25-27
    # =====================================================================

    # Center x = 16 (0-indexed, so columns 8..23 for a 16px wide figure)
    # But head is narrower, torso medium, etc.

    # ─── HAIR (top of head, y=3-5) ───
    # Hair pokes above the head outline
    fill_rect(px, 12, 3, 8, 2, HAIR)           # hair block
    set_px(px, 11, 4, HAIR)                      # left hair wisp
    set_px(px, 20, 4, HAIR)                      # right hair wisp

    # ─── HEAD (y=5..10, centered, ~8px wide) ───
    # Head outline
    fill_rect(px, 12, 5, 8, 1, OUTLINE)         # top edge
    fill_rect(px, 12, 10, 8, 1, OUTLINE)        # bottom edge (chin)
    fill_rect(px, 11, 5, 1, 6, OUTLINE)         # left edge
    fill_rect(px, 20, 5, 1, 6, OUTLINE)         # right edge
    # Rounded corners
    set_px(px, 11, 5, OUTLINE)
    set_px(px, 20, 5, OUTLINE)
    set_px(px, 11, 10, OUTLINE)
    set_px(px, 20, 10, OUTLINE)

    # Face fill (skin)
    fill_rect(px, 12, 6, 8, 4, SKIN)
    # Face shadow on right side
    fill_rect(px, 18, 6, 2, 4, SKIN_SHADOW)
    # Hair over forehead
    fill_rect(px, 12, 5, 8, 1, HAIR)

    # Eyes (y=7, symmetric around center x=15.5)
    set_px(px, 13, 7, EYE)                      # left eye
    set_px(px, 14, 7, EYE)
    set_px(px, 17, 7, EYE)                      # right eye
    set_px(px, 18, 7, EYE)

    # Eye highlights (tiny white dot top-left of each eye)
    set_px(px, 13, 7, gray(70))                  # slight highlight
    set_px(px, 17, 7, gray(70))

    # Mouth / expression line
    set_px(px, 15, 9, gray(150))
    set_px(px, 16, 9, gray(150))

    # Ear hints
    set_px(px, 11, 7, SKIN_SHADOW)
    set_px(px, 20, 7, SKIN_SHADOW)

    # ─── NECK (y=11) ───
    fill_rect(px, 14, 11, 4, 1, SKIN_SHADOW)

    # ─── SHOULDERS / PAULDRONS (y=12-13) ───
    # Left pauldron
    fill_rect(px, 8, 12, 4, 2, PAULDRON)
    fill_rect(px, 8, 12, 4, 1, PAULDRON_LIGHT)  # top highlight
    set_px(px, 8, 12, OUTLINE)                    # outer edge
    set_px(px, 8, 13, OUTLINE)
    # Right pauldron
    fill_rect(px, 20, 12, 4, 2, PAULDRON)
    fill_rect(px, 20, 12, 4, 1, PAULDRON_LIGHT)
    set_px(px, 23, 12, OUTLINE)
    set_px(px, 23, 13, OUTLINE)

    # ─── TORSO (y=12-20) ───
    # Main torso body
    fill_rect(px, 10, 12, 12, 8, BODY)

    # Torso outline
    fill_rect(px, 10, 12, 1, 8, OUTLINE)        # left edge
    fill_rect(px, 21, 12, 1, 8, OUTLINE)        # right edge
    fill_rect(px, 10, 12, 12, 1, OUTLINE)       # top edge (shoulder line)
    # Connect shoulders to head
    fill_rect(px, 12, 12, 8, 1, BODY_LIGHT)     # inner shoulder area

    # Torso fill with shading
    fill_rect(px, 11, 13, 5, 6, BODY_LIGHT)     # left-side highlight
    fill_rect(px, 16, 13, 5, 6, BODY)           # right-side base
    fill_rect(px, 19, 15, 2, 4, BODY_SHADOW)    # right shadow

    # Chest armor detail / tunic V-neck
    set_px(px, 15, 13, OUTLINE)
    set_px(px, 16, 13, OUTLINE)
    set_px(px, 14, 14, OUTLINE)
    set_px(px, 17, 14, OUTLINE)
    # Neckline fill
    set_px(px, 15, 14, SKIN_SHADOW)
    set_px(px, 16, 14, SKIN_SHADOW)

    # Armor / chest plate highlight
    set_px(px, 13, 15, WHITE_SHINE)              # specular glint
    set_px(px, 14, 15, BODY_LIGHT)
    set_px(px, 13, 16, BODY_LIGHT)

    # ─── BELT (y=19-20) ───
    fill_rect(px, 10, 19, 12, 2, BELT)
    fill_rect(px, 10, 19, 12, 1, gray(100))     # top belt edge slightly lighter
    # Belt buckle (center)
    fill_rect(px, 15, 19, 2, 2, BELT_BUCKLE)
    set_px(px, 15, 20, gray(200))                # buckle shadow
    set_px(px, 16, 20, gray(200))

    # ─── ARMS (y=14-19, hanging at sides) ───
    # Left arm
    fill_rect(px, 8, 14, 2, 6, BODY)
    fill_rect(px, 8, 14, 1, 6, BODY_LIGHT)      # outer highlight
    fill_rect(px, 8, 14, 2, 1, OUTLINE)          # top
    fill_rect(px, 7, 14, 1, 6, OUTLINE)          # outer edge
    fill_rect(px, 8, 20, 2, 1, OUTLINE)          # bottom
    # Left hand
    fill_rect(px, 8, 20, 2, 1, SKIN)
    set_px(px, 7, 20, OUTLINE)

    # Right arm
    fill_rect(px, 22, 14, 2, 6, BODY)
    fill_rect(px, 23, 14, 1, 6, BODY_SHADOW)    # shadow side
    fill_rect(px, 22, 14, 2, 1, OUTLINE)         # top
    fill_rect(px, 24, 14, 1, 6, OUTLINE)         # outer edge
    fill_rect(px, 22, 20, 2, 1, OUTLINE)         # bottom
    # Right hand
    fill_rect(px, 22, 20, 2, 1, SKIN)
    set_px(px, 24, 20, OUTLINE)

    # ─── LEGS (y=21-25, two separate columns with gap) ───
    # Left leg
    fill_rect(px, 11, 21, 4, 4, BODY)
    fill_rect(px, 11, 21, 1, 4, BODY_LIGHT)     # inner highlight
    fill_rect(px, 14, 21, 1, 4, BODY_SHADOW)    # shadow edge
    fill_rect(px, 10, 21, 1, 5, OUTLINE)        # outer left edge
    fill_rect(px, 15, 21, 1, 5, OUTLINE)        # inner right edge

    # Right leg
    fill_rect(px, 17, 21, 4, 4, BODY)
    fill_rect(px, 17, 21, 1, 4, BODY_LIGHT)     # highlight edge
    fill_rect(px, 20, 21, 1, 4, BODY_SHADOW)
    fill_rect(px, 16, 21, 1, 5, OUTLINE)        # inner left edge
    fill_rect(px, 21, 21, 1, 5, OUTLINE)        # outer right edge

    # Crotch / gap between legs
    set_px(px, 15, 21, OUTLINE)
    set_px(px, 16, 21, OUTLINE)

    # ─── BOOTS (y=25-27) ───
    # Left boot
    fill_rect(px, 10, 25, 6, 3, BOOT)
    fill_rect(px, 10, 25, 6, 1, BOOT_LIGHT)     # top edge highlight
    fill_rect(px, 10, 25, 1, 3, BOOT_LIGHT)     # left highlight
    fill_rect(px, 9, 27, 1, 1, OUTLINE)          # toe
    fill_rect(px, 10, 27, 6, 1, OUTLINE)         # sole outline
    set_px(px, 9, 26, OUTLINE)
    set_px(px, 9, 25, OUTLINE)
    set_px(px, 15, 25, OUTLINE)
    set_px(px, 15, 26, OUTLINE)

    # Right boot
    fill_rect(px, 16, 25, 6, 3, BOOT)
    fill_rect(px, 16, 25, 6, 1, BOOT_LIGHT)
    fill_rect(px, 16, 25, 1, 3, BOOT_LIGHT)
    fill_rect(px, 22, 27, 1, 1, OUTLINE)         # toe
    fill_rect(px, 16, 27, 6, 1, OUTLINE)         # sole outline
    set_px(px, 22, 26, OUTLINE)
    set_px(px, 22, 25, OUTLINE)
    set_px(px, 16, 25, OUTLINE)
    set_px(px, 16, 26, OUTLINE)

    # ─── SWORD (right side, y=10..24) ───
    # Sword hangs from belt on the right side, blade pointing down
    # Grip / pommel (above belt)
    set_px(px, 25, 16, SWORD_GRIP)
    set_px(px, 25, 17, SWORD_GRIP)
    # Pommel knob
    set_px(px, 25, 15, gray(130))

    # Crossguard (at belt level)
    fill_rect(px, 24, 18, 3, 1, SWORD_GUARD)
    set_px(px, 24, 18, gray(160))                # guard highlight

    # Blade (below belt, pointing down)
    set_px(px, 25, 19, SWORD_BLADE)
    set_px(px, 25, 20, SWORD_BLADE)
    set_px(px, 25, 21, SWORD_BLADE)
    set_px(px, 25, 22, SWORD_BLADE)
    set_px(px, 25, 23, SWORD_BLADE)
    set_px(px, 25, 24, SWORD_BLADE)
    set_px(px, 25, 25, gray(190))                # tip slightly darker

    # Blade edge highlight (left side of blade)
    set_px(px, 24, 19, gray(230))
    set_px(px, 24, 20, gray(230))
    set_px(px, 24, 21, gray(230))
    set_px(px, 24, 22, gray(220))
    set_px(px, 24, 23, gray(200))
    set_px(px, 24, 24, gray(180))

    # Blade point
    set_px(px, 25, 26, gray(170))

    # Blade right edge (shadow)
    set_px(px, 26, 19, gray(170))
    set_px(px, 26, 20, gray(170))
    set_px(px, 26, 21, gray(160))
    set_px(px, 26, 22, gray(150))
    set_px(px, 26, 23, gray(140))

    # ─── FINAL OUTLINE PASS ───
    # Ensure a clean outline around the head top
    for x in range(12, 20):
        set_px(px, x, 3, OUTLINE)               # top of hair
    set_px(px, 11, 4, OUTLINE)
    set_px(px, 20, 4, OUTLINE)
    # Hair fill (between outline and face)
    fill_rect(px, 12, 4, 8, 1, HAIR)

    # Head side outline
    set_px(px, 11, 5, OUTLINE)
    set_px(px, 11, 6, OUTLINE)
    set_px(px, 11, 7, OUTLINE)
    set_px(px, 11, 8, OUTLINE)
    set_px(px, 11, 9, OUTLINE)
    set_px(px, 11, 10, OUTLINE)
    set_px(px, 20, 5, OUTLINE)
    set_px(px, 20, 6, OUTLINE)
    set_px(px, 20, 7, OUTLINE)
    set_px(px, 20, 8, OUTLINE)
    set_px(px, 20, 9, OUTLINE)
    set_px(px, 20, 10, OUTLINE)

    # Chin outline
    for x in range(12, 20):
        set_px(px, x, 10, OUTLINE)

    # Specular highlight on top of head/hair
    set_px(px, 14, 4, gray(130))
    set_px(px, 15, 4, gray(130))

    return px


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    pixels = gen_player()
    png_data = make_png(pixels, SIZE, SIZE)
    path = os.path.join(OUT_DIR, 'player.png')
    with open(path, 'wb') as f:
        f.write(png_data)
    print(f'  player.png ({len(png_data)} bytes)')
    print(f'Generated player sprite in {os.path.abspath(OUT_DIR)}')

if __name__ == '__main__':
    main()
