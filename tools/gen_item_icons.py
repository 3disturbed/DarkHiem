#!/usr/bin/env python3
"""Generate pixel-art item icons as 32x32 PNGs using only stdlib."""

import struct, zlib, os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'tileArt', 'items')
SIZE = 32

def hex_to_rgba(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2],16), int(h[2:4],16), int(h[4:6],16), a)

def darken(c, f=0.65):
    return (int(c[0]*f), int(c[1]*f), int(c[2]*f), c[3])

def lighten(c, f=1.4):
    return (min(255,int(c[0]*f)), min(255,int(c[1]*f)), min(255,int(c[2]*f)), c[3])

def blend(c1, c2, t):
    return (int(c1[0]*(1-t)+c2[0]*t), int(c1[1]*(1-t)+c2[1]*t),
            int(c1[2]*(1-t)+c2[2]*t), int(c1[3]*(1-t)+c2[3]*t))

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

def draw_circle(px, cx, cy, r, c):
    for y in range(-r, r+1):
        for x in range(-r, r+1):
            if x*x + y*y <= r*r:
                set_px(px, cx+x, cy+y, c)

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

def draw_diamond(px, cx, cy, r, c):
    for dy in range(-r, r+1):
        w = r - abs(dy)
        for dx in range(-w, w+1):
            set_px(px, cx+dx, cy+dy, c)

# ═══════════════════════════════════════════════════════
# TIER COLOR PALETTES
# ═══════════════════════════════════════════════════════

TIER_PALETTES = {
    0: {  # Primitive (wood/bone/stone)
        'metal': '#8B7355', 'metal_light': '#A0896B', 'metal_dark': '#6B5535',
        'accent': '#DEB887', 'handle': '#5A3A1A',
    },
    1: {  # Bronze
        'metal': '#CD7F32', 'metal_light': '#DAA06D', 'metal_dark': '#8B5A2B',
        'accent': '#FFD700', 'handle': '#5A3A1A',
    },
    2: {  # Iron/Steel
        'metal': '#808080', 'metal_light': '#A0A0A0', 'metal_dark': '#555555',
        'accent': '#C0C0C0', 'handle': '#4A2A1A',
    },
    3: {  # Silver
        'metal': '#C0C0C0', 'metal_light': '#E0E0E0', 'metal_dark': '#909090',
        'accent': '#FFFFFF', 'handle': '#3A2A1A',
    },
    4: {  # Obsidian
        'metal': '#4A2A5A', 'metal_light': '#6A3A7A', 'metal_dark': '#2A1A3A',
        'accent': '#9933FF', 'handle': '#2A1A2A',
    },
    5: {  # Flametal
        'metal': '#CC4400', 'metal_light': '#FF6600', 'metal_dark': '#881100',
        'accent': '#FFAA00', 'handle': '#331100',
    },
}

def pal_c(pal, key):
    return hex_to_rgba(pal[key])

# ═══════════════════════════════════════════════════════
# WEAPON TEMPLATES
# ═══════════════════════════════════════════════════════

def draw_sword(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    ac = pal_c(pal,'accent'); hd = hex_to_rgba(pal['handle'])
    # Blade (diagonal bottom-left to top-right)
    draw_line(px, 20, 4, 10, 20, m)
    draw_line(px, 21, 5, 11, 21, ml)
    draw_line(px, 22, 5, 12, 21, md)
    draw_line(px, 21, 4, 11, 20, m)
    # Tip
    set_px(px, 20, 3, ml); set_px(px, 19, 3, ml)
    # Edge highlight
    draw_line(px, 20, 4, 12, 18, lighten(ml))
    # Guard
    fill_rect(px, 8, 20, 10, 2, ac)
    # Grip
    fill_rect(px, 10, 22, 3, 5, hd)
    fill_rect(px, 11, 22, 1, 5, lighten(hd))
    # Pommel
    fill_rect(px, 10, 27, 3, 2, ac)

def draw_club(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    hd = hex_to_rgba(pal['handle'])
    # Thick wooden club head
    fill_rect(px, 12, 4, 8, 10, m)
    fill_rect(px, 11, 6, 10, 6, m)
    fill_rect(px, 12, 4, 3, 4, ml)
    # Handle
    fill_rect(px, 14, 14, 4, 12, hd)
    fill_rect(px, 15, 14, 1, 12, lighten(hd))
    # Texture knots
    set_px(px, 14, 7, md); set_px(px, 18, 9, md)

def draw_mace(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    ac = pal_c(pal,'accent'); hd = hex_to_rgba(pal['handle'])
    # Flanged head
    fill_rect(px, 10, 4, 12, 10, m)
    fill_rect(px, 9, 6, 14, 6, m)
    # Flanges
    fill_rect(px, 8, 5, 2, 8, md)
    fill_rect(px, 22, 5, 2, 8, md)
    fill_rect(px, 12, 3, 8, 2, md)
    # Highlight
    fill_rect(px, 11, 5, 4, 4, ml)
    set_px(px, 12, 6, lighten(ml))
    # Handle
    fill_rect(px, 14, 14, 4, 12, hd)
    fill_rect(px, 15, 14, 1, 12, lighten(hd))
    # Ring
    fill_rect(px, 13, 14, 6, 1, ac)

def draw_axe(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    hd = hex_to_rgba(pal['handle'])
    # Axe head (right side)
    fill_rect(px, 16, 4, 8, 10, m)
    fill_rect(px, 18, 3, 6, 12, m)
    fill_rect(px, 20, 2, 5, 2, md)
    fill_rect(px, 20, 13, 5, 2, md)
    # Blade edge
    fill_rect(px, 24, 4, 2, 10, ml)
    set_px(px, 25, 5, lighten(ml))
    # Handle (vertical)
    fill_rect(px, 14, 3, 3, 25, hd)
    fill_rect(px, 15, 3, 1, 25, lighten(hd))

def draw_battleaxe(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    hd = hex_to_rgba(pal['handle'])
    # Double-sided axe head
    fill_rect(px, 4, 4, 8, 10, m)
    fill_rect(px, 20, 4, 8, 10, m)
    fill_rect(px, 2, 5, 4, 8, md)
    fill_rect(px, 26, 5, 4, 8, md)
    # Blade edges
    fill_rect(px, 2, 6, 2, 6, ml)
    fill_rect(px, 28, 6, 2, 6, ml)
    # Center shaft
    fill_rect(px, 14, 2, 4, 28, hd)
    fill_rect(px, 15, 2, 2, 28, lighten(hd))
    # Head connection
    fill_rect(px, 12, 6, 8, 6, m)
    fill_rect(px, 13, 5, 6, 1, md)

def draw_spear(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    hd = hex_to_rgba(pal['handle'])
    # Long shaft
    fill_rect(px, 15, 8, 2, 22, hd)
    set_px(px, 16, 8, lighten(hd))
    # Spear head (pointed)
    fill_rect(px, 14, 4, 4, 5, m)
    fill_rect(px, 15, 2, 2, 3, ml)
    set_px(px, 15, 1, ml); set_px(px, 16, 1, m)
    # Tip
    set_px(px, 15, 0, lighten(ml))
    # Head shadow
    fill_rect(px, 17, 5, 1, 3, md)
    # Binding
    fill_rect(px, 14, 8, 4, 1, hex_to_rgba('#444444'))

def draw_dagger(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    ac = pal_c(pal,'accent'); hd = hex_to_rgba(pal['handle'])
    # Short blade (diagonal)
    draw_line(px, 19, 6, 13, 16, m)
    draw_line(px, 20, 7, 14, 17, ml)
    draw_line(px, 20, 6, 14, 16, md)
    # Tip
    set_px(px, 19, 5, ml)
    # Guard
    fill_rect(px, 10, 17, 8, 2, ac)
    # Grip
    fill_rect(px, 13, 19, 3, 6, hd)
    set_px(px, 14, 19, lighten(hd))
    # Pommel
    fill_rect(px, 13, 25, 3, 2, md)

def draw_atgeir(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    hd = hex_to_rgba(pal['handle'])
    # Long shaft
    fill_rect(px, 15, 6, 2, 24, hd)
    set_px(px, 16, 6, lighten(hd))
    # Wide blade at tip
    fill_rect(px, 11, 2, 10, 5, m)
    fill_rect(px, 10, 3, 12, 3, m)
    fill_rect(px, 12, 1, 8, 2, ml)
    # Blade edge
    fill_rect(px, 10, 3, 1, 3, ml)
    fill_rect(px, 21, 3, 1, 3, ml)
    # Shadow
    fill_rect(px, 12, 6, 8, 1, md)
    # Cross guard
    fill_rect(px, 13, 7, 6, 1, hex_to_rgba('#444444'))

def draw_bow(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light')
    hd = hex_to_rgba(pal['handle'])
    hd_l = lighten(hd)
    string = hex_to_rgba('#ccccaa')
    # Bow limbs (curved)
    import math
    for t in range(30):
        a = -math.pi*0.7 + t * math.pi * 1.4 / 30
        x = int(12 + 10 * math.cos(a))
        y = int(15 + 12 * math.sin(a))
        set_px(px, x, y, hd)
        set_px(px, x+1, y, hd_l)
    # Metal tips
    set_px(px, 12, 3, m); set_px(px, 13, 3, ml)
    set_px(px, 12, 27, m); set_px(px, 13, 27, ml)
    # String
    draw_line(px, 13, 4, 13, 26, string)
    # Grip area
    fill_rect(px, 10, 13, 3, 5, hd)
    fill_rect(px, 11, 13, 1, 5, hd_l)
    # Arrow nocked
    draw_line(px, 14, 15, 26, 15, hex_to_rgba('#8B6914'))
    # Arrowhead
    set_px(px, 26, 14, m); set_px(px, 26, 16, m)
    set_px(px, 27, 15, ml)

def draw_knuckles(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    # Knuckle bar
    fill_rect(px, 7, 10, 18, 12, m)
    fill_rect(px, 7, 10, 18, 2, ml)
    fill_rect(px, 7, 20, 18, 2, md)
    # Finger holes
    for x in [9, 14, 19]:
        fill_rect(px, x, 13, 3, 5, hex_to_rgba('#111111'))
    # Grip bar
    fill_rect(px, 8, 22, 16, 3, md)
    # Spike/stud accents on top
    for x in [10, 15, 20]:
        fill_rect(px, x, 9, 2, 2, ml)
    # Highlight
    set_px(px, 8, 11, lighten(ml))

def draw_greatsword(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    ac = pal_c(pal,'accent'); hd = hex_to_rgba(pal['handle'])
    # Wide blade
    fill_rect(px, 13, 2, 6, 18, m)
    fill_rect(px, 12, 4, 8, 14, m)
    fill_rect(px, 13, 2, 2, 16, ml)
    fill_rect(px, 18, 4, 2, 14, md)
    # Tip
    fill_rect(px, 14, 1, 4, 2, ml)
    set_px(px, 15, 0, lighten(ml)); set_px(px, 16, 0, ml)
    # Fuller (groove)
    fill_rect(px, 15, 4, 2, 12, md)
    # Guard
    fill_rect(px, 7, 19, 18, 2, ac)
    fill_rect(px, 6, 19, 1, 2, darken(ac)); fill_rect(px, 25, 19, 1, 2, darken(ac))
    # Grip
    fill_rect(px, 14, 21, 4, 5, hd)
    fill_rect(px, 15, 21, 2, 5, lighten(hd))
    # Pommel
    fill_rect(px, 13, 26, 6, 3, ac)
    fill_rect(px, 14, 27, 4, 1, lighten(ac))

def draw_shield(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    ac = pal_c(pal,'accent')
    # Round shield body
    draw_circle(px, 15, 15, 12, m)
    draw_circle(px, 14, 14, 10, ml)
    draw_circle(px, 15, 15, 10, m)
    # Rim
    import math
    for t in range(48):
        a = t * math.pi * 2 / 48
        x = int(15 + 12 * math.cos(a))
        y = int(15 + 12 * math.sin(a))
        set_px(px, x, y, md)
    # Boss (center)
    draw_circle(px, 15, 15, 3, ac)
    draw_circle(px, 14, 14, 2, lighten(ac))
    # Cross pattern
    fill_rect(px, 14, 5, 3, 21, md)
    fill_rect(px, 5, 14, 21, 3, md)

# ═══════════════════════════════════════════════════════
# ARMOR TEMPLATES
# ═══════════════════════════════════════════════════════

def draw_helmet(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    ac = pal_c(pal,'accent')
    # Dome
    draw_circle(px, 15, 13, 10, m)
    draw_circle(px, 14, 12, 8, ml)
    # Brim
    fill_rect(px, 4, 18, 24, 3, md)
    fill_rect(px, 4, 18, 24, 1, ml)
    # Nose guard
    fill_rect(px, 14, 18, 4, 6, m)
    fill_rect(px, 14, 18, 2, 6, ml)
    # Face opening
    fill_rect(px, 8, 20, 6, 4, hex_to_rgba('#111111'))
    fill_rect(px, 18, 20, 6, 4, hex_to_rgba('#111111'))
    # Accent stripe
    fill_rect(px, 14, 5, 4, 14, ac)
    fill_rect(px, 15, 5, 2, 14, lighten(ac))

def draw_chestplate(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    ac = pal_c(pal,'accent')
    # Torso shape
    fill_rect(px, 7, 4, 18, 20, m)
    fill_rect(px, 5, 6, 4, 14, m)  # left shoulder
    fill_rect(px, 23, 6, 4, 14, m)  # right shoulder
    # Neckline
    fill_rect(px, 12, 3, 8, 3, md)
    fill_rect(px, 13, 2, 6, 2, hex_to_rgba('#111111'))
    # Highlight
    fill_rect(px, 8, 5, 5, 8, ml)
    # Plate lines
    fill_rect(px, 7, 14, 18, 1, md)
    fill_rect(px, 7, 18, 18, 1, md)
    # Center accent
    fill_rect(px, 14, 6, 4, 16, ac)
    fill_rect(px, 15, 7, 2, 14, lighten(ac))
    # Bottom edge
    fill_rect(px, 7, 23, 18, 1, md)

def draw_greaves(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    ac = pal_c(pal,'accent')
    # Left leg
    fill_rect(px, 6, 3, 8, 22, m)
    fill_rect(px, 7, 4, 3, 10, ml)
    # Right leg
    fill_rect(px, 18, 3, 8, 22, m)
    fill_rect(px, 19, 4, 3, 10, ml)
    # Knee guards
    fill_rect(px, 5, 12, 10, 4, md)
    fill_rect(px, 17, 12, 10, 4, md)
    fill_rect(px, 6, 12, 8, 1, ml)
    fill_rect(px, 18, 12, 8, 1, ml)
    # Accent stripes
    fill_rect(px, 9, 4, 2, 18, ac)
    fill_rect(px, 21, 4, 2, 18, ac)
    # Belt area top
    fill_rect(px, 5, 3, 22, 2, md)
    fill_rect(px, 5, 3, 22, 1, ac)

def draw_boots(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    ac = pal_c(pal,'accent')
    # Left boot
    fill_rect(px, 4, 6, 9, 14, m)
    fill_rect(px, 2, 20, 12, 6, m)
    fill_rect(px, 5, 7, 4, 6, ml)
    # Right boot
    fill_rect(px, 19, 6, 9, 14, m)
    fill_rect(px, 18, 20, 12, 6, m)
    fill_rect(px, 20, 7, 4, 6, ml)
    # Soles
    fill_rect(px, 2, 25, 12, 2, md)
    fill_rect(px, 18, 25, 12, 2, md)
    # Top cuff
    fill_rect(px, 4, 6, 9, 2, ac)
    fill_rect(px, 19, 6, 9, 2, ac)
    # Toe caps
    fill_rect(px, 2, 20, 3, 4, md)
    fill_rect(px, 27, 20, 3, 4, md)

def draw_ring(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    ac = pal_c(pal,'accent')
    # Ring circle
    import math
    for t in range(48):
        a = t * math.pi * 2 / 48
        for r in range(7, 11):
            x = int(15 + r * math.cos(a))
            y = int(15 + r * math.sin(a))
            c = ml if r == 7 else m if r < 10 else md
            set_px(px, x, y, c)
    # Gem setting at top
    draw_circle(px, 15, 6, 3, ac)
    draw_circle(px, 14, 5, 2, lighten(ac))
    set_px(px, 14, 5, hex_to_rgba('#ffffff', 200))

# ═══════════════════════════════════════════════════════
# TOOL TEMPLATES
# ═══════════════════════════════════════════════════════

def draw_pickaxe(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    hd = hex_to_rgba(pal['handle'])
    # Handle (diagonal)
    draw_line(px, 8, 24, 22, 8, hd)
    draw_line(px, 9, 24, 23, 8, lighten(hd))
    # Pick head
    fill_rect(px, 16, 4, 10, 4, m)
    fill_rect(px, 25, 5, 3, 2, ml)  # pointed tip
    set_px(px, 27, 5, lighten(ml))
    fill_rect(px, 14, 5, 3, 3, m)   # blunt end
    # Highlight
    fill_rect(px, 17, 4, 4, 1, ml)

def draw_hatchet(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light'); md = pal_c(pal,'metal_dark')
    hd = hex_to_rgba(pal['handle'])
    # Handle
    fill_rect(px, 14, 6, 3, 22, hd)
    fill_rect(px, 15, 6, 1, 22, lighten(hd))
    # Axe head (right side, smaller than weapon axe)
    fill_rect(px, 17, 4, 7, 8, m)
    fill_rect(px, 19, 3, 5, 10, m)
    fill_rect(px, 23, 4, 2, 8, ml)
    # Shadow
    fill_rect(px, 17, 11, 7, 1, md)

def draw_fishing_rod(px, pal):
    m = pal_c(pal,'metal'); ml = pal_c(pal,'metal_light')
    hd = hex_to_rgba(pal['handle'])
    string = hex_to_rgba('#ccccaa')
    # Rod (diagonal, long and thin)
    draw_line(px, 6, 28, 24, 4, hd)
    draw_line(px, 7, 28, 25, 4, lighten(hd))
    # Tip eye
    set_px(px, 24, 3, m); set_px(px, 25, 3, ml)
    # Reel (circle on rod)
    draw_circle(px, 10, 24, 3, m)
    draw_circle(px, 9, 23, 2, ml)
    # Line hanging from tip
    draw_line(px, 25, 4, 28, 10, string)
    draw_line(px, 28, 10, 28, 16, string)
    # Hook
    set_px(px, 28, 17, m); set_px(px, 27, 18, m); set_px(px, 28, 18, ml)
    # Grip
    fill_rect(px, 5, 27, 4, 3, hex_to_rgba('#333333'))

# ═══════════════════════════════════════════════════════
# SPECIAL WEAPON GENERATORS
# ═══════════════════════════════════════════════════════

def gen_staff(color_hex, glow_hex):
    px = new_canvas()
    c = hex_to_rgba(color_hex)
    glow = hex_to_rgba(glow_hex, 140)
    wood = hex_to_rgba('#5A3A1A')
    wood_l = lighten(wood)
    # Staff shaft
    fill_rect(px, 15, 8, 2, 22, wood)
    set_px(px, 16, 8, wood_l)
    # Orb at top
    draw_circle(px, 16, 6, 5, glow)
    draw_circle(px, 16, 6, 4, c)
    draw_circle(px, 15, 5, 2, lighten(c))
    set_px(px, 14, 4, hex_to_rgba('#ffffff', 200))
    # Prongs holding orb
    set_px(px, 12, 8, wood); set_px(px, 20, 8, wood)
    set_px(px, 12, 7, wood); set_px(px, 20, 7, wood)
    return px

def gen_fire_staff():
    return gen_staff('#e74c3c', '#ff6600')

def gen_ice_staff():
    return gen_staff('#3498db', '#5dade2')

def gen_lightning_staff():
    return gen_staff('#f1c40f', '#f39c12')

def gen_nature_staff():
    return gen_staff('#2ecc71', '#27ae60')

def gen_witchdoctor_staff():
    px = gen_staff('#9b59b6', '#8e44ad')
    # Add skull totem
    fill_rect(px, 13, 1, 6, 4, hex_to_rgba('#ddddcc'))
    set_px(px, 14, 2, hex_to_rgba('#111111'))
    set_px(px, 17, 2, hex_to_rgba('#111111'))
    return px

def gen_runic_blade():
    px = new_canvas()
    pal = TIER_PALETTES[3]
    draw_sword(px, pal)
    # Add blue runes on blade
    rune = hex_to_rgba('#3498db', 180)
    for y in [6, 10, 14]:
        set_px(px, 17, y, rune)
        set_px(px, 18, y+1, rune)
    return px

def gen_venom_dagger():
    px = new_canvas()
    pal = TIER_PALETTES[1]
    draw_dagger(px, pal)
    # Green poison glow
    green = hex_to_rgba('#2ecc71', 140)
    for y in range(8, 16):
        set_px(px, 17, y, green)
    return px

def gen_frostforged_blade():
    px = new_canvas()
    pal = TIER_PALETTES[4]
    draw_greatsword(px, pal)
    # Ice blue glow on blade
    ice = hex_to_rgba('#5dade2', 120)
    for y in range(4, 18):
        set_px(px, 14, y, ice)
    return px

def gen_infernal_sword():
    px = new_canvas()
    pal = TIER_PALETTES[5]
    draw_sword(px, pal)
    # Fire particles
    fire = hex_to_rgba('#ff6600', 160)
    for pos in [(18,6),(16,10),(19,14)]:
        set_px(px, pos[0], pos[1], fire)
        set_px(px, pos[0]+1, pos[1]-1, hex_to_rgba('#ffaa00', 120))
    return px

# ═══════════════════════════════════════════════════════
# SPECIAL ARMOR GENERATORS
# ═══════════════════════════════════════════════════════

def gen_witchdoctor_mask():
    px = new_canvas()
    mask = hex_to_rgba('#8B4513'); mask_l = lighten(mask)
    green = hex_to_rgba('#2ecc71')
    # Wooden mask face
    fill_rect(px, 8, 5, 16, 18, mask)
    fill_rect(px, 7, 7, 18, 14, mask)
    fill_rect(px, 9, 6, 14, 2, mask_l)
    # Eyes (slanted)
    fill_rect(px, 10, 10, 4, 3, hex_to_rgba('#111111'))
    fill_rect(px, 18, 10, 4, 3, hex_to_rgba('#111111'))
    set_px(px, 11, 11, green); set_px(px, 19, 11, green)
    # Mouth
    fill_rect(px, 11, 17, 10, 2, hex_to_rgba('#111111'))
    # Feathers on top
    fill_rect(px, 12, 2, 2, 5, hex_to_rgba('#e74c3c'))
    fill_rect(px, 15, 1, 2, 6, hex_to_rgba('#2ecc71'))
    fill_rect(px, 18, 2, 2, 5, hex_to_rgba('#3498db'))
    return px

def gen_witchdoctor_vest():
    px = new_canvas()
    leather = hex_to_rgba('#6B4226'); ll = lighten(leather)
    bone = hex_to_rgba('#ddddcc')
    # Leather vest
    fill_rect(px, 8, 5, 16, 18, leather)
    fill_rect(px, 6, 7, 4, 12, leather)
    fill_rect(px, 22, 7, 4, 12, leather)
    fill_rect(px, 9, 6, 6, 6, ll)
    fill_rect(px, 12, 3, 8, 3, hex_to_rgba('#111111'))
    # Bone necklace
    for x in range(10, 22, 3):
        fill_rect(px, x, 6, 2, 3, bone)
    return px

def gen_witchdoctor_kilt():
    px = new_canvas()
    leather = hex_to_rgba('#6B4226'); ll = lighten(leather)
    # Kilt
    fill_rect(px, 7, 4, 18, 6, leather)
    fill_rect(px, 6, 10, 20, 14, leather)
    fill_rect(px, 8, 5, 8, 4, ll)
    # Fringe strips
    for x in range(7, 25, 3):
        fill_rect(px, x, 24, 2, 4, darken(leather))
    # Belt
    fill_rect(px, 6, 4, 20, 2, hex_to_rgba('#444444'))
    return px

def gen_witchdoctor_sandals():
    px = new_canvas()
    leather = hex_to_rgba('#6B4226')
    # Simple sandals
    fill_rect(px, 4, 18, 10, 8, leather)
    fill_rect(px, 18, 18, 10, 8, leather)
    fill_rect(px, 4, 25, 10, 2, darken(leather))
    fill_rect(px, 18, 25, 10, 2, darken(leather))
    # Straps
    fill_rect(px, 6, 18, 6, 1, lighten(leather))
    fill_rect(px, 20, 18, 6, 1, lighten(leather))
    fill_rect(px, 8, 18, 1, 6, lighten(leather))
    fill_rect(px, 22, 18, 1, 6, lighten(leather))
    return px

def gen_mage_hood():
    px = new_canvas()
    blue = hex_to_rgba('#2c3e6e'); bl = lighten(blue); bd = darken(blue)
    gold = hex_to_rgba('#ffd700')
    # Hood
    draw_circle(px, 15, 12, 10, blue)
    fill_rect(px, 5, 12, 22, 12, blue)
    draw_circle(px, 14, 11, 8, bl)
    # Face opening (dark)
    fill_rect(px, 10, 14, 12, 8, hex_to_rgba('#111111'))
    fill_rect(px, 11, 13, 10, 2, hex_to_rgba('#111111'))
    # Gold trim
    for t in range(20):
        import math
        a = math.pi * 0.3 + t * math.pi * 0.4 / 20
        x = int(15 + 10 * math.cos(a))
        y = int(12 + 10 * math.sin(a))
        set_px(px, x, y, gold)
    return px

def gen_mage_robe():
    px = new_canvas()
    blue = hex_to_rgba('#2c3e6e'); bl = lighten(blue)
    gold = hex_to_rgba('#ffd700')
    # Robe body
    fill_rect(px, 7, 3, 18, 24, blue)
    fill_rect(px, 5, 6, 4, 16, blue)
    fill_rect(px, 23, 6, 4, 16, blue)
    fill_rect(px, 8, 4, 8, 8, bl)
    # Neckline
    fill_rect(px, 12, 2, 8, 3, hex_to_rgba('#111111'))
    # Gold trim center
    fill_rect(px, 14, 5, 4, 20, gold)
    fill_rect(px, 15, 6, 2, 18, lighten(gold))
    # Bottom edge
    fill_rect(px, 7, 26, 18, 1, gold)
    # Sleeve cuffs
    fill_rect(px, 5, 20, 4, 1, gold)
    fill_rect(px, 23, 20, 4, 1, gold)
    return px

def gen_mage_leggings():
    px = new_canvas()
    blue = hex_to_rgba('#2c3e6e'); bl = lighten(blue)
    gold = hex_to_rgba('#ffd700')
    # Legging legs
    fill_rect(px, 6, 3, 8, 24, blue)
    fill_rect(px, 18, 3, 8, 24, blue)
    fill_rect(px, 7, 4, 4, 10, bl)
    fill_rect(px, 19, 4, 4, 10, bl)
    # Gold stripe
    fill_rect(px, 9, 4, 2, 20, gold)
    fill_rect(px, 21, 4, 2, 20, gold)
    # Belt
    fill_rect(px, 5, 3, 22, 2, darken(blue))
    fill_rect(px, 5, 3, 22, 1, gold)
    return px

def gen_mage_sandals():
    px = new_canvas()
    blue = hex_to_rgba('#2c3e6e')
    gold = hex_to_rgba('#ffd700')
    # Sandals
    fill_rect(px, 4, 18, 10, 8, blue)
    fill_rect(px, 18, 18, 10, 8, blue)
    fill_rect(px, 4, 25, 10, 2, darken(blue))
    fill_rect(px, 18, 25, 10, 2, darken(blue))
    # Gold straps
    fill_rect(px, 6, 18, 6, 1, gold)
    fill_rect(px, 20, 18, 6, 1, gold)
    fill_rect(px, 8, 18, 1, 6, gold)
    fill_rect(px, 22, 18, 1, 6, gold)
    return px

# ═══════════════════════════════════════════════════════
# CONSUMABLE GENERATORS
# ═══════════════════════════════════════════════════════

def gen_cooked_meat():
    px = new_canvas()
    meat = hex_to_rgba('#8B4513'); meat_l = lighten(meat)
    sear = hex_to_rgba('#CC6633')
    # Meat chunk
    draw_circle(px, 15, 15, 8, meat)
    draw_circle(px, 14, 14, 6, meat_l)
    draw_circle(px, 13, 13, 3, sear)
    # Bone sticking out
    fill_rect(px, 22, 10, 6, 2, hex_to_rgba('#ddddcc'))
    fill_rect(px, 27, 9, 2, 4, hex_to_rgba('#ddddcc'))
    # Sear marks
    draw_line(px, 10, 12, 18, 18, darken(meat))
    draw_line(px, 8, 16, 16, 20, darken(meat))
    return px

def gen_berry_juice():
    px = new_canvas()
    glass = hex_to_rgba('#aaaacc', 160)
    juice = hex_to_rgba('#9b59b6')
    # Cup/glass shape
    fill_rect(px, 10, 8, 12, 16, glass)
    fill_rect(px, 9, 8, 14, 2, lighten(glass))
    # Juice fill
    fill_rect(px, 11, 12, 10, 11, juice)
    fill_rect(px, 12, 13, 4, 4, lighten(juice))
    # Base
    fill_rect(px, 9, 24, 14, 2, darken(glass))
    return px

def gen_mushroom_soup():
    px = new_canvas()
    bowl = hex_to_rgba('#8B6914')
    soup = hex_to_rgba('#cc8844')
    # Bowl shape
    fill_rect(px, 5, 14, 22, 10, bowl)
    fill_rect(px, 4, 14, 24, 2, lighten(bowl))
    fill_rect(px, 7, 24, 18, 2, darken(bowl))
    # Soup
    fill_rect(px, 7, 14, 18, 6, soup)
    fill_rect(px, 8, 15, 8, 3, lighten(soup))
    # Mushroom bits
    set_px(px, 12, 16, hex_to_rgba('#cc4444'))
    set_px(px, 18, 15, hex_to_rgba('#cc4444'))
    # Steam
    for x in [12, 16, 20]:
        set_px(px, x, 12, hex_to_rgba('#cccccc', 100))
        set_px(px, x, 10, hex_to_rgba('#cccccc', 60))
    return px

def gen_cooked_rabbit():
    px = new_canvas()
    meat = hex_to_rgba('#B8763A'); meat_l = lighten(meat)
    # Small roasted piece
    draw_circle(px, 15, 16, 6, meat)
    draw_circle(px, 14, 15, 4, meat_l)
    # Small bone
    fill_rect(px, 20, 12, 5, 2, hex_to_rgba('#ddddcc'))
    # Sear lines
    draw_line(px, 11, 14, 17, 19, darken(meat))
    return px

def gen_rabbit_stew():
    px = new_canvas()
    bowl = hex_to_rgba('#8B6914')
    stew = hex_to_rgba('#B8763A')
    # Bowl
    fill_rect(px, 5, 14, 22, 10, bowl)
    fill_rect(px, 4, 14, 24, 2, lighten(bowl))
    fill_rect(px, 7, 24, 18, 2, darken(bowl))
    # Stew
    fill_rect(px, 7, 14, 18, 6, stew)
    fill_rect(px, 8, 15, 6, 3, lighten(stew))
    # Carrot bits
    set_px(px, 14, 16, hex_to_rgba('#ff8800'))
    set_px(px, 19, 15, hex_to_rgba('#ff8800'))
    # Steam
    for x in [11, 15, 19]:
        set_px(px, x, 12, hex_to_rgba('#cccccc', 100))
        set_px(px, x+1, 10, hex_to_rgba('#cccccc', 60))
    return px

def gen_bomb():
    px = new_canvas()
    body = hex_to_rgba('#333333')
    # Round bomb
    draw_circle(px, 15, 17, 8, body)
    draw_circle(px, 14, 16, 6, lighten(body))
    set_px(px, 12, 14, hex_to_rgba('#555555'))
    # Fuse
    draw_line(px, 15, 9, 18, 4, hex_to_rgba('#8B6914'))
    # Spark
    set_px(px, 18, 3, hex_to_rgba('#ffcc00'))
    set_px(px, 19, 3, hex_to_rgba('#ff8800'))
    set_px(px, 18, 2, hex_to_rgba('#ff6600'))
    return px

def gen_fire_bomb():
    px = gen_bomb()
    # Red tint
    fill_rect(px, 10, 12, 10, 10, hex_to_rgba('#ff4400', 60))
    # Flame symbol
    set_px(px, 14, 16, hex_to_rgba('#ff6600'))
    set_px(px, 15, 15, hex_to_rgba('#ffaa00'))
    set_px(px, 16, 16, hex_to_rgba('#ff6600'))
    return px

def gen_frost_bomb():
    px = gen_bomb()
    # Blue tint
    fill_rect(px, 10, 12, 10, 10, hex_to_rgba('#3498db', 60))
    # Ice symbol
    set_px(px, 15, 15, hex_to_rgba('#aaddff'))
    set_px(px, 14, 16, hex_to_rgba('#5dade2'))
    set_px(px, 16, 16, hex_to_rgba('#5dade2'))
    set_px(px, 15, 17, hex_to_rgba('#5dade2'))
    return px

def gen_grilled_fish(color_hex='#B8763A'):
    px = new_canvas()
    fish = hex_to_rgba(color_hex); fish_l = lighten(fish)
    # Fish silhouette
    fill_rect(px, 6, 13, 18, 6, fish)
    fill_rect(px, 8, 11, 14, 2, fish)
    fill_rect(px, 8, 19, 14, 2, fish)
    fill_rect(px, 4, 14, 3, 4, fish_l)  # head
    # Tail
    fill_rect(px, 24, 11, 3, 3, fish)
    fill_rect(px, 24, 18, 3, 3, fish)
    fill_rect(px, 26, 12, 2, 8, fish)
    # Eye
    set_px(px, 5, 15, hex_to_rgba('#111111'))
    # Grill marks
    draw_line(px, 10, 12, 10, 20, darken(fish))
    draw_line(px, 15, 12, 15, 20, darken(fish))
    draw_line(px, 20, 12, 20, 20, darken(fish))
    return px

# ═══════════════════════════════════════════════════════
# MATERIAL GENERATORS
# ═══════════════════════════════════════════════════════

def gen_ore(color_hex, vein_hex):
    px = new_canvas()
    rock = hex_to_rgba('#666666')
    rock_d = darken(rock)
    vein = hex_to_rgba(vein_hex)
    ore = hex_to_rgba(color_hex)
    # Rock shape
    draw_circle(px, 15, 16, 10, rock)
    draw_circle(px, 14, 15, 8, lighten(rock))
    # Faceted edges
    fill_rect(px, 6, 18, 20, 6, rock_d)
    # Ore veins
    for pos in [(11,12),(17,14),(13,18),(19,11),(15,16)]:
        fill_rect(px, pos[0], pos[1], 3, 2, ore)
        set_px(px, pos[0], pos[1], vein)
    return px

def gen_ingot(color_hex):
    px = new_canvas()
    m = hex_to_rgba(color_hex); ml = lighten(m); md = darken(m)
    # Trapezoidal ingot bar
    fill_rect(px, 8, 12, 16, 10, m)
    fill_rect(px, 6, 14, 20, 6, m)
    # Top face (lighter)
    fill_rect(px, 8, 10, 16, 3, ml)
    fill_rect(px, 10, 9, 12, 2, lighten(ml))
    # Side shadow
    fill_rect(px, 6, 19, 20, 2, md)
    # Highlight
    set_px(px, 11, 10, hex_to_rgba('#ffffff', 160))
    return px

def gen_plank(color_hex):
    px = new_canvas()
    w = hex_to_rgba(color_hex); wl = lighten(w); wd = darken(w)
    # Wooden plank
    fill_rect(px, 4, 10, 24, 12, w)
    fill_rect(px, 4, 10, 24, 2, wl)
    fill_rect(px, 4, 20, 24, 2, wd)
    # Grain lines
    for y in [13, 16]:
        draw_line(px, 5, y, 26, y, wd)
    # End grain
    fill_rect(px, 4, 10, 2, 12, wd)
    fill_rect(px, 26, 10, 2, 12, wd)
    return px

def gen_wood():
    px = new_canvas()
    w = hex_to_rgba('#8B6914'); wl = lighten(w); wd = darken(w)
    # Log shape
    fill_rect(px, 6, 8, 20, 16, w)
    # Round end
    draw_circle(px, 22, 16, 7, hex_to_rgba('#DEB887'))
    draw_circle(px, 22, 16, 5, hex_to_rgba('#C8A870'))
    # Rings
    import math
    for r in [2, 4]:
        for t in range(16):
            a = t * math.pi * 2 / 16
            x = int(22 + r * math.cos(a))
            y = int(16 + r * math.sin(a))
            set_px(px, x, y, wd)
    # Bark texture
    fill_rect(px, 6, 8, 2, 16, wd)
    fill_rect(px, 6, 8, 16, 1, wd)
    fill_rect(px, 6, 23, 16, 1, wd)
    return px

def gen_stick():
    px = new_canvas()
    w = hex_to_rgba('#8B6914'); wl = lighten(w)
    draw_line(px, 8, 26, 22, 4, w)
    draw_line(px, 9, 26, 23, 4, wl)
    # Knot
    set_px(px, 14, 17, darken(w))
    return px

def gen_stone():
    px = new_canvas()
    grey = hex_to_rgba('#888888'); gl = lighten(grey); gd = darken(grey)
    draw_circle(px, 15, 16, 9, grey)
    draw_circle(px, 14, 15, 7, gl)
    fill_rect(px, 8, 18, 16, 6, gd)
    set_px(px, 12, 13, hex_to_rgba('#aaaaaa'))
    return px

def gen_arrow():
    px = new_canvas()
    shaft = hex_to_rgba('#8B6914')
    head = hex_to_rgba('#888888')
    feather = hex_to_rgba('#ffffff', 180)
    # Shaft
    draw_line(px, 8, 26, 24, 6, shaft)
    draw_line(px, 9, 26, 25, 6, lighten(shaft))
    # Arrowhead
    set_px(px, 25, 5, head); set_px(px, 26, 5, head)
    set_px(px, 24, 5, lighten(head))
    set_px(px, 25, 4, lighten(head))
    # Fletching
    fill_rect(px, 7, 25, 3, 2, feather)
    fill_rect(px, 8, 27, 3, 1, feather)
    return px

def gen_gold():
    px = new_canvas()
    gold = hex_to_rgba('#FFD700'); gl = lighten(gold); gd = darken(gold)
    # Stack of coins
    for y_off in [0, 3, 6]:
        draw_circle(px, 15, 20-y_off, 6, gold)
        draw_circle(px, 14, 19-y_off, 4, gl)
        fill_rect(px, 10, 20-y_off, 11, 2, gd)
    # Top coin shine
    set_px(px, 13, 12, hex_to_rgba('#ffffff', 200))
    return px

def gen_leather_scrap():
    px = new_canvas()
    l = hex_to_rgba('#A0522D'); ll = lighten(l)
    fill_rect(px, 6, 8, 18, 16, l)
    fill_rect(px, 8, 10, 8, 6, ll)
    # Rough torn edges
    for x in range(6, 24, 3):
        set_px(px, x, 8, ll)
        set_px(px, x+1, 24, darken(l))
    return px

def gen_bone_fragment():
    px = new_canvas()
    bone = hex_to_rgba('#ddddcc'); bd = darken(bone)
    # Bone shape
    draw_circle(px, 10, 10, 4, bone)
    draw_circle(px, 20, 22, 4, bone)
    fill_rect(px, 12, 10, 6, 3, bone)
    draw_line(px, 12, 12, 18, 20, bone)
    draw_line(px, 13, 12, 19, 20, bd)
    return px

def gen_hide(color_hex):
    px = new_canvas()
    h = hex_to_rgba(color_hex); hl = lighten(h); hd = darken(h)
    # Flat hide shape
    fill_rect(px, 5, 8, 22, 16, h)
    fill_rect(px, 7, 6, 18, 3, h)
    fill_rect(px, 7, 23, 18, 3, h)
    fill_rect(px, 6, 9, 10, 6, hl)
    # Edges
    for x in range(5, 27, 4):
        set_px(px, x, 8, hd)
        set_px(px, x, 24, hd)
    return px

def gen_flax():
    px = new_canvas()
    stem = hex_to_rgba('#8B8B00')
    flower = hex_to_rgba('#6495ED')
    # Stems
    draw_line(px, 12, 28, 12, 8, stem)
    draw_line(px, 16, 28, 16, 6, stem)
    draw_line(px, 20, 28, 20, 10, stem)
    # Flowers
    draw_circle(px, 12, 7, 2, flower)
    draw_circle(px, 16, 5, 2, flower)
    draw_circle(px, 20, 9, 2, flower)
    return px

def gen_berries():
    px = new_canvas()
    berry = hex_to_rgba('#8B0000')
    bl = lighten(berry)
    leaf = hex_to_rgba('#2ecc71')
    # Berry cluster
    for cx, cy in [(12,16),(18,16),(15,19),(11,20),(19,20),(15,14)]:
        draw_circle(px, cx, cy, 3, berry)
        set_px(px, cx-1, cy-1, bl)
    # Leaves
    fill_rect(px, 13, 8, 5, 4, leaf)
    fill_rect(px, 14, 7, 3, 2, lighten(leaf))
    # Stem
    draw_line(px, 15, 7, 15, 5, hex_to_rgba('#5A3A1A'))
    return px

def gen_resin():
    px = new_canvas()
    r = hex_to_rgba('#DAA520'); rl = lighten(r)
    # Amber blob
    draw_circle(px, 15, 15, 8, r)
    draw_circle(px, 14, 14, 5, rl)
    draw_circle(px, 13, 13, 2, lighten(rl))
    set_px(px, 12, 12, hex_to_rgba('#ffffff', 180))
    return px

def gen_mushroom():
    px = new_canvas()
    cap = hex_to_rgba('#cc4444')
    stem = hex_to_rgba('#ddddcc')
    # Cap
    draw_circle(px, 15, 12, 8, cap)
    fill_rect(px, 7, 12, 17, 4, cap)
    # Spots
    for pos in [(11,8),(18,10),(14,6),(20,12)]:
        set_px(px, pos[0], pos[1], hex_to_rgba('#ffffff', 200))
    # Stem
    fill_rect(px, 13, 16, 5, 10, stem)
    fill_rect(px, 14, 16, 2, 10, lighten(stem))
    return px

def gen_thistle():
    px = new_canvas()
    stem = hex_to_rgba('#2d6b2d')
    flower = hex_to_rgba('#9b59b6')
    # Stem
    draw_line(px, 15, 28, 15, 10, stem)
    draw_line(px, 16, 28, 16, 10, lighten(stem))
    # Thorns
    set_px(px, 13, 20, stem); set_px(px, 17, 16, stem)
    set_px(px, 13, 14, stem)
    # Purple flower top
    draw_circle(px, 15, 8, 5, flower)
    draw_circle(px, 15, 6, 3, lighten(flower))
    # Spiky top
    for dx in [-3,-1,1,3]:
        set_px(px, 15+dx, 3, flower)
    return px

def gen_raw_fish(color_hex):
    px = new_canvas()
    fish = hex_to_rgba(color_hex); fl = lighten(fish); fd = darken(fish)
    # Fish body
    fill_rect(px, 6, 12, 16, 8, fish)
    fill_rect(px, 8, 10, 12, 2, fish)
    fill_rect(px, 8, 20, 12, 2, fish)
    fill_rect(px, 4, 14, 3, 4, fl)  # head
    # Tail
    fill_rect(px, 22, 10, 4, 4, fd)
    fill_rect(px, 22, 18, 4, 4, fd)
    fill_rect(px, 24, 12, 3, 8, fd)
    # Eye
    set_px(px, 5, 15, hex_to_rgba('#111111'))
    # Belly
    fill_rect(px, 8, 17, 12, 2, fl)
    return px

def gen_raw_gem(tier):
    px = new_canvas()
    grey = hex_to_rgba('#888888'); gl = lighten(grey)
    sparkle = [hex_to_rgba('#ffffff',80), hex_to_rgba('#ffffff',120),
               hex_to_rgba('#ffffff',160), hex_to_rgba('#ffffff',200),
               hex_to_rgba('#ffffff',240)]
    # Rough rock
    draw_circle(px, 15, 15, 7+tier, grey)
    draw_circle(px, 14, 14, 5+tier, gl)
    # Crystal facets (more visible at higher tiers)
    for i in range(tier+1):
        x = 12 + i*3
        y = 12 + (i%2)*3
        fill_rect(px, x, y, 2, 2, sparkle[tier])
    return px

def gen_cut_gem(color_hex, tier):
    px = new_canvas()
    c = hex_to_rgba(color_hex); cl = lighten(c); cd = darken(c)
    white = hex_to_rgba('#ffffff', 180 + tier*15)
    size = 5 + tier
    # Diamond/gem shape
    draw_diamond(px, 15, 15, size, c)
    draw_diamond(px, 14, 14, size-2, cl)
    draw_diamond(px, 13, 13, max(1,size-4), lighten(cl))
    # Facet lines for higher tiers
    if tier >= 2:
        draw_line(px, 15-size, 15, 15, 15-size, cd)
        draw_line(px, 15+size, 15, 15, 15-size, cd)
    if tier >= 3:
        draw_line(px, 15-size, 15, 15, 15+size, cd)
        draw_line(px, 15+size, 15, 15, 15+size, cd)
    # Sparkle
    set_px(px, 13, 12, white)
    if tier >= 2: set_px(px, 11, 14, white)
    if tier >= 4: set_px(px, 17, 11, white)
    return px

def gen_chest_item(color_hex, trim_hex):
    px = new_canvas()
    w = hex_to_rgba(color_hex); wl = lighten(w); wd = darken(w)
    trim = hex_to_rgba(trim_hex)
    # Chest body
    fill_rect(px, 5, 12, 22, 12, w)
    fill_rect(px, 5, 8, 22, 5, wl)
    fill_rect(px, 5, 8, 22, 1, lighten(wl))
    # Trim bands
    fill_rect(px, 5, 12, 22, 1, trim)
    fill_rect(px, 14, 8, 4, 16, trim)
    # Lock
    fill_rect(px, 14, 10, 4, 4, hex_to_rgba('#FFD700'))
    set_px(px, 15, 12, hex_to_rgba('#333333'))
    return px

def gen_lasso():
    px = new_canvas()
    rope = hex_to_rgba('#C8A870')
    # Coiled rope
    import math
    for t in range(40):
        a = t * math.pi * 2 / 16
        r = 6 + t * 0.15
        x = int(15 + r * math.cos(a))
        y = int(15 + r * math.sin(a))
        set_px(px, x, y, rope)
        set_px(px, x+1, y, darken(rope))
    # Loop at end
    draw_circle(px, 22, 8, 3, rope)
    return px

def gen_blasting_powder():
    px = new_canvas()
    powder = hex_to_rgba('#333333')
    # Barrel/pouch shape
    fill_rect(px, 8, 8, 16, 18, hex_to_rgba('#6B4226'))
    fill_rect(px, 7, 10, 18, 14, hex_to_rgba('#6B4226'))
    # Powder spilling from top
    draw_circle(px, 15, 8, 5, powder)
    for pos in [(10,6),(20,7),(13,4),(18,5)]:
        set_px(px, pos[0], pos[1], powder)
    # Skull warning
    set_px(px, 14, 16, hex_to_rgba('#ffcc00'))
    set_px(px, 17, 16, hex_to_rgba('#ffcc00'))
    return px

# ═══════════════════════════════════════════════════════
# FISHING PART GENERATORS
# ═══════════════════════════════════════════════════════

def gen_reel(pal):
    px = new_canvas()
    m = pal_c(pal, 'metal'); ml = pal_c(pal, 'metal_light')
    # Circular reel
    draw_circle(px, 15, 15, 9, m)
    draw_circle(px, 15, 15, 7, darken(m))
    draw_circle(px, 15, 15, 5, m)
    draw_circle(px, 14, 14, 3, ml)
    # Handle
    fill_rect(px, 24, 13, 4, 2, m)
    draw_circle(px, 28, 14, 2, ml)
    # Center axle
    set_px(px, 15, 15, hex_to_rgba('#ffffff', 180))
    return px

def gen_line(color_hex):
    px = new_canvas()
    line = hex_to_rgba(color_hex)
    # Spool of line
    draw_circle(px, 15, 15, 8, darken(line))
    # Wrapped line
    import math
    for t in range(50):
        a = t * 0.5
        r = 4 + (t % 8) * 0.5
        x = int(15 + r * math.cos(a))
        y = int(15 + r * math.sin(a))
        set_px(px, x, y, line)
    draw_circle(px, 15, 15, 3, hex_to_rgba('#555555'))
    return px

def gen_hook(pal):
    px = new_canvas()
    m = pal_c(pal, 'metal'); ml = pal_c(pal, 'metal_light')
    # Hook shape
    draw_line(px, 15, 4, 15, 16, m)
    draw_line(px, 16, 4, 16, 16, ml)
    # Curve
    draw_line(px, 15, 16, 10, 22, m)
    draw_line(px, 10, 22, 12, 26, m)
    draw_line(px, 12, 26, 18, 22, ml)
    # Barb
    set_px(px, 18, 21, ml)
    set_px(px, 19, 20, ml)
    # Eye at top
    draw_circle(px, 15, 4, 2, m)
    set_px(px, 15, 4, TRANSPARENT)
    return px

def gen_bait(color_hex):
    px = new_canvas()
    c = hex_to_rgba(color_hex)
    # Worm/bait shape
    import math
    for t in range(30):
        x = int(8 + t * 0.5)
        y = int(15 + 4 * math.sin(t * 0.6))
        draw_circle(px, x, y, 2, c)
    return px

# ═══════════════════════════════════════════════════════
# NAMED BOW VARIANTS
# ═══════════════════════════════════════════════════════

def gen_named_bow(wood_hex):
    px = new_canvas()
    pal = dict(TIER_PALETTES[2])
    pal['handle'] = wood_hex
    draw_bow(px, pal)
    return px

# ═══════════════════════════════════════════════════════
# MASTER GENERATION MAPS
# ═══════════════════════════════════════════════════════

# Templated weapons: item_id -> (template_func, tier)
WEAPON_MAP = {
    'wooden_club': (draw_club, 0), 'bone_sword': (draw_sword, 0),
    'stone_axe': (draw_axe, 0), 'wooden_spear': (draw_spear, 0),
    'bone_dagger': (draw_dagger, 0), 'stone_knuckles': (draw_knuckles, 0),
    'wooden_bow': (draw_bow, 0),
    'bronze_sword': (draw_sword, 1), 'bronze_mace': (draw_mace, 1),
    'bronze_spear': (draw_spear, 1), 'bronze_axe': (draw_axe, 1),
    'bronze_battleaxe': (draw_battleaxe, 1), 'bronze_dagger': (draw_dagger, 1),
    'bronze_atgeir': (draw_atgeir, 1), 'bronze_bow': (draw_bow, 1),
    'bronze_knuckles': (draw_knuckles, 1), 'bronze_greatsword': (draw_greatsword, 1),
    'iron_sword': (draw_sword, 2), 'steel_greatsword': (draw_greatsword, 2),
    'iron_mace': (draw_mace, 2), 'iron_axe': (draw_axe, 2),
    'iron_battleaxe': (draw_battleaxe, 2), 'iron_spear': (draw_spear, 2),
    'iron_dagger': (draw_dagger, 2), 'iron_atgeir': (draw_atgeir, 2),
    'iron_bow': (draw_bow, 2), 'iron_knuckles': (draw_knuckles, 2),
    'silver_sword': (draw_sword, 3), 'silver_mace': (draw_mace, 3),
    'silver_axe': (draw_axe, 3), 'silver_battleaxe': (draw_battleaxe, 3),
    'silver_spear': (draw_spear, 3), 'silver_dagger': (draw_dagger, 3),
    'silver_atgeir': (draw_atgeir, 3), 'silver_bow': (draw_bow, 3),
    'silver_knuckles': (draw_knuckles, 3), 'silver_greatsword': (draw_greatsword, 3),
    'obsidian_mace': (draw_mace, 4), 'obsidian_axe': (draw_axe, 4),
    'obsidian_battleaxe': (draw_battleaxe, 4), 'obsidian_spear': (draw_spear, 4),
    'obsidian_dagger': (draw_dagger, 4), 'obsidian_atgeir': (draw_atgeir, 4),
    'obsidian_bow': (draw_bow, 4), 'obsidian_knuckles': (draw_knuckles, 4),
    'obsidian_greatsword': (draw_greatsword, 4),
    'flametal_mace': (draw_mace, 5), 'flametal_axe': (draw_axe, 5),
    'flametal_battleaxe': (draw_battleaxe, 5), 'flametal_spear': (draw_spear, 5),
    'flametal_dagger': (draw_dagger, 5), 'flametal_atgeir': (draw_atgeir, 5),
    'flametal_bow': (draw_bow, 5), 'flametal_knuckles': (draw_knuckles, 5),
    'flametal_greatsword': (draw_greatsword, 5),
}

ARMOR_MAP = {
    'leather_cap': (draw_helmet, 0), 'leather_tunic': (draw_chestplate, 0),
    'leather_pants': (draw_greaves, 0), 'hide_boots': (draw_boots, 0),
    'bronze_helmet': (draw_helmet, 1), 'bronze_chestplate': (draw_chestplate, 1),
    'bronze_greaves': (draw_greaves, 1), 'bronze_boots': (draw_boots, 1),
    'iron_helmet': (draw_helmet, 2), 'iron_chestplate': (draw_chestplate, 2),
    'iron_greaves': (draw_greaves, 2), 'iron_boots': (draw_boots, 2),
    'silver_helmet': (draw_helmet, 3), 'silver_chestplate': (draw_chestplate, 3),
    'silver_greaves': (draw_greaves, 3), 'silver_boots': (draw_boots, 3),
    'obsidian_helmet': (draw_helmet, 4), 'obsidian_chestplate': (draw_chestplate, 4),
    'obsidian_greaves': (draw_greaves, 4), 'obsidian_boots': (draw_boots, 4),
    'flametal_helmet': (draw_helmet, 5), 'flametal_chestplate': (draw_chestplate, 5),
    'flametal_greaves': (draw_greaves, 5), 'flametal_boots': (draw_boots, 5),
}

SHIELD_MAP = {
    'wooden_shield': (draw_shield, 0), 'bronze_shield': (draw_shield, 1),
    'iron_shield': (draw_shield, 2), 'silver_shield': (draw_shield, 3),
    'obsidian_shield': (draw_shield, 4), 'flametal_shield': (draw_shield, 5),
}

RING_MAP = {
    'bone_ring': (draw_ring, 0), 'bronze_ring': (draw_ring, 1),
    'iron_ring': (draw_ring, 2), 'silver_ring': (draw_ring, 3),
    'obsidian_ring': (draw_ring, 4),
}

TOOL_MAP = {
    'stone_pickaxe': (draw_pickaxe, 0), 'bone_pickaxe': (draw_pickaxe, 0),
    'bronze_pickaxe': (draw_pickaxe, 1), 'iron_pickaxe': (draw_pickaxe, 2),
    'silver_pickaxe': (draw_pickaxe, 3), 'obsidian_pickaxe': (draw_pickaxe, 4),
    'flametal_pickaxe': (draw_pickaxe, 5),
    'stone_hatchet': (draw_hatchet, 0), 'bronze_hatchet': (draw_hatchet, 1),
    'iron_hatchet': (draw_hatchet, 2), 'silver_hatchet': (draw_hatchet, 3),
    'obsidian_hatchet': (draw_hatchet, 4), 'flametal_hatchet': (draw_hatchet, 5),
    'wooden_rod': (draw_fishing_rod, 0), 'bronze_rod': (draw_fishing_rod, 1),
    'iron_rod': (draw_fishing_rod, 2), 'silver_rod': (draw_fishing_rod, 3),
}

# Special rings
SPECIAL_RING_MAP = {
    'meadow_ring': (draw_ring, 1),
    'lucky_charm': (draw_ring, 1),
}

# Unique item generators
UNIQUE_GENERATORS = {
    'fire_staff': gen_fire_staff, 'ice_staff': gen_ice_staff,
    'lightning_staff': gen_lightning_staff, 'nature_staff': gen_nature_staff,
    'runic_blade': gen_runic_blade, 'venom_dagger': gen_venom_dagger,
    'witchdoctor_staff': gen_witchdoctor_staff,
    'frostforged_blade': gen_frostforged_blade, 'infernal_sword': gen_infernal_sword,
    'witchdoctor_mask': gen_witchdoctor_mask, 'witchdoctor_vest': gen_witchdoctor_vest,
    'witchdoctor_kilt': gen_witchdoctor_kilt, 'witchdoctor_sandals': gen_witchdoctor_sandals,
    'mage_hood': gen_mage_hood, 'mage_robe': gen_mage_robe,
    'mage_leggings': gen_mage_leggings, 'mage_sandals': gen_mage_sandals,
}

# Consumables
CONSUMABLE_GENERATORS = {
    'cooked_meat': gen_cooked_meat, 'berry_juice': gen_berry_juice,
    'mushroom_soup': gen_mushroom_soup, 'cooked_rabbit': gen_cooked_rabbit,
    'rabbit_stew': gen_rabbit_stew,
    'bomb': gen_bomb, 'fire_bomb': gen_fire_bomb, 'frost_bomb': gen_frost_bomb,
    'grilled_trout': lambda: gen_grilled_fish('#B8763A'),
    'grilled_carp': lambda: gen_grilled_fish('#DAA520'),
    'grilled_bass': lambda: gen_grilled_fish('#8B7355'),
    'grilled_pike': lambda: gen_grilled_fish('#556B2F'),
    'grilled_eel': lambda: gen_grilled_fish('#4A4A4A'),
    'grilled_salmon': lambda: gen_grilled_fish('#E9967A'),
    'grilled_lava_eel': lambda: gen_grilled_fish('#CC4400'),
    'grilled_fish': lambda: gen_grilled_fish('#B8763A'),
}

# Gem colors and tiers
GEM_COLORS = [
    ('ruby', '#e74c3c'), ('sapphire', '#3498db'), ('emerald', '#2ecc71'),
    ('topaz', '#f1c40f'), ('amethyst', '#9b59b6'),
]
GEM_TIERS = ['rough', 'flawed', 'clear', 'perfect', 'pristine']

def write_png(name, pixels):
    png_data = make_png(pixels, SIZE, SIZE)
    path = os.path.join(OUT_DIR, f'{name}.png')
    with open(path, 'wb') as f:
        f.write(png_data)
    print(f'  {name}.png ({len(png_data)} bytes)')

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    count = 0

    # Templated weapons
    for item_id, (tmpl, tier) in WEAPON_MAP.items():
        px = new_canvas()
        tmpl(px, TIER_PALETTES[tier])
        write_png(item_id, px)
        count += 1

    # Templated armor
    for item_id, (tmpl, tier) in ARMOR_MAP.items():
        px = new_canvas()
        tmpl(px, TIER_PALETTES[tier])
        write_png(item_id, px)
        count += 1

    # Shields
    for item_id, (tmpl, tier) in SHIELD_MAP.items():
        px = new_canvas()
        tmpl(px, TIER_PALETTES[tier])
        write_png(item_id, px)
        count += 1

    # Rings
    for item_id, (tmpl, tier) in {**RING_MAP, **SPECIAL_RING_MAP}.items():
        px = new_canvas()
        tmpl(px, TIER_PALETTES[tier])
        write_png(item_id, px)
        count += 1

    # Tools
    for item_id, (tmpl, tier) in TOOL_MAP.items():
        px = new_canvas()
        tmpl(px, TIER_PALETTES[tier])
        write_png(item_id, px)
        count += 1

    # Unique items
    for item_id, gen_func in UNIQUE_GENERATORS.items():
        px = gen_func()
        write_png(item_id, px)
        count += 1

    # Consumables
    for item_id, gen_func in CONSUMABLE_GENERATORS.items():
        px = gen_func()
        write_png(item_id, px)
        count += 1

    # Named bows
    named_bows = {
        'dark_oak_bow': '#4A3520', 'pine_bow': '#6B8E23',
        'fine_wood_bow': '#DEB887', 'frost_bow': '#5dade2',
        'ashwood_bow': '#8B4513',
    }
    for item_id, wood_hex in named_bows.items():
        px = gen_named_bow(wood_hex)
        write_png(item_id, px)
        count += 1

    # Materials - Ores
    ores = {
        'copper_ore': ('#CD7F32', '#DAA06D'), 'tin_ore': ('#C0C0C0', '#E0E0E0'),
        'iron_ore': ('#555555', '#777777'), 'coal': ('#222222', '#333333'),
        'silver_ore': ('#C0C0C0', '#FFFFFF'), 'obsidian_shard': ('#2A1A3A', '#6A3A7A'),
        'flametal_ore': ('#CC4400', '#FF6600'), 'sulfite': ('#CCCC00', '#FFFF44'),
        'crystal_geode': ('#9b59b6', '#CC99FF'),
    }
    for item_id, (c, v) in ores.items():
        px = gen_ore(c, v)
        write_png(item_id, px)
        count += 1

    # Materials - Ingots
    ingots = {
        'copper_ingot': '#CD7F32', 'tin_ingot': '#C0C0C0', 'bronze_ingot': '#CD7F32',
        'iron_ingot': '#808080', 'steel_ingot': '#A0A0A0', 'silver_ingot': '#C0C0C0',
        'obsidian_plate': '#2A1A3A', 'flametal_ingot': '#CC4400',
    }
    for item_id, c in ingots.items():
        px = gen_ingot(c)
        write_png(item_id, px)
        count += 1

    # Materials - Planks
    planks = {
        'oak_plank': '#8B6914', 'dark_oak_plank': '#4A3520', 'ancient_plank': '#6B5535',
    }
    for item_id, c in planks.items():
        px = gen_plank(c)
        write_png(item_id, px)
        count += 1

    # Materials - Wood types
    wood_types = {
        'dark_oak_log': '#4A3520', 'pine_wood': '#6B8E23', 'fine_wood': '#DEB887',
        'frost_wood': '#5dade2', 'ashwood_log': '#8B4513', 'ancient_bark': '#5A4A3A',
    }
    for item_id, c in wood_types.items():
        px = new_canvas()
        w = hex_to_rgba(c); wd = darken(w); wl = lighten(w)
        fill_rect(px, 6, 8, 20, 16, w)
        draw_circle(px, 22, 16, 7, wl)
        draw_circle(px, 22, 16, 5, w)
        fill_rect(px, 6, 8, 2, 16, wd)
        fill_rect(px, 6, 8, 16, 1, wd)
        write_png(item_id, px)
        count += 1

    # Materials - Hides
    hides = {
        'greyling_hide': '#708090', 'troll_hide': '#2e5e2e', 'cured_leather': '#A0522D',
        'cured_troll_hide': '#3a7a3a', 'rabbit_pelt': '#C8A870',
    }
    for item_id, c in hides.items():
        px = gen_hide(c)
        write_png(item_id, px)
        count += 1

    # Materials - Simple items
    simple_items = {
        'gold': gen_gold, 'arrow': gen_arrow, 'stick': gen_stick,
        'wood': gen_wood, 'stone': gen_stone, 'flax': gen_flax,
        'berries': gen_berries, 'leather_scrap': gen_leather_scrap,
        'bone_fragment': gen_bone_fragment, 'resin': gen_resin,
        'mushroom': gen_mushroom, 'thistle': gen_thistle,
        'blasting_powder': gen_blasting_powder, 'lasso': gen_lasso,
    }
    for item_id, gen_func in simple_items.items():
        px = gen_func()
        write_png(item_id, px)
        count += 1

    # Materials - Misc simple items (using basic shapes)
    misc_items = {
        'charcoal': '#333333', 'raw_meat': '#cc4444', 'rabbit_meat': '#cc6644',
        'guck': '#556B2F', 'iron_scrap': '#666666', 'frost_core': '#5dade2',
        'dragon_scale': '#228B22', 'magma_core': '#FF4400', 'linen_thread': '#F5DEB3',
        'bronze_nails': '#CD7F32', 'crystal_lens': '#CC99FF', 'arcane_essence': '#9933FF',
        'greyling_tear': '#5dade2', 'rabbit_foot': '#C8A870',
    }
    for item_id, c in misc_items.items():
        px = new_canvas()
        color = hex_to_rgba(c)
        draw_circle(px, 15, 15, 7, color)
        draw_circle(px, 14, 14, 5, lighten(color))
        set_px(px, 12, 12, lighten(lighten(color)))
        write_png(item_id, px)
        count += 1

    # Fish (raw)
    fish_items = {
        'river_trout': '#B8763A', 'golden_carp': '#DAA520', 'lake_bass': '#6B8E6B',
        'shadow_pike': '#4A4A6A', 'swamp_eel': '#556B2F', 'poison_catfish': '#8B4513',
        'frost_salmon': '#E9967A', 'lava_eel': '#CC4400',
    }
    for item_id, c in fish_items.items():
        px = gen_raw_fish(c)
        write_png(item_id, px)
        count += 1

    # Raw gems
    for tier_idx, tier_name in enumerate(GEM_TIERS):
        px = gen_raw_gem(tier_idx)
        write_png(f'raw_gem_{tier_name}', px)
        count += 1

    # Cut gems (5 colors x 5 tiers)
    for gem_name, gem_color in GEM_COLORS:
        for tier_idx, tier_name in enumerate(GEM_TIERS):
            px = gen_cut_gem(gem_color, tier_idx)
            write_png(f'cut_{gem_name}_{tier_name}', px)
            count += 1

    # Chest items (placeable)
    chest_items = {
        'wooden_chest': ('#8B6914', '#888888'),
        'reinforced_chest': ('#A0782C', '#707070'),
        'iron_chest': ('#6A6A6A', '#DAA520'),
        'obsidian_vault': ('#2A1A3A', '#FFD700'),
    }
    for item_id, (body, trim) in chest_items.items():
        px = gen_chest_item(body, trim)
        write_png(item_id, px)
        count += 1

    # Fishing parts
    fishing_reels = {
        'wooden_reel': 0, 'bronze_reel': 1, 'iron_reel': 2, 'silver_reel': 3,
    }
    for item_id, tier in fishing_reels.items():
        px = gen_reel(TIER_PALETTES[tier])
        write_png(item_id, px)
        count += 1

    fishing_lines = {
        'hemp_line': '#C8A870', 'silk_line': '#F5F5F5', 'spider_silk_line': '#AAAACC',
    }
    for item_id, c in fishing_lines.items():
        px = gen_line(c)
        write_png(item_id, px)
        count += 1

    fishing_hooks = {
        'bone_hook': 0, 'bronze_hook': 1, 'barbed_hook': 2,
    }
    for item_id, tier in fishing_hooks.items():
        px = gen_hook(TIER_PALETTES[tier])
        write_png(item_id, px)
        count += 1

    fishing_baits = {
        'worm_bait': '#cc6644', 'insect_bait': '#556B2F', 'fish_chunk_bait': '#cc4444',
    }
    for item_id, c in fishing_baits.items():
        px = gen_bait(c)
        write_png(item_id, px)
        count += 1

    print(f'\nGenerated {count} item icons in {os.path.abspath(OUT_DIR)}')

if __name__ == '__main__':
    main()
