#!/usr/bin/env python3
"""Generate pixel-art enemy sprites as 32x32 PNGs using only stdlib."""

import struct, zlib, os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'tileArt', 'enemies')
SIZE = 32

def hex_to_rgba(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2],16), int(h[2:4],16), int(h[4:6],16), a)

def darken(c, f=0.65):
    return (int(c[0]*f), int(c[1]*f), int(c[2]*f), c[3])

def lighten(c, f=1.4):
    return (min(255,int(c[0]*f)), min(255,int(c[1]*f)), min(255,int(c[2]*f)), c[3])

def blend(c1, c2, t):
    return (int(c1[0]*(1-t)+c2[0]*t), int(c1[1]*(1-t)+c2[1]*t), int(c1[2]*(1-t)+c2[2]*t), int(c1[3]*(1-t)+c2[3]*t))

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

def draw_border(px, x, y, w, h, c):
    for dx in range(w):
        if 0 <= y < len(px) and 0 <= x+dx < len(px[0]):
            px[y][x+dx] = c
        if 0 <= y+h-1 < len(px) and 0 <= x+dx < len(px[0]):
            px[y+h-1][x+dx] = c
    for dy in range(h):
        if 0 <= y+dy < len(px) and 0 <= x < len(px[0]):
            px[y+dy][x] = c
        if 0 <= y+dy < len(px) and 0 <= x+w-1 < len(px[0]):
            px[y+dy][x+w-1] = c

def set_px(px, x, y, c):
    if 0 <= y < len(px) and 0 <= x < len(px[0]):
        px[y][x] = c

def fill_circle(px, cx, cy, r, c):
    for y in range(-r, r+1):
        for x in range(-r, r+1):
            if x*x + y*y <= r*r:
                set_px(px, cx+x, cy+y, c)


# ========================================================================
# MEADOW ENEMIES
# ========================================================================

# --- 1. GREYLING: small grey imp-like humanoid ---
def gen_greyling():
    px = new_canvas()
    body = hex_to_rgba('#7f8c8d')
    body_dk = darken(body)
    body_lt = lighten(body)
    eye = hex_to_rgba('#ffcc00')

    # Head (round)
    fill_circle(px, 16, 9, 4, body)
    fill_circle(px, 16, 9, 3, body_lt)
    # Pointy ears
    set_px(px, 11, 6, body)
    set_px(px, 11, 5, body)
    set_px(px, 21, 6, body)
    set_px(px, 21, 5, body)
    # Eyes (glowing yellow)
    set_px(px, 14, 8, eye)
    set_px(px, 18, 8, eye)
    # Mouth
    set_px(px, 15, 11, body_dk)
    set_px(px, 16, 11, body_dk)
    set_px(px, 17, 11, body_dk)

    # Torso (thin, hunched)
    fill_rect(px, 14, 13, 5, 7, body)
    fill_rect(px, 14, 13, 2, 7, body_lt)
    fill_rect(px, 17, 13, 2, 7, body_dk)

    # Arms (thin, dangling)
    fill_rect(px, 11, 14, 3, 2, body)
    fill_rect(px, 10, 16, 2, 4, body)
    fill_rect(px, 19, 14, 3, 2, body)
    fill_rect(px, 20, 16, 2, 4, body_dk)

    # Clawed hands
    set_px(px, 9, 20, body_dk)
    set_px(px, 10, 20, body_dk)
    set_px(px, 21, 20, body_dk)
    set_px(px, 22, 20, body_dk)

    # Legs (short, stubby)
    fill_rect(px, 13, 20, 3, 5, body_dk)
    fill_rect(px, 17, 20, 3, 5, body_dk)
    # Feet
    fill_rect(px, 12, 25, 4, 2, body_dk)
    fill_rect(px, 17, 25, 4, 2, body_dk)

    return px


# --- 2. BOAR: wild boar with tusks ---
def gen_boar():
    px = new_canvas()
    body = hex_to_rgba('#6d4c41')
    body_dk = darken(body)
    body_lt = lighten(body)
    tusk = hex_to_rgba('#f5f5dc')
    eye = hex_to_rgba('#111111')
    snout = hex_to_rgba('#c4956a')

    # Body (horizontal, stocky)
    fill_rect(px, 6, 14, 20, 10, body)
    fill_rect(px, 6, 14, 20, 3, body_lt)   # back highlight
    fill_rect(px, 6, 21, 20, 3, body_dk)   # belly shadow

    # Bristly back (spiky ridge)
    for x in range(8, 24, 2):
        set_px(px, x, 13, body_dk)
        set_px(px, x+1, 12, body_dk)

    # Head (front, left side is the face)
    fill_rect(px, 3, 13, 6, 9, body)
    fill_rect(px, 3, 13, 6, 3, body_lt)
    # Snout
    fill_rect(px, 1, 17, 4, 4, snout)
    fill_rect(px, 1, 17, 4, 1, lighten(snout))
    # Nostrils
    set_px(px, 2, 19, body_dk)
    set_px(px, 3, 19, body_dk)
    # Eye
    set_px(px, 5, 15, eye)
    set_px(px, 6, 15, eye)
    # Ear
    fill_rect(px, 6, 11, 3, 3, body)
    set_px(px, 7, 10, body_dk)

    # Tusks (white, curving up)
    set_px(px, 2, 21, tusk)
    set_px(px, 1, 20, tusk)
    set_px(px, 1, 19, tusk)
    set_px(px, 4, 21, tusk)
    set_px(px, 5, 20, tusk)

    # Legs (4 short legs)
    fill_rect(px, 7, 24, 3, 4, body_dk)
    fill_rect(px, 12, 24, 3, 4, body_dk)
    fill_rect(px, 18, 24, 3, 4, body_dk)
    fill_rect(px, 23, 24, 3, 4, body_dk)
    # Hooves
    fill_rect(px, 7, 27, 3, 1, hex_to_rgba('#333333'))
    fill_rect(px, 12, 27, 3, 1, hex_to_rgba('#333333'))
    fill_rect(px, 18, 27, 3, 1, hex_to_rgba('#333333'))
    fill_rect(px, 23, 27, 3, 1, hex_to_rgba('#333333'))

    # Tail
    set_px(px, 26, 14, body_dk)
    set_px(px, 27, 13, body_dk)
    set_px(px, 28, 13, body_dk)

    return px


# --- 3. MEADOW SKELETON: walking skeleton with bones visible ---
def gen_meadow_skeleton():
    px = new_canvas()
    bone = hex_to_rgba('#ecf0f1')
    bone_dk = darken(bone, 0.75)
    bone_lt = lighten(bone)
    eye = hex_to_rgba('#ff3333')

    # Skull
    fill_rect(px, 12, 3, 8, 7, bone)
    fill_rect(px, 13, 2, 6, 1, bone)       # top of skull
    fill_rect(px, 12, 3, 8, 2, bone_lt)    # forehead highlight
    # Eye sockets (dark red glow)
    set_px(px, 14, 5, hex_to_rgba('#111111'))
    set_px(px, 18, 5, hex_to_rgba('#111111'))
    set_px(px, 14, 6, eye)
    set_px(px, 18, 6, eye)
    # Nose hole
    set_px(px, 16, 7, bone_dk)
    # Jaw / teeth
    fill_rect(px, 13, 9, 6, 2, bone_dk)
    for x in range(13, 19):
        set_px(px, x, 9, bone if x % 2 == 0 else bone_dk)

    # Spine
    for y in range(11, 20):
        set_px(px, 16, y, bone)
        set_px(px, 15, y, bone_dk if y % 2 == 0 else TRANSPARENT)
        set_px(px, 17, y, bone_dk if y % 2 == 0 else TRANSPARENT)

    # Ribcage
    for dy in range(0, 6, 2):
        fill_rect(px, 12, 12+dy, 3, 1, bone)
        fill_rect(px, 17, 12+dy, 3, 1, bone)

    # Pelvis
    fill_rect(px, 12, 19, 8, 2, bone_dk)
    fill_rect(px, 13, 19, 6, 1, bone)

    # Left arm
    fill_rect(px, 10, 12, 2, 2, bone)
    fill_rect(px, 9, 14, 2, 4, bone)
    set_px(px, 8, 18, bone_dk)
    set_px(px, 8, 19, bone_dk)
    # Right arm
    fill_rect(px, 20, 12, 2, 2, bone)
    fill_rect(px, 21, 14, 2, 4, bone)
    set_px(px, 23, 18, bone_dk)
    set_px(px, 23, 19, bone_dk)

    # Left leg
    fill_rect(px, 13, 21, 2, 5, bone)
    fill_rect(px, 12, 26, 3, 2, bone_dk)
    # Right leg
    fill_rect(px, 17, 21, 2, 5, bone)
    fill_rect(px, 17, 26, 3, 2, bone_dk)

    return px


# --- 4. BRAMBLETHORN: BOSS - thorny plant monster, large ---
def gen_bramblethorn():
    px = new_canvas()
    bark = hex_to_rgba('#B87333')
    bark_dk = darken(bark)
    bark_lt = lighten(bark, 1.2)
    thorn = hex_to_rgba('#5a3a1a')
    leaf = hex_to_rgba('#3a7a2a')
    leaf_dk = darken(leaf)
    eye = hex_to_rgba('#ff4400')

    # Main trunk body (wide, imposing)
    fill_rect(px, 9, 8, 14, 18, bark)
    fill_rect(px, 9, 8, 4, 18, bark_lt)
    fill_rect(px, 19, 8, 4, 18, bark_dk)

    # Head region (gnarly top)
    fill_rect(px, 10, 4, 12, 6, bark)
    fill_rect(px, 11, 3, 10, 2, bark_lt)
    fill_rect(px, 12, 2, 8, 2, bark)

    # Leaf crown (boss crown)
    for lx, ly in [(10, 1), (13, 0), (16, 0), (19, 0), (22, 1)]:
        fill_rect(px, lx, ly, 3, 3, leaf)
        set_px(px, lx+1, ly, lighten(leaf))
    for lx, ly in [(8, 2), (23, 2)]:
        fill_rect(px, lx, ly, 2, 2, leaf_dk)

    # Glowing eyes (menacing)
    fill_rect(px, 12, 6, 2, 2, eye)
    fill_rect(px, 18, 6, 2, 2, eye)
    set_px(px, 12, 6, lighten(eye))
    set_px(px, 18, 6, lighten(eye))
    # Jagged mouth
    for x in range(13, 20):
        set_px(px, x, 9, bark_dk)
        if x % 2 == 0:
            set_px(px, x, 10, bark_dk)

    # Branch arms (thick, thorny)
    # Left arm
    fill_rect(px, 4, 10, 5, 3, bark)
    fill_rect(px, 2, 12, 4, 3, bark)
    fill_rect(px, 1, 14, 3, 3, bark_dk)
    # Thorns on left arm
    set_px(px, 3, 9, thorn)
    set_px(px, 5, 9, thorn)
    set_px(px, 1, 11, thorn)
    set_px(px, 2, 14, thorn)
    # Right arm
    fill_rect(px, 23, 10, 5, 3, bark)
    fill_rect(px, 26, 12, 4, 3, bark_dk)
    fill_rect(px, 28, 14, 3, 3, bark_dk)
    # Thorns on right arm
    set_px(px, 24, 9, thorn)
    set_px(px, 27, 9, thorn)
    set_px(px, 29, 11, thorn)
    set_px(px, 30, 14, thorn)

    # Thorns on body
    for tx, ty in [(9, 12), (9, 16), (9, 20), (22, 11), (22, 15), (22, 19)]:
        set_px(px, tx, ty, thorn)
        set_px(px, tx-1 if tx < 16 else tx+1, ty, thorn)

    # Root legs (thick, gnarled)
    fill_rect(px, 8, 26, 5, 4, bark_dk)
    fill_rect(px, 19, 26, 5, 4, bark_dk)
    fill_rect(px, 6, 28, 3, 3, bark_dk)
    fill_rect(px, 23, 28, 3, 3, bark_dk)
    # Extra roots spreading
    fill_rect(px, 4, 30, 4, 2, bark_dk)
    fill_rect(px, 24, 30, 4, 2, bark_dk)

    # Bark texture lines
    for y in range(10, 25, 3):
        set_px(px, 13, y, bark_dk)
        set_px(px, 18, y, bark_dk)

    return px


# --- 5. CAVE BAT: small flying bat with wings spread ---
def gen_cave_bat():
    px = new_canvas()
    body = hex_to_rgba('#4a3a2a')
    body_dk = darken(body)
    body_lt = lighten(body, 1.3)
    wing = hex_to_rgba('#3a2a1a')
    wing_dk = darken(wing)
    eye = hex_to_rgba('#ff6600')

    # Body (small, center)
    fill_rect(px, 14, 13, 4, 6, body)
    fill_rect(px, 14, 13, 4, 2, body_lt)

    # Head
    fill_rect(px, 14, 10, 4, 4, body)
    fill_rect(px, 14, 10, 4, 1, body_lt)
    # Ears (pointy)
    set_px(px, 14, 9, body)
    set_px(px, 13, 8, body)
    set_px(px, 17, 9, body)
    set_px(px, 18, 8, body)
    # Eyes
    set_px(px, 14, 11, eye)
    set_px(px, 17, 11, eye)
    # Fangs
    set_px(px, 15, 14, hex_to_rgba('#ffffff'))
    set_px(px, 16, 14, hex_to_rgba('#ffffff'))

    # Left wing (spread wide)
    fill_rect(px, 8, 11, 6, 2, wing)
    fill_rect(px, 4, 12, 5, 2, wing)
    fill_rect(px, 2, 13, 4, 2, wing)
    fill_rect(px, 1, 14, 3, 2, wing_dk)
    # Wing membrane details
    set_px(px, 6, 14, wing_dk)
    set_px(px, 8, 13, wing_dk)
    set_px(px, 10, 12, wing_dk)
    # Wing tip pointing down
    set_px(px, 1, 16, wing_dk)
    set_px(px, 4, 15, wing_dk)
    set_px(px, 7, 15, wing_dk)

    # Right wing (spread wide)
    fill_rect(px, 18, 11, 6, 2, wing)
    fill_rect(px, 23, 12, 5, 2, wing)
    fill_rect(px, 26, 13, 4, 2, wing)
    fill_rect(px, 28, 14, 3, 2, wing_dk)
    # Wing membrane details
    set_px(px, 25, 14, wing_dk)
    set_px(px, 23, 13, wing_dk)
    set_px(px, 21, 12, wing_dk)
    # Wing tip pointing down
    set_px(px, 30, 16, wing_dk)
    set_px(px, 27, 15, wing_dk)
    set_px(px, 24, 15, wing_dk)

    # Small feet
    set_px(px, 15, 19, body_dk)
    set_px(px, 16, 19, body_dk)

    return px


# --- 6. CAVE SPIDER: eight-legged spider ---
def gen_cave_spider():
    px = new_canvas()
    body = hex_to_rgba('#2a2a2a')
    body_dk = darken(body)
    body_lt = lighten(body, 1.6)
    leg = hex_to_rgba('#3a3a3a')
    eye = hex_to_rgba('#ff0000')

    # Abdomen (rear, larger)
    fill_circle(px, 16, 19, 5, body)
    fill_circle(px, 16, 19, 3, body_lt)
    # Abdomen markings
    set_px(px, 15, 17, hex_to_rgba('#cc0000'))
    set_px(px, 17, 17, hex_to_rgba('#cc0000'))
    set_px(px, 16, 18, hex_to_rgba('#cc0000'))

    # Cephalothorax (front, smaller)
    fill_circle(px, 16, 12, 4, body)
    fill_circle(px, 16, 12, 2, body_lt)

    # Eyes (cluster of 8 red dots)
    set_px(px, 14, 10, eye)
    set_px(px, 15, 10, eye)
    set_px(px, 17, 10, eye)
    set_px(px, 18, 10, eye)
    set_px(px, 14, 11, eye)
    set_px(px, 18, 11, eye)
    # Two big center eyes
    set_px(px, 15, 11, lighten(eye))
    set_px(px, 17, 11, lighten(eye))

    # Chelicerae (fangs)
    set_px(px, 15, 14, hex_to_rgba('#555555'))
    set_px(px, 17, 14, hex_to_rgba('#555555'))
    set_px(px, 15, 15, hex_to_rgba('#444444'))
    set_px(px, 17, 15, hex_to_rgba('#444444'))

    # Legs (4 pairs, jointed)
    # Front left legs
    for dx, dy in [(0,0),(1,0),(2,-1),(3,-1),(4,-2),(5,-3)]:
        set_px(px, 12-dx, 12+dy, leg)
    for dx, dy in [(0,0),(1,-1),(2,-1),(3,-2),(4,-3),(5,-4)]:
        set_px(px, 12-dx, 14+dy, leg)
    # Middle left legs
    for dx, dy in [(0,0),(1,1),(2,1),(3,2),(4,2),(5,3)]:
        set_px(px, 12-dx, 14+dy, leg)
    for dx, dy in [(0,0),(1,1),(2,2),(3,3),(4,3),(5,4)]:
        set_px(px, 12-dx, 16+dy, leg)
    # Front right legs
    for dx, dy in [(0,0),(1,0),(2,-1),(3,-1),(4,-2),(5,-3)]:
        set_px(px, 20+dx, 12+dy, leg)
    for dx, dy in [(0,0),(1,-1),(2,-1),(3,-2),(4,-3),(5,-4)]:
        set_px(px, 20+dx, 14+dy, leg)
    # Middle right legs
    for dx, dy in [(0,0),(1,1),(2,1),(3,2),(4,2),(5,3)]:
        set_px(px, 20+dx, 14+dy, leg)
    for dx, dy in [(0,0),(1,1),(2,2),(3,3),(4,3),(5,4)]:
        set_px(px, 20+dx, 16+dy, leg)

    return px


# ========================================================================
# DARK FOREST ENEMIES
# ========================================================================

# --- 7. GREYDWARF: stout, twisted humanoid, green-brown ---
def gen_greydwarf():
    px = new_canvas()
    body = hex_to_rgba('#556b2f')
    body_dk = darken(body)
    body_lt = lighten(body)
    eye = hex_to_rgba('#ffdd00')
    bark = hex_to_rgba('#4a3a2a')

    # Head (lumpy, rounded)
    fill_rect(px, 12, 4, 8, 7, body)
    fill_rect(px, 11, 5, 10, 5, body)
    fill_rect(px, 12, 4, 8, 2, body_lt)
    # Mossy patches
    set_px(px, 13, 5, hex_to_rgba('#3a5a2a'))
    set_px(px, 18, 4, hex_to_rgba('#3a5a2a'))
    # Eyes (glowing)
    set_px(px, 14, 7, eye)
    set_px(px, 18, 7, eye)
    # Mouth (jagged)
    set_px(px, 14, 9, body_dk)
    set_px(px, 15, 10, body_dk)
    set_px(px, 16, 9, body_dk)
    set_px(px, 17, 10, body_dk)
    set_px(px, 18, 9, body_dk)

    # Torso (stout, wide)
    fill_rect(px, 10, 11, 12, 9, body)
    fill_rect(px, 10, 11, 4, 9, body_lt)
    fill_rect(px, 18, 11, 4, 9, body_dk)
    # Bark-like texture
    set_px(px, 14, 13, bark)
    set_px(px, 17, 15, bark)
    set_px(px, 12, 17, bark)

    # Arms (thick, club-like)
    fill_rect(px, 6, 12, 4, 3, body)
    fill_rect(px, 5, 15, 4, 5, body_dk)
    fill_rect(px, 22, 12, 4, 3, body)
    fill_rect(px, 23, 15, 4, 5, body_dk)
    # Clawed hands
    set_px(px, 4, 20, body_dk)
    set_px(px, 5, 20, body_dk)
    set_px(px, 27, 20, body_dk)
    set_px(px, 26, 20, body_dk)

    # Legs (short, stumpy)
    fill_rect(px, 11, 20, 4, 6, body_dk)
    fill_rect(px, 17, 20, 4, 6, body_dk)
    # Feet
    fill_rect(px, 10, 26, 5, 2, bark)
    fill_rect(px, 17, 26, 5, 2, bark)

    return px


# --- 8. TROLL: large blue troll ---
def gen_troll():
    px = new_canvas()
    body = hex_to_rgba('#2980b9')
    body_dk = darken(body)
    body_lt = lighten(body)
    eye = hex_to_rgba('#ffcc00')
    tooth = hex_to_rgba('#f5f5dc')

    # Head (large, square-ish)
    fill_rect(px, 10, 2, 12, 9, body)
    fill_rect(px, 10, 2, 12, 3, body_lt)
    # Brow ridge
    fill_rect(px, 9, 4, 14, 2, body_dk)
    # Eyes (small, yellow, under heavy brow)
    set_px(px, 13, 5, eye)
    set_px(px, 14, 5, eye)
    set_px(px, 18, 5, eye)
    set_px(px, 19, 5, eye)
    # Nose (big, bulbous)
    fill_rect(px, 15, 6, 3, 3, body_lt)
    set_px(px, 15, 8, body_dk)
    set_px(px, 17, 8, body_dk)
    # Mouth with underbite fangs
    fill_rect(px, 12, 9, 8, 2, body_dk)
    set_px(px, 13, 9, tooth)
    set_px(px, 14, 8, tooth)
    set_px(px, 18, 8, tooth)
    set_px(px, 19, 9, tooth)

    # Massive body
    fill_rect(px, 7, 11, 18, 12, body)
    fill_rect(px, 7, 11, 6, 12, body_lt)
    fill_rect(px, 19, 11, 6, 12, body_dk)
    # Belly
    fill_rect(px, 12, 16, 8, 5, lighten(body, 1.15))

    # Arms (massive, muscular)
    fill_rect(px, 3, 11, 4, 4, body)
    fill_rect(px, 2, 15, 4, 7, body)
    fill_rect(px, 1, 22, 4, 3, body_dk)
    fill_rect(px, 25, 11, 4, 4, body)
    fill_rect(px, 26, 15, 4, 7, body_dk)
    fill_rect(px, 27, 22, 4, 3, body_dk)

    # Fists
    fill_rect(px, 1, 24, 4, 3, body_dk)
    fill_rect(px, 27, 24, 4, 3, body_dk)

    # Legs (thick, short)
    fill_rect(px, 9, 23, 5, 6, body_dk)
    fill_rect(px, 18, 23, 5, 6, body_dk)
    # Feet
    fill_rect(px, 7, 28, 7, 3, body_dk)
    fill_rect(px, 17, 28, 7, 3, body_dk)

    return px


# --- 9. FOREST GHOST: translucent floating spirit ---
def gen_forest_ghost():
    px = new_canvas()
    body = hex_to_rgba('#bdc3c7', 140)
    body_lt = lighten(hex_to_rgba('#bdc3c7'), 1.3)
    body_lt = (body_lt[0], body_lt[1], body_lt[2], 120)
    glow = hex_to_rgba('#aaffaa', 100)
    eye = hex_to_rgba('#00ff66', 220)

    # Ghostly aura (outer glow)
    fill_circle(px, 16, 14, 10, glow)

    # Main ghostly form (oval, wispy)
    fill_circle(px, 16, 12, 6, body)
    fill_rect(px, 11, 12, 10, 10, body)

    # Lighter center
    fill_circle(px, 16, 12, 4, body_lt)

    # Face
    # Eyes (hollow, glowing green)
    fill_rect(px, 13, 10, 2, 3, hex_to_rgba('#003311', 200))
    fill_rect(px, 17, 10, 2, 3, hex_to_rgba('#003311', 200))
    set_px(px, 13, 11, eye)
    set_px(px, 18, 11, eye)
    # Mouth (dark void)
    fill_rect(px, 14, 14, 4, 2, hex_to_rgba('#1a3a1a', 180))

    # Wispy tendrils at bottom (tattered)
    for x in [11, 13, 15, 17, 19]:
        length = 4 if x % 4 == 3 else 3
        for dy in range(length):
            alpha = 140 - dy * 30
            if alpha > 0:
                set_px(px, x, 22 + dy, (189, 195, 199, alpha))

    # Wispy arms reaching out
    for dy in range(5):
        alpha = 130 - dy * 20
        if alpha > 0:
            set_px(px, 9 - dy, 14 + dy, (189, 195, 199, alpha))
            set_px(px, 22 + dy, 14 + dy, (189, 195, 199, alpha))

    return px


# --- 10. SHADOW LURKER: dark figure with glowing eyes ---
def gen_shadow_lurker():
    px = new_canvas()
    body = hex_to_rgba('#1a1a2a')
    body_dk = darken(body)
    body_lt = lighten(body, 1.5)
    eye = hex_to_rgba('#ff0044')
    shadow = hex_to_rgba('#0a0a15', 200)

    # Shadow aura (dark mist around body)
    fill_circle(px, 16, 16, 12, hex_to_rgba('#0a0a15', 60))
    fill_circle(px, 16, 16, 10, hex_to_rgba('#0a0a15', 80))

    # Hooded head
    fill_rect(px, 11, 4, 10, 9, body)
    fill_rect(px, 10, 5, 12, 7, body)
    # Hood peak
    fill_rect(px, 13, 3, 6, 2, body)
    set_px(px, 15, 2, body)
    set_px(px, 16, 2, body)
    # Hood shadow interior
    fill_rect(px, 12, 6, 8, 5, body_dk)

    # Glowing eyes (the main feature - bright red in darkness)
    set_px(px, 13, 8, eye)
    set_px(px, 14, 8, eye)
    set_px(px, 18, 8, eye)
    set_px(px, 19, 8, eye)
    # Eye glow
    set_px(px, 13, 7, hex_to_rgba('#ff0044', 80))
    set_px(px, 14, 7, hex_to_rgba('#ff0044', 80))
    set_px(px, 18, 7, hex_to_rgba('#ff0044', 80))
    set_px(px, 19, 7, hex_to_rgba('#ff0044', 80))

    # Cloaked body (flowing, tattered)
    fill_rect(px, 10, 13, 12, 12, body)
    fill_rect(px, 9, 15, 14, 8, body)
    fill_rect(px, 10, 13, 3, 12, body_lt)

    # Tattered bottom edge
    for x in range(9, 23):
        depth = 2 if x % 3 == 0 else (1 if x % 2 == 0 else 0)
        set_px(px, x, 25 + depth, body)
        if depth > 0:
            set_px(px, x, 26 + depth, shadow)

    # Clawed hands reaching out from cloak
    for dx in range(3):
        set_px(px, 8 - dx, 17 + dx, body)
        set_px(px, 7 - dx, 18 + dx, body_dk)
        set_px(px, 23 + dx, 17 + dx, body)
        set_px(px, 24 + dx, 18 + dx, body_dk)

    return px


# --- 11. DEEP TROLL: dark cave troll ---
def gen_deep_troll():
    px = new_canvas()
    body = hex_to_rgba('#3a4a3a')
    body_dk = darken(body)
    body_lt = lighten(body, 1.3)
    eye = hex_to_rgba('#88ff44')
    tooth = hex_to_rgba('#ccccaa')
    stone = hex_to_rgba('#555555')

    # Head (rounded, heavy jaw)
    fill_rect(px, 11, 3, 10, 8, body)
    fill_rect(px, 10, 4, 12, 6, body)
    fill_rect(px, 11, 3, 10, 3, body_lt)
    # Heavy brow
    fill_rect(px, 10, 5, 12, 2, body_dk)
    # Eyes (glowing green, under brow)
    set_px(px, 13, 6, eye)
    set_px(px, 19, 6, eye)
    # Nose
    fill_rect(px, 15, 7, 2, 2, body_lt)
    # Underbite jaw
    fill_rect(px, 11, 10, 10, 2, body_dk)
    set_px(px, 12, 10, tooth)
    set_px(px, 15, 10, tooth)
    set_px(px, 17, 10, tooth)
    set_px(px, 20, 10, tooth)

    # Body (hunched, muscular)
    fill_rect(px, 9, 12, 14, 10, body)
    fill_rect(px, 9, 12, 5, 10, body_lt)
    fill_rect(px, 19, 12, 4, 10, body_dk)
    # Stone-encrusted patches on body
    set_px(px, 12, 14, stone)
    set_px(px, 13, 14, stone)
    set_px(px, 19, 16, stone)
    set_px(px, 20, 16, stone)
    set_px(px, 14, 19, stone)

    # Arms (thick)
    fill_rect(px, 5, 13, 4, 3, body)
    fill_rect(px, 4, 16, 4, 5, body)
    fill_rect(px, 23, 13, 4, 3, body)
    fill_rect(px, 24, 16, 4, 5, body_dk)
    # Fists
    fill_rect(px, 3, 21, 4, 3, body_dk)
    fill_rect(px, 25, 21, 4, 3, body_dk)

    # Legs
    fill_rect(px, 10, 22, 4, 5, body_dk)
    fill_rect(px, 18, 22, 4, 5, body_dk)
    # Feet
    fill_rect(px, 9, 27, 6, 3, body_dk)
    fill_rect(px, 17, 27, 6, 3, body_dk)

    return px


# --- 12. FOREST GUARDIAN: tree ent with branch arms and leaf crown ---
def gen_forest_guardian():
    px = new_canvas()
    bark = hex_to_rgba('#3a5a1a')
    bark_dk = darken(bark)
    bark_lt = lighten(bark, 1.3)
    wood = hex_to_rgba('#5a3a1a')
    wood_dk = darken(wood)
    leaf = hex_to_rgba('#22aa22')
    leaf_lt = lighten(leaf)
    eye = hex_to_rgba('#ffee00')

    # Leaf crown (lush, wide)
    fill_circle(px, 16, 4, 6, leaf)
    fill_circle(px, 16, 4, 4, leaf_lt)
    for lx, ly in [(9, 2), (12, 0), (16, 0), (20, 0), (23, 2)]:
        fill_rect(px, lx, ly, 2, 3, leaf)
        set_px(px, lx, ly, leaf_lt)
    # Extra leaf clusters
    fill_rect(px, 8, 3, 3, 3, leaf)
    fill_rect(px, 21, 3, 3, 3, leaf)

    # Head/face (wooden, textured)
    fill_rect(px, 12, 6, 8, 6, wood)
    fill_rect(px, 12, 6, 8, 2, lighten(wood))
    # Eyes (warm amber glow)
    fill_rect(px, 13, 8, 2, 2, eye)
    fill_rect(px, 17, 8, 2, 2, eye)
    # Mouth (knot hole)
    fill_rect(px, 14, 11, 4, 1, wood_dk)

    # Trunk body (thick, textured bark)
    fill_rect(px, 10, 12, 12, 12, bark)
    fill_rect(px, 10, 12, 4, 12, bark_lt)
    fill_rect(px, 18, 12, 4, 12, bark_dk)
    # Bark texture
    for y in range(14, 23, 3):
        set_px(px, 13, y, wood_dk)
        set_px(px, 14, y, wood_dk)
        set_px(px, 18, y, wood_dk)

    # Branch arms (forked, with leaf tips)
    # Left branch
    fill_rect(px, 5, 12, 5, 3, wood)
    fill_rect(px, 3, 10, 4, 3, wood)
    fill_rect(px, 1, 8, 3, 3, wood)
    # Leaves on left branch tip
    fill_rect(px, 0, 6, 3, 3, leaf)
    set_px(px, 1, 5, leaf_lt)
    fill_rect(px, 3, 8, 2, 2, leaf)
    # Right branch
    fill_rect(px, 22, 12, 5, 3, wood)
    fill_rect(px, 25, 10, 4, 3, wood_dk)
    fill_rect(px, 28, 8, 3, 3, wood_dk)
    # Leaves on right branch tip
    fill_rect(px, 29, 6, 3, 3, leaf)
    set_px(px, 30, 5, leaf_lt)
    fill_rect(px, 27, 8, 2, 2, leaf)

    # Root legs
    fill_rect(px, 9, 24, 4, 5, bark_dk)
    fill_rect(px, 19, 24, 4, 5, bark_dk)
    fill_rect(px, 7, 28, 3, 3, bark_dk)
    fill_rect(px, 22, 28, 3, 3, bark_dk)
    # Spreading roots
    fill_rect(px, 5, 30, 3, 2, bark_dk)
    fill_rect(px, 24, 30, 3, 2, bark_dk)

    return px


# ========================================================================
# SWAMP ENEMIES
# ========================================================================

# --- 13. DRAUGR: armored undead viking warrior ---
def gen_draugr():
    px = new_canvas()
    skin = hex_to_rgba('#2c3e50')
    skin_dk = darken(skin)
    skin_lt = lighten(skin, 1.3)
    armor = hex_to_rgba('#555555')
    armor_lt = lighten(armor)
    eye = hex_to_rgba('#00ccff')
    rust = hex_to_rgba('#8b4513')

    # Helmet (viking style with nose guard)
    fill_rect(px, 11, 2, 10, 7, armor)
    fill_rect(px, 11, 2, 10, 2, armor_lt)
    # Helmet wings/horns
    set_px(px, 10, 3, armor_lt)
    set_px(px, 9, 2, armor_lt)
    set_px(px, 8, 1, armor_lt)
    set_px(px, 22, 3, armor_lt)
    set_px(px, 23, 2, armor_lt)
    set_px(px, 24, 1, armor_lt)
    # Nose guard
    set_px(px, 16, 5, armor_lt)
    set_px(px, 16, 6, armor_lt)
    set_px(px, 16, 7, armor_lt)

    # Face (undead, dark)
    fill_rect(px, 12, 5, 3, 4, skin)
    fill_rect(px, 17, 5, 3, 4, skin)
    # Glowing blue eyes
    set_px(px, 13, 6, eye)
    set_px(px, 14, 6, eye)
    set_px(px, 18, 6, eye)
    set_px(px, 19, 6, eye)
    # Jaw
    fill_rect(px, 13, 8, 6, 2, skin_dk)
    set_px(px, 14, 9, hex_to_rgba('#cccccc'))
    set_px(px, 17, 9, hex_to_rgba('#cccccc'))

    # Armored torso (chainmail)
    fill_rect(px, 10, 10, 12, 10, armor)
    fill_rect(px, 10, 10, 12, 2, armor_lt)
    # Chainmail texture
    for y in range(12, 19, 2):
        for x in range(11, 21, 2):
            set_px(px, x, y, darken(armor, 0.8))
    # Rust patches
    set_px(px, 12, 14, rust)
    set_px(px, 19, 16, rust)

    # Shield (left arm)
    fill_rect(px, 4, 11, 6, 8, hex_to_rgba('#6a5a3a'))
    draw_border(px, 4, 11, 6, 8, hex_to_rgba('#8a7a5a'))
    fill_rect(px, 6, 14, 2, 2, armor_lt)

    # Sword (right arm)
    fill_rect(px, 22, 10, 3, 3, skin)
    fill_rect(px, 24, 8, 2, 2, armor_lt)  # pommel
    fill_rect(px, 23, 6, 4, 2, rust)      # crossguard
    fill_rect(px, 24, 2, 2, 4, hex_to_rgba('#aaaaaa'))  # blade
    set_px(px, 25, 1, hex_to_rgba('#cccccc'))            # tip

    # Legs (armored)
    fill_rect(px, 11, 20, 4, 6, armor)
    fill_rect(px, 17, 20, 4, 6, armor)
    # Boots
    fill_rect(px, 10, 26, 5, 3, skin_dk)
    fill_rect(px, 17, 26, 5, 3, skin_dk)

    return px


# --- 14. BLOB: amorphous green slime blob ---
def gen_blob():
    px = new_canvas()
    slime = hex_to_rgba('#27ae60')
    slime_dk = darken(slime)
    slime_lt = lighten(slime)
    shine = hex_to_rgba('#aaffaa', 180)
    eye = hex_to_rgba('#111111')
    bubble = hex_to_rgba('#88ff88', 120)

    # Main blob shape (irregular, organic)
    fill_circle(px, 16, 18, 9, slime)
    fill_circle(px, 16, 16, 8, slime)
    fill_circle(px, 14, 15, 6, slime)
    fill_circle(px, 18, 15, 6, slime)
    # Top bulge
    fill_circle(px, 16, 12, 5, slime)
    fill_circle(px, 16, 12, 3, slime_lt)

    # Highlight/shine
    fill_circle(px, 13, 12, 2, shine)
    set_px(px, 12, 11, hex_to_rgba('#ccffcc', 200))

    # Darker base
    fill_circle(px, 16, 22, 7, slime_dk)

    # Eyes (beady, floating in slime)
    fill_rect(px, 13, 14, 2, 2, eye)
    fill_rect(px, 18, 14, 2, 2, eye)
    # Pupil shine
    set_px(px, 13, 14, hex_to_rgba('#333333'))
    set_px(px, 18, 14, hex_to_rgba('#333333'))

    # Mouth (derpy smile)
    for x in range(14, 19):
        set_px(px, x, 18, slime_dk)
    set_px(px, 13, 17, slime_dk)
    set_px(px, 19, 17, slime_dk)

    # Bubbles inside
    set_px(px, 11, 18, bubble)
    set_px(px, 20, 16, bubble)
    set_px(px, 15, 21, bubble)
    set_px(px, 10, 14, bubble)

    # Dripping tendrils at edges
    set_px(px, 8, 24, slime_dk)
    set_px(px, 8, 25, hex_to_rgba('#27ae60', 140))
    set_px(px, 23, 23, slime_dk)
    set_px(px, 23, 24, hex_to_rgba('#27ae60', 140))

    return px


# --- 15. WRAITH: floating ghost with tattered robes ---
def gen_wraith():
    px = new_canvas()
    robe = hex_to_rgba('#ecf0f1', 160)
    robe_dk = hex_to_rgba('#bdc3c7', 140)
    robe_lt = hex_to_rgba('#ffffff', 180)
    eye = hex_to_rgba('#ff3333', 240)
    glow = hex_to_rgba('#ff3333', 60)
    void = hex_to_rgba('#111111', 200)

    # Ethereal glow
    fill_circle(px, 16, 12, 11, hex_to_rgba('#cccccc', 30))

    # Hood (pointed, angular)
    fill_rect(px, 11, 3, 10, 8, robe)
    fill_rect(px, 12, 2, 8, 2, robe)
    set_px(px, 15, 1, robe_lt)
    set_px(px, 16, 1, robe_lt)
    set_px(px, 15, 0, robe_lt)
    set_px(px, 16, 0, robe_lt)
    # Hood shadow
    fill_rect(px, 12, 5, 8, 4, void)

    # Glowing red eyes (menacing, in hood shadow)
    set_px(px, 13, 6, eye)
    set_px(px, 14, 6, eye)
    set_px(px, 18, 6, eye)
    set_px(px, 19, 6, eye)
    # Eye glow
    set_px(px, 12, 6, glow)
    set_px(px, 15, 6, glow)
    set_px(px, 17, 6, glow)
    set_px(px, 20, 6, glow)

    # Robed body (flowing, tattered)
    fill_rect(px, 10, 11, 12, 10, robe)
    fill_rect(px, 9, 13, 14, 6, robe)
    fill_rect(px, 10, 11, 3, 10, robe_lt)

    # Skeletal arms reaching out
    fill_rect(px, 6, 12, 4, 2, robe_dk)
    fill_rect(px, 4, 14, 3, 2, robe_dk)
    set_px(px, 3, 14, hex_to_rgba('#ccccaa', 180))
    set_px(px, 3, 15, hex_to_rgba('#ccccaa', 180))
    fill_rect(px, 22, 12, 4, 2, robe_dk)
    fill_rect(px, 25, 14, 3, 2, robe_dk)
    set_px(px, 28, 14, hex_to_rgba('#ccccaa', 180))
    set_px(px, 28, 15, hex_to_rgba('#ccccaa', 180))

    # Tattered bottom (ragged edge)
    for x in range(9, 23):
        depth = 3 if x % 3 == 0 else (2 if x % 2 == 0 else 1)
        for dy in range(depth):
            alpha = 160 - dy * 40
            if alpha > 0:
                set_px(px, x, 21 + dy, (236, 240, 241, alpha))

    return px


# --- 16. SLIME BEAST: large slimy creature ---
def gen_slime_beast():
    px = new_canvas()
    slime = hex_to_rgba('#4a6a2a')
    slime_dk = darken(slime)
    slime_lt = lighten(slime)
    eye = hex_to_rgba('#ff4444')
    drip = hex_to_rgba('#5a7a3a', 180)

    # Hulking body (large, muscular slime creature)
    fill_circle(px, 16, 16, 10, slime)
    fill_circle(px, 16, 14, 8, slime)
    fill_rect(px, 8, 14, 16, 12, slime)
    # Lighter top
    fill_circle(px, 16, 12, 6, slime_lt)

    # Head (merged with body, hunched)
    fill_rect(px, 11, 6, 10, 8, slime)
    fill_rect(px, 12, 5, 8, 3, slime)
    fill_rect(px, 12, 5, 8, 2, slime_lt)

    # Angry eyes
    fill_rect(px, 12, 8, 3, 2, hex_to_rgba('#220000'))
    fill_rect(px, 17, 8, 3, 2, hex_to_rgba('#220000'))
    set_px(px, 13, 8, eye)
    set_px(px, 18, 8, eye)
    # Brow ridge
    fill_rect(px, 11, 7, 10, 1, slime_dk)

    # Wide mouth (snarling)
    fill_rect(px, 12, 11, 8, 2, slime_dk)
    for x in range(13, 19, 2):
        set_px(px, x, 11, hex_to_rgba('#ccccaa'))

    # Arms (thick, dripping)
    fill_rect(px, 4, 12, 4, 4, slime)
    fill_rect(px, 3, 16, 4, 5, slime_dk)
    fill_rect(px, 24, 12, 4, 4, slime)
    fill_rect(px, 25, 16, 4, 5, slime_dk)
    # Dripping claws
    set_px(px, 2, 21, drip)
    set_px(px, 3, 22, drip)
    set_px(px, 29, 21, drip)
    set_px(px, 28, 22, drip)

    # Legs (thick)
    fill_rect(px, 10, 24, 4, 5, slime_dk)
    fill_rect(px, 18, 24, 4, 5, slime_dk)
    fill_rect(px, 9, 28, 6, 3, slime_dk)
    fill_rect(px, 17, 28, 6, 3, slime_dk)

    # Slime drips from body
    for sx, sy in [(8, 22), (12, 26), (20, 25), (24, 22)]:
        set_px(px, sx, sy, drip)
        set_px(px, sx, sy+1, hex_to_rgba('#5a7a3a', 120))

    return px


# --- 17. BLIND CRAWLER: cave-dwelling eyeless creature ---
def gen_blind_crawler():
    px = new_canvas()
    body = hex_to_rgba('#5a4a4a')
    body_dk = darken(body)
    body_lt = lighten(body, 1.3)
    claw = hex_to_rgba('#888888')
    flesh = hex_to_rgba('#8a6a6a')

    # Low, crouching body (quadruped, hunched)
    fill_rect(px, 8, 14, 16, 8, body)
    fill_rect(px, 8, 14, 16, 3, body_lt)
    fill_rect(px, 8, 19, 16, 3, body_dk)
    # Humped back
    fill_rect(px, 10, 12, 12, 3, body)
    fill_rect(px, 12, 11, 8, 2, body_lt)

    # Head (flat, no eyes, big mouth)
    fill_rect(px, 4, 14, 6, 6, body)
    fill_rect(px, 3, 15, 3, 4, body)
    fill_rect(px, 4, 14, 6, 2, body_lt)
    # No eyes - smooth head plate
    fill_rect(px, 4, 14, 6, 1, flesh)
    # Sensory pits (where eyes would be)
    set_px(px, 5, 16, body_dk)
    set_px(px, 8, 16, body_dk)
    # Wide mouth (gaping, teeth visible)
    fill_rect(px, 3, 18, 7, 2, body_dk)
    set_px(px, 4, 18, claw)
    set_px(px, 6, 18, claw)
    set_px(px, 8, 18, claw)
    # Jaw
    fill_rect(px, 3, 19, 7, 1, flesh)

    # Front legs (long, clawed)
    fill_rect(px, 5, 20, 3, 5, body_dk)
    fill_rect(px, 10, 20, 3, 5, body_dk)
    # Front claws
    set_px(px, 4, 25, claw)
    set_px(px, 5, 26, claw)
    set_px(px, 7, 26, claw)
    set_px(px, 9, 25, claw)
    set_px(px, 10, 26, claw)
    set_px(px, 12, 26, claw)

    # Rear legs
    fill_rect(px, 19, 20, 3, 5, body_dk)
    fill_rect(px, 23, 20, 3, 5, body_dk)
    # Rear claws
    set_px(px, 18, 25, claw)
    set_px(px, 21, 26, claw)
    set_px(px, 22, 25, claw)
    set_px(px, 25, 26, claw)

    # Tail (thin, whip-like)
    set_px(px, 24, 15, body)
    set_px(px, 25, 14, body)
    set_px(px, 26, 13, body)
    set_px(px, 27, 13, body_dk)
    set_px(px, 28, 12, body_dk)

    # Spine ridges
    for x in range(12, 22, 2):
        set_px(px, x, 11, body_dk)

    return px


# ========================================================================
# MOUNTAIN ENEMIES
# ========================================================================

# --- 18. WOLF: grey wolf on all fours ---
def gen_wolf():
    px = new_canvas()
    fur = hex_to_rgba('#7f8c8d')
    fur_dk = darken(fur)
    fur_lt = lighten(fur)
    belly = hex_to_rgba('#b0b8b9')
    eye = hex_to_rgba('#ffcc00')
    nose = hex_to_rgba('#222222')

    # Body (horizontal, lean)
    fill_rect(px, 7, 12, 18, 8, fur)
    fill_rect(px, 7, 12, 18, 3, fur_lt)    # back
    fill_rect(px, 7, 17, 18, 3, belly)     # belly

    # Head (angular, pointed snout)
    fill_rect(px, 2, 10, 8, 7, fur)
    fill_rect(px, 2, 10, 8, 3, fur_lt)
    # Snout
    fill_rect(px, 0, 12, 4, 4, fur)
    fill_rect(px, 0, 12, 4, 1, fur_lt)
    # Nose
    set_px(px, 0, 13, nose)
    set_px(px, 1, 13, nose)
    # Eye
    set_px(px, 5, 12, eye)
    set_px(px, 6, 12, eye)
    # Ears (pointed, upright)
    set_px(px, 5, 8, fur)
    set_px(px, 5, 9, fur)
    set_px(px, 6, 8, fur)
    set_px(px, 8, 8, fur)
    set_px(px, 8, 9, fur)
    set_px(px, 9, 8, fur)
    # Ear insides
    set_px(px, 6, 9, hex_to_rgba('#cc9999'))
    set_px(px, 8, 9, hex_to_rgba('#cc9999'))
    # Open mouth
    fill_rect(px, 0, 15, 4, 1, fur_dk)
    set_px(px, 1, 15, hex_to_rgba('#cc6666'))
    # Fangs
    set_px(px, 0, 14, hex_to_rgba('#ffffff'))
    set_px(px, 3, 14, hex_to_rgba('#ffffff'))

    # Front legs
    fill_rect(px, 8, 20, 3, 6, fur_dk)
    fill_rect(px, 12, 20, 3, 6, fur_dk)
    # Paws
    fill_rect(px, 8, 26, 3, 2, fur_dk)
    fill_rect(px, 12, 26, 3, 2, fur_dk)

    # Rear legs
    fill_rect(px, 19, 18, 4, 3, fur)
    fill_rect(px, 19, 21, 3, 5, fur_dk)
    fill_rect(px, 23, 20, 3, 6, fur_dk)
    # Paws
    fill_rect(px, 19, 26, 3, 2, fur_dk)
    fill_rect(px, 23, 26, 3, 2, fur_dk)

    # Tail (bushy, raised)
    fill_rect(px, 25, 10, 3, 3, fur)
    fill_rect(px, 27, 8, 2, 3, fur_lt)
    set_px(px, 28, 7, fur_lt)
    set_px(px, 29, 7, fur)

    return px


# --- 19. DRAKE: ice dragon/wyvern with wings ---
def gen_drake():
    px = new_canvas()
    body = hex_to_rgba('#3498db')
    body_dk = darken(body)
    body_lt = lighten(body)
    wing = hex_to_rgba('#5dade2')
    wing_dk = darken(wing)
    ice = hex_to_rgba('#aaddff')
    eye = hex_to_rgba('#ff4444')

    # Body (serpentine, angled upward)
    fill_rect(px, 12, 14, 10, 8, body)
    fill_rect(px, 12, 14, 10, 3, body_lt)
    fill_rect(px, 12, 19, 10, 3, body_dk)
    # Chest/belly
    fill_rect(px, 13, 17, 8, 4, ice)

    # Head (angular dragon head)
    fill_rect(px, 8, 8, 8, 6, body)
    fill_rect(px, 6, 9, 4, 4, body)
    fill_rect(px, 4, 10, 3, 3, body)
    fill_rect(px, 8, 8, 8, 2, body_lt)
    # Horns
    set_px(px, 10, 6, body_lt)
    set_px(px, 10, 5, body_lt)
    set_px(px, 14, 6, body_lt)
    set_px(px, 14, 5, body_lt)
    # Eye
    set_px(px, 7, 10, eye)
    set_px(px, 8, 10, eye)
    # Nostril
    set_px(px, 5, 11, body_dk)
    # Jaw
    fill_rect(px, 5, 13, 6, 1, body_dk)
    # Ice breath hint
    set_px(px, 3, 11, ice)
    set_px(px, 2, 10, hex_to_rgba('#aaddff', 180))
    set_px(px, 2, 12, hex_to_rgba('#aaddff', 180))

    # Wings (spread, large)
    # Left wing
    fill_rect(px, 4, 5, 3, 8, wing)
    fill_rect(px, 1, 4, 4, 6, wing)
    set_px(px, 0, 3, wing_dk)
    set_px(px, 1, 3, wing_dk)
    # Wing membrane lines
    set_px(px, 3, 6, wing_dk)
    set_px(px, 2, 7, wing_dk)
    # Right wing (larger, behind)
    fill_rect(px, 18, 6, 4, 8, wing)
    fill_rect(px, 22, 4, 5, 8, wing)
    fill_rect(px, 26, 3, 4, 6, wing)
    set_px(px, 30, 2, wing_dk)
    set_px(px, 29, 2, wing_dk)
    # Membrane lines
    set_px(px, 20, 7, wing_dk)
    set_px(px, 24, 6, wing_dk)
    set_px(px, 28, 5, wing_dk)

    # Tail (curving)
    fill_rect(px, 22, 18, 4, 3, body)
    fill_rect(px, 25, 20, 3, 2, body_dk)
    set_px(px, 28, 21, body_dk)
    set_px(px, 29, 22, body_dk)
    # Tail fin
    set_px(px, 29, 20, body_lt)
    set_px(px, 30, 21, body_lt)

    # Legs (short, clawed)
    fill_rect(px, 13, 22, 3, 5, body_dk)
    fill_rect(px, 18, 22, 3, 5, body_dk)
    # Claws
    set_px(px, 12, 27, ice)
    set_px(px, 15, 27, ice)
    set_px(px, 17, 27, ice)
    set_px(px, 20, 27, ice)

    return px


# --- 20. STONE GOLEM: BOSS - massive stone giant ---
def gen_stone_golem():
    px = new_canvas()
    stone = hex_to_rgba('#555555')
    stone_dk = darken(stone)
    stone_lt = lighten(stone, 1.4)
    crack = hex_to_rgba('#333333')
    eye = hex_to_rgba('#ffaa00')
    moss = hex_to_rgba('#4a6a3a')

    # Massive head (blocky)
    fill_rect(px, 9, 1, 14, 9, stone)
    fill_rect(px, 9, 1, 14, 3, stone_lt)
    fill_rect(px, 9, 7, 14, 3, stone_dk)
    # Brow ridge (heavy)
    fill_rect(px, 8, 3, 16, 2, stone_dk)

    # Glowing eyes (deep set)
    fill_rect(px, 11, 4, 3, 2, hex_to_rgba('#111111'))
    fill_rect(px, 18, 4, 3, 2, hex_to_rgba('#111111'))
    set_px(px, 12, 4, eye)
    set_px(px, 12, 5, eye)
    set_px(px, 19, 4, eye)
    set_px(px, 19, 5, eye)

    # Mouth (crack-like)
    fill_rect(px, 12, 8, 8, 1, crack)
    set_px(px, 14, 9, crack)
    set_px(px, 17, 9, crack)

    # Massive body (wide, imposing)
    fill_rect(px, 5, 10, 22, 14, stone)
    fill_rect(px, 5, 10, 7, 14, stone_lt)
    fill_rect(px, 20, 10, 7, 14, stone_dk)
    # Chest cracks
    set_px(px, 14, 12, crack)
    set_px(px, 14, 13, crack)
    set_px(px, 15, 13, crack)
    set_px(px, 15, 14, crack)
    set_px(px, 18, 15, crack)
    set_px(px, 19, 15, crack)
    set_px(px, 19, 16, crack)

    # Moss patches
    fill_rect(px, 7, 14, 3, 2, moss)
    fill_rect(px, 22, 12, 2, 3, moss)
    set_px(px, 15, 20, moss)
    set_px(px, 16, 20, moss)

    # Massive arms (boulder-like)
    fill_rect(px, 0, 10, 5, 5, stone)
    fill_rect(px, 0, 15, 5, 6, stone)
    fill_rect(px, 0, 21, 6, 5, stone_dk)
    fill_rect(px, 0, 10, 5, 2, stone_lt)
    fill_rect(px, 27, 10, 5, 5, stone)
    fill_rect(px, 27, 15, 5, 6, stone_dk)
    fill_rect(px, 26, 21, 6, 5, stone_dk)
    fill_rect(px, 27, 10, 5, 2, stone_lt)
    # Fist cracks
    set_px(px, 2, 23, crack)
    set_px(px, 29, 23, crack)

    # Legs (pillar-like)
    fill_rect(px, 7, 24, 6, 6, stone_dk)
    fill_rect(px, 19, 24, 6, 6, stone_dk)
    # Feet
    fill_rect(px, 5, 29, 9, 3, stone_dk)
    fill_rect(px, 18, 29, 9, 3, stone_dk)

    # Glowing rune on chest (boss indicator)
    fill_rect(px, 14, 16, 4, 4, hex_to_rgba('#ffaa00', 100))
    set_px(px, 15, 17, eye)
    set_px(px, 16, 17, eye)
    set_px(px, 15, 18, eye)
    set_px(px, 16, 18, eye)

    return px


# --- 21. CRYSTAL BEETLE: glowing purple beetle ---
def gen_crystal_beetle():
    px = new_canvas()
    shell = hex_to_rgba('#6a6ae0')
    shell_dk = darken(shell)
    shell_lt = lighten(shell)
    crystal = hex_to_rgba('#aa88ff')
    crystal_lt = hex_to_rgba('#ccaaff')
    leg = hex_to_rgba('#4a4a8a')
    eye = hex_to_rgba('#ff66ff')

    # Shell (oval, domed)
    fill_circle(px, 16, 15, 8, shell)
    fill_circle(px, 16, 14, 7, shell)
    fill_circle(px, 16, 13, 5, shell_lt)
    # Shell center line
    for y in range(9, 22):
        set_px(px, 16, y, shell_dk)

    # Wing case pattern
    fill_rect(px, 11, 12, 4, 2, shell_lt)
    fill_rect(px, 17, 12, 4, 2, shell_lt)
    fill_rect(px, 12, 16, 3, 2, shell_lt)
    fill_rect(px, 17, 16, 3, 2, shell_lt)

    # Crystal growths on shell (the unique feature)
    # Left crystal
    fill_rect(px, 10, 8, 2, 4, crystal)
    set_px(px, 10, 7, crystal_lt)
    set_px(px, 11, 7, crystal_lt)
    set_px(px, 10, 6, crystal_lt)
    # Right crystal
    fill_rect(px, 20, 9, 2, 3, crystal)
    set_px(px, 20, 8, crystal_lt)
    set_px(px, 21, 8, crystal_lt)
    # Center crystal
    set_px(px, 15, 8, crystal)
    set_px(px, 16, 7, crystal_lt)
    set_px(px, 17, 8, crystal)

    # Head (small, below shell front)
    fill_rect(px, 13, 9, 6, 3, shell_dk)
    # Eyes
    set_px(px, 14, 10, eye)
    set_px(px, 18, 10, eye)
    # Mandibles
    set_px(px, 14, 12, leg)
    set_px(px, 18, 12, leg)

    # Legs (3 pairs)
    for dy, offset in [(0, 0), (3, 1), (6, 0)]:
        # Left legs
        set_px(px, 8, 13+dy, leg)
        set_px(px, 7, 14+dy, leg)
        set_px(px, 6, 15+dy+offset, leg)
        # Right legs
        set_px(px, 24, 13+dy, leg)
        set_px(px, 25, 14+dy, leg)
        set_px(px, 26, 15+dy+offset, leg)

    # Glow effect under body
    fill_circle(px, 16, 15, 4, hex_to_rgba('#6a6ae0', 60))

    return px


# --- 22. ICE GOLEM: frost golem ---
def gen_ice_golem():
    px = new_canvas()
    ice = hex_to_rgba('#a0d0e0')
    ice_dk = darken(ice)
    ice_lt = lighten(ice)
    frost = hex_to_rgba('#ddeeff')
    core = hex_to_rgba('#66bbff')
    eye = hex_to_rgba('#00aaff')

    # Head (angular, crystalline)
    fill_rect(px, 11, 2, 10, 8, ice)
    fill_rect(px, 11, 2, 10, 3, ice_lt)
    fill_rect(px, 11, 7, 10, 3, ice_dk)
    # Angular top
    set_px(px, 13, 1, ice_lt)
    set_px(px, 14, 1, ice_lt)
    set_px(px, 18, 1, ice_lt)
    set_px(px, 19, 1, ice_lt)
    set_px(px, 15, 0, frost)
    set_px(px, 16, 0, frost)

    # Eyes (glowing blue)
    fill_rect(px, 13, 4, 2, 2, eye)
    fill_rect(px, 17, 4, 2, 2, eye)
    set_px(px, 13, 4, lighten(eye))
    set_px(px, 17, 4, lighten(eye))

    # Mouth crack
    fill_rect(px, 14, 7, 4, 1, ice_dk)

    # Body (large, blocky, icy)
    fill_rect(px, 8, 10, 16, 12, ice)
    fill_rect(px, 8, 10, 5, 12, ice_lt)
    fill_rect(px, 19, 10, 5, 12, ice_dk)
    # Frost patterns
    set_px(px, 12, 13, frost)
    set_px(px, 13, 14, frost)
    set_px(px, 19, 12, frost)
    set_px(px, 18, 13, frost)

    # Glowing core (center chest)
    fill_rect(px, 14, 14, 4, 4, core)
    fill_rect(px, 15, 15, 2, 2, lighten(core))
    # Core glow
    fill_circle(px, 16, 16, 3, hex_to_rgba('#66bbff', 60))

    # Arms (icy, blocky)
    fill_rect(px, 3, 10, 5, 4, ice)
    fill_rect(px, 2, 14, 5, 6, ice)
    fill_rect(px, 1, 20, 5, 3, ice_dk)
    fill_rect(px, 24, 10, 5, 4, ice)
    fill_rect(px, 25, 14, 5, 6, ice_dk)
    fill_rect(px, 26, 20, 5, 3, ice_dk)
    # Icicle fingers
    set_px(px, 1, 23, frost)
    set_px(px, 3, 23, frost)
    set_px(px, 5, 23, frost)
    set_px(px, 26, 23, frost)
    set_px(px, 28, 23, frost)
    set_px(px, 30, 23, frost)

    # Legs (thick, icy pillars)
    fill_rect(px, 9, 22, 5, 6, ice_dk)
    fill_rect(px, 18, 22, 5, 6, ice_dk)
    # Feet
    fill_rect(px, 8, 28, 7, 3, ice_dk)
    fill_rect(px, 17, 28, 7, 3, ice_dk)

    # Icicles hanging from arms
    set_px(px, 3, 15, frost)
    set_px(px, 4, 16, frost)
    set_px(px, 27, 15, frost)
    set_px(px, 26, 16, frost)

    return px


# ========================================================================
# VOLCANIC ENEMIES
# ========================================================================

# --- 23. SURTLING: fire imp/elemental ---
def gen_surtling():
    px = new_canvas()
    body = hex_to_rgba('#e74c3c')
    body_dk = darken(body)
    body_lt = lighten(body, 1.2)
    fire = hex_to_rgba('#ff8800')
    fire_lt = hex_to_rgba('#ffcc00')
    eye = hex_to_rgba('#ffffff')
    ember = hex_to_rgba('#ffdd00', 180)

    # Flame crown (fire on head)
    set_px(px, 14, 1, fire_lt)
    set_px(px, 15, 0, fire)
    set_px(px, 16, 0, fire_lt)
    set_px(px, 17, 1, fire)
    set_px(px, 13, 2, fire)
    set_px(px, 18, 2, fire)
    fill_rect(px, 13, 3, 6, 2, fire)
    fill_rect(px, 14, 2, 4, 2, fire_lt)
    # Extra flame wisps
    set_px(px, 12, 3, ember)
    set_px(px, 19, 2, ember)

    # Head (rounded, glowing)
    fill_circle(px, 16, 8, 4, body)
    fill_circle(px, 16, 8, 3, body_lt)
    # Bright white eyes
    set_px(px, 14, 7, eye)
    set_px(px, 18, 7, eye)
    set_px(px, 14, 8, eye)
    set_px(px, 18, 8, eye)
    # Mouth (grinning, fiery)
    set_px(px, 14, 10, fire_lt)
    set_px(px, 15, 10, fire)
    set_px(px, 16, 10, fire_lt)
    set_px(px, 17, 10, fire)
    set_px(px, 18, 10, fire_lt)

    # Torso (compact, glowing)
    fill_rect(px, 12, 12, 8, 7, body)
    fill_rect(px, 12, 12, 3, 7, body_lt)
    fill_rect(px, 17, 12, 3, 7, body_dk)
    # Inner glow
    fill_rect(px, 14, 14, 4, 3, fire)
    fill_rect(px, 15, 15, 2, 1, fire_lt)

    # Arms (thin, fiery)
    fill_rect(px, 9, 13, 3, 2, body)
    fill_rect(px, 7, 15, 3, 3, body)
    fill_rect(px, 20, 13, 3, 2, body)
    fill_rect(px, 22, 15, 3, 3, body_dk)
    # Fiery hands
    set_px(px, 6, 18, fire)
    set_px(px, 7, 18, fire_lt)
    set_px(px, 24, 18, fire)
    set_px(px, 25, 18, fire_lt)

    # Legs (thin)
    fill_rect(px, 12, 19, 3, 5, body_dk)
    fill_rect(px, 17, 19, 3, 5, body_dk)
    # Fiery feet
    fill_rect(px, 11, 24, 4, 2, fire)
    fill_rect(px, 17, 24, 4, 2, fire)
    set_px(px, 12, 23, ember)
    set_px(px, 18, 23, ember)

    # Floating embers around
    set_px(px, 8, 6, ember)
    set_px(px, 23, 5, ember)
    set_px(px, 6, 11, ember)
    set_px(px, 25, 10, ember)

    return px


# --- 24. LAVA GOLEM: BOSS - massive lava giant ---
def gen_lava_golem():
    px = new_canvas()
    rock = hex_to_rgba('#4a2a1a')
    rock_dk = darken(rock)
    rock_lt = lighten(rock, 1.4)
    lava = hex_to_rgba('#ff4500')
    lava_lt = hex_to_rgba('#ff8800')
    lava_hot = hex_to_rgba('#ffcc00')
    eye = hex_to_rgba('#ffee00')

    # Massive head (rocky, cracked)
    fill_rect(px, 8, 0, 16, 9, rock)
    fill_rect(px, 8, 0, 16, 3, rock_lt)
    fill_rect(px, 8, 6, 16, 3, rock_dk)
    # Lava cracks on head
    set_px(px, 12, 2, lava)
    set_px(px, 12, 3, lava)
    set_px(px, 20, 1, lava)
    set_px(px, 20, 2, lava)

    # Eyes (blazing)
    fill_rect(px, 10, 3, 3, 3, lava)
    fill_rect(px, 19, 3, 3, 3, lava)
    set_px(px, 11, 4, eye)
    set_px(px, 20, 4, eye)
    # Eye glow
    set_px(px, 10, 3, lava_hot)
    set_px(px, 19, 3, lava_hot)

    # Mouth (lava spilling)
    fill_rect(px, 12, 7, 8, 2, lava)
    fill_rect(px, 13, 8, 6, 1, lava_lt)
    set_px(px, 15, 9, lava_hot)
    set_px(px, 16, 9, lava_hot)

    # Massive body
    fill_rect(px, 4, 9, 24, 14, rock)
    fill_rect(px, 4, 9, 8, 14, rock_lt)
    fill_rect(px, 20, 9, 8, 14, rock_dk)

    # Lava veins across body (the signature feature)
    for y in range(10, 22, 3):
        for x in range(6, 26, 4):
            set_px(px, x, y, lava)
            set_px(px, x+1, y, lava_lt)
    # Major lava crack down center
    for y in range(10, 22):
        set_px(px, 16, y, lava)
        if y % 2 == 0:
            set_px(px, 15, y, lava_lt)
            set_px(px, 17, y, lava_lt)

    # Core glow (boss power core in chest)
    fill_rect(px, 13, 13, 6, 5, lava)
    fill_rect(px, 14, 14, 4, 3, lava_lt)
    fill_rect(px, 15, 15, 2, 1, lava_hot)

    # Massive arms
    fill_rect(px, 0, 9, 4, 5, rock)
    fill_rect(px, 0, 14, 4, 7, rock)
    fill_rect(px, 0, 21, 5, 5, rock_dk)
    fill_rect(px, 28, 9, 4, 5, rock)
    fill_rect(px, 28, 14, 4, 7, rock_dk)
    fill_rect(px, 27, 21, 5, 5, rock_dk)
    # Lava fists
    fill_rect(px, 0, 24, 5, 3, rock_dk)
    set_px(px, 1, 24, lava)
    set_px(px, 3, 25, lava)
    fill_rect(px, 27, 24, 5, 3, rock_dk)
    set_px(px, 28, 24, lava)
    set_px(px, 30, 25, lava)
    # Arm lava cracks
    set_px(px, 1, 16, lava)
    set_px(px, 2, 17, lava)
    set_px(px, 29, 15, lava)
    set_px(px, 30, 16, lava)

    # Legs (pillar-like, massive)
    fill_rect(px, 6, 23, 7, 6, rock_dk)
    fill_rect(px, 19, 23, 7, 6, rock_dk)
    # Lava cracks in legs
    set_px(px, 9, 25, lava)
    set_px(px, 22, 26, lava)
    # Feet
    fill_rect(px, 4, 28, 10, 4, rock_dk)
    fill_rect(px, 18, 28, 10, 4, rock_dk)
    # Lava pooling at feet
    set_px(px, 6, 30, lava)
    set_px(px, 7, 31, lava_lt)
    set_px(px, 24, 30, lava)
    set_px(px, 25, 31, lava_lt)

    return px


# --- 25. ASH WRAITH: smoky ghostly figure ---
def gen_ash_wraith():
    px = new_canvas()
    ash = hex_to_rgba('#555555', 180)
    ash_dk = hex_to_rgba('#333333', 160)
    ash_lt = hex_to_rgba('#777777', 140)
    smoke = hex_to_rgba('#444444', 100)
    ember = hex_to_rgba('#ff6600', 200)
    eye = hex_to_rgba('#ff4400', 240)

    # Smoke aura
    fill_circle(px, 16, 14, 12, hex_to_rgba('#333333', 30))
    fill_circle(px, 16, 14, 9, hex_to_rgba('#444444', 50))

    # Smoky head (amorphous, shifting)
    fill_circle(px, 16, 8, 5, ash)
    fill_circle(px, 16, 8, 3, ash_lt)
    # Smoke wisps rising from head
    set_px(px, 13, 3, smoke)
    set_px(px, 14, 2, smoke)
    set_px(px, 17, 3, smoke)
    set_px(px, 18, 2, smoke)
    set_px(px, 15, 1, smoke)
    set_px(px, 16, 0, hex_to_rgba('#444444', 60))

    # Burning eyes
    set_px(px, 14, 7, eye)
    set_px(px, 15, 7, eye)
    set_px(px, 17, 7, eye)
    set_px(px, 18, 7, eye)
    # Eye glow
    set_px(px, 13, 7, hex_to_rgba('#ff4400', 80))
    set_px(px, 19, 7, hex_to_rgba('#ff4400', 80))

    # Mouth (gaping dark)
    fill_rect(px, 14, 10, 4, 2, ash_dk)
    set_px(px, 15, 10, ember)
    set_px(px, 16, 10, ember)

    # Ashy body (smoky, billowing)
    fill_rect(px, 10, 13, 12, 10, ash)
    fill_rect(px, 9, 15, 14, 6, ash)
    fill_rect(px, 10, 13, 4, 10, ash_lt)

    # Ember sparks in body
    set_px(px, 13, 16, ember)
    set_px(px, 18, 18, ember)
    set_px(px, 15, 20, ember)
    set_px(px, 11, 14, ember)

    # Smoky arms reaching
    for dx in range(6):
        alpha = 160 - dx * 20
        if alpha > 0:
            set_px(px, 8 - dx, 15 + dx, (85, 85, 85, alpha))
            set_px(px, 8 - dx, 16 + dx, (85, 85, 85, max(0, alpha - 30)))
            set_px(px, 23 + dx, 15 + dx, (85, 85, 85, alpha))
            set_px(px, 23 + dx, 16 + dx, (85, 85, 85, max(0, alpha - 30)))

    # Tattered bottom (dissipating into smoke)
    for x in range(9, 23):
        depth = 4 if x % 3 == 0 else (3 if x % 2 == 0 else 2)
        for dy in range(depth):
            alpha = 150 - dy * 35
            if alpha > 0:
                set_px(px, x, 23 + dy, (85, 85, 85, alpha))

    # Floating embers around
    set_px(px, 7, 8, ember)
    set_px(px, 24, 6, ember)
    set_px(px, 5, 18, hex_to_rgba('#ff6600', 120))
    set_px(px, 26, 20, hex_to_rgba('#ff6600', 120))

    return px


# --- 26. FIRE BAT: flaming bat ---
def gen_fire_bat():
    px = new_canvas()
    body = hex_to_rgba('#ff4400')
    body_dk = darken(body)
    body_lt = lighten(body, 1.2)
    wing = hex_to_rgba('#cc3300')
    wing_dk = darken(wing)
    fire = hex_to_rgba('#ffaa00')
    fire_lt = hex_to_rgba('#ffee44')
    eye = hex_to_rgba('#ffffff')

    # Body (small, central)
    fill_rect(px, 14, 13, 4, 5, body)
    fill_rect(px, 14, 13, 4, 2, body_lt)

    # Head
    fill_rect(px, 14, 10, 4, 4, body)
    fill_rect(px, 14, 10, 4, 1, body_lt)
    # Ears (pointy, on fire)
    set_px(px, 14, 9, body)
    set_px(px, 13, 8, body)
    set_px(px, 13, 7, fire)
    set_px(px, 17, 9, body)
    set_px(px, 18, 8, body)
    set_px(px, 18, 7, fire)
    # Bright eyes
    set_px(px, 14, 11, eye)
    set_px(px, 17, 11, eye)

    # Flame trail on head
    set_px(px, 15, 8, fire)
    set_px(px, 16, 7, fire_lt)
    set_px(px, 15, 6, fire)
    set_px(px, 16, 6, fire_lt)

    # Left wing (spread, fiery)
    fill_rect(px, 8, 11, 6, 2, wing)
    fill_rect(px, 4, 12, 5, 2, wing)
    fill_rect(px, 2, 13, 4, 2, wing_dk)
    fill_rect(px, 1, 14, 3, 2, wing_dk)
    # Flame edges on wing
    set_px(px, 1, 13, fire)
    set_px(px, 3, 12, fire)
    set_px(px, 6, 11, fire)
    set_px(px, 1, 16, fire)
    set_px(px, 4, 15, fire)
    set_px(px, 7, 14, fire)

    # Right wing (spread, fiery)
    fill_rect(px, 18, 11, 6, 2, wing)
    fill_rect(px, 23, 12, 5, 2, wing)
    fill_rect(px, 26, 13, 4, 2, wing_dk)
    fill_rect(px, 28, 14, 3, 2, wing_dk)
    # Flame edges on wing
    set_px(px, 30, 13, fire)
    set_px(px, 28, 12, fire)
    set_px(px, 25, 11, fire)
    set_px(px, 30, 16, fire)
    set_px(px, 27, 15, fire)
    set_px(px, 24, 14, fire)

    # Small feet
    set_px(px, 15, 18, body_dk)
    set_px(px, 16, 18, body_dk)

    # Fire trail below
    set_px(px, 15, 19, fire)
    set_px(px, 16, 20, fire_lt)
    set_px(px, 15, 21, hex_to_rgba('#ffaa00', 140))
    set_px(px, 16, 22, hex_to_rgba('#ffaa00', 80))

    return px


# --- 27. MAGMA WORM: serpentine lava worm ---
def gen_magma_worm():
    px = new_canvas()
    body = hex_to_rgba('#cc3300')
    body_dk = darken(body)
    body_lt = lighten(body, 1.2)
    lava = hex_to_rgba('#ff6600')
    lava_lt = hex_to_rgba('#ffaa00')
    lava_hot = hex_to_rgba('#ffdd00')
    eye = hex_to_rgba('#ffee00')
    tooth = hex_to_rgba('#ffddaa')

    # Head (front-facing, round, open maw)
    fill_circle(px, 16, 6, 5, body)
    fill_circle(px, 16, 6, 4, body_lt)
    # Open maw (circular mouth with teeth)
    fill_circle(px, 16, 7, 3, hex_to_rgba('#220000'))
    fill_circle(px, 16, 7, 2, hex_to_rgba('#440000'))
    # Inner fire in mouth
    set_px(px, 16, 7, lava)
    set_px(px, 15, 7, lava_lt)
    set_px(px, 17, 7, lava_lt)
    # Teeth around mouth
    set_px(px, 14, 5, tooth)
    set_px(px, 16, 4, tooth)
    set_px(px, 18, 5, tooth)
    set_px(px, 14, 9, tooth)
    set_px(px, 16, 10, tooth)
    set_px(px, 18, 9, tooth)
    set_px(px, 13, 7, tooth)
    set_px(px, 19, 7, tooth)
    # Eyes (on sides of head)
    set_px(px, 12, 5, eye)
    set_px(px, 20, 5, eye)
    set_px(px, 12, 4, hex_to_rgba('#ffee00', 120))
    set_px(px, 20, 4, hex_to_rgba('#ffee00', 120))

    # Body segment 1 (curving right)
    fill_circle(px, 18, 13, 4, body)
    fill_circle(px, 18, 13, 3, body_lt)
    # Lava glow between segments
    set_px(px, 17, 10, lava)
    set_px(px, 18, 10, lava)
    set_px(px, 16, 11, lava_lt)

    # Body segment 2 (curving left)
    fill_circle(px, 13, 19, 4, body)
    fill_circle(px, 13, 19, 3, body_lt)
    # Lava between segments
    set_px(px, 15, 16, lava)
    set_px(px, 16, 17, lava)
    set_px(px, 14, 16, lava_lt)

    # Body segment 3 / tail (curving right again)
    fill_circle(px, 19, 25, 3, body)
    fill_circle(px, 19, 25, 2, body_lt)
    # Lava between segments
    set_px(px, 16, 22, lava)
    set_px(px, 15, 23, lava)
    set_px(px, 17, 23, lava_lt)

    # Tail tip
    set_px(px, 22, 27, body)
    set_px(px, 23, 28, body_dk)
    set_px(px, 24, 28, body_dk)
    set_px(px, 24, 29, lava)

    # Lava dripping from segments
    set_px(px, 22, 14, lava)
    set_px(px, 22, 15, hex_to_rgba('#ff6600', 140))
    set_px(px, 9, 20, lava)
    set_px(px, 9, 21, hex_to_rgba('#ff6600', 140))

    # Segment plate markings (armored look)
    for angle_x, angle_y, r in [(18, 13, 3), (13, 19, 3), (19, 25, 2)]:
        set_px(px, angle_x - r + 1, angle_y, body_dk)
        set_px(px, angle_x + r - 1, angle_y, body_dk)

    # Heat shimmer (scattered hot pixels)
    set_px(px, 10, 3, hex_to_rgba('#ffaa00', 80))
    set_px(px, 22, 2, hex_to_rgba('#ffaa00', 80))
    set_px(px, 8, 14, hex_to_rgba('#ff6600', 60))
    set_px(px, 25, 20, hex_to_rgba('#ff6600', 60))

    return px


# ========================================================================
# REGISTRY AND MAIN
# ========================================================================

GENERATORS = {
    'greyling': gen_greyling,
    'boar': gen_boar,
    'meadow_skeleton': gen_meadow_skeleton,
    'bramblethorn': gen_bramblethorn,
    'cave_bat': gen_cave_bat,
    'cave_spider': gen_cave_spider,
    'greydwarf': gen_greydwarf,
    'troll': gen_troll,
    'forest_ghost': gen_forest_ghost,
    'shadow_lurker': gen_shadow_lurker,
    'deep_troll': gen_deep_troll,
    'forest_guardian': gen_forest_guardian,
    'draugr': gen_draugr,
    'blob': gen_blob,
    'wraith': gen_wraith,
    'slime_beast': gen_slime_beast,
    'blind_crawler': gen_blind_crawler,
    'wolf': gen_wolf,
    'drake': gen_drake,
    'stone_golem': gen_stone_golem,
    'crystal_beetle': gen_crystal_beetle,
    'ice_golem': gen_ice_golem,
    'surtling': gen_surtling,
    'lava_golem': gen_lava_golem,
    'ash_wraith': gen_ash_wraith,
    'fire_bat': gen_fire_bat,
    'magma_worm': gen_magma_worm,
}

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, gen in GENERATORS.items():
        pixels = gen()
        png_data = make_png(pixels, SIZE, SIZE)
        path = os.path.join(OUT_DIR, f'{name}.png')
        with open(path, 'wb') as f:
            f.write(png_data)
        print(f'  {name}.png ({len(png_data)} bytes)')
    print(f'Generated {len(GENERATORS)} enemy sprites in {os.path.abspath(OUT_DIR)}')

if __name__ == '__main__':
    main()
