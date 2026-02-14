#!/usr/bin/env python3
"""Generate pixel-art skill icons as 32x32 PNGs using only stdlib."""

import struct, zlib, os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'tileArt', 'skills')
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

def icon_bg(px):
    """Draw subtle dark circular background for all skill icons."""
    draw_circle(px, 15, 15, 14, hex_to_rgba('#111111', 180))
    draw_circle(px, 15, 15, 13, hex_to_rgba('#1a1a2a', 200))

# ─── COMBAT SKILLS ───

def gen_power_strike():
    px = new_canvas()
    icon_bg(px)
    red = hex_to_rgba('#e74c3c')
    red_l = lighten(red)
    red_d = darken(red)
    yellow = hex_to_rgba('#f1c40f')
    # Fist shape
    fill_rect(px, 11, 10, 8, 10, red)
    fill_rect(px, 12, 9, 6, 1, red)
    fill_rect(px, 10, 12, 2, 6, red_d)
    fill_rect(px, 19, 12, 1, 6, red_d)
    # Knuckle highlights
    fill_rect(px, 12, 10, 2, 2, red_l)
    fill_rect(px, 15, 10, 2, 2, red_l)
    # Impact starburst
    draw_line(px, 22, 8, 26, 4, yellow)
    draw_line(px, 23, 12, 27, 10, yellow)
    draw_line(px, 22, 16, 26, 18, yellow)
    set_px(px, 25, 7, hex_to_rgba('#ffee44'))
    set_px(px, 28, 11, hex_to_rgba('#ffee44'))
    return px

def gen_heal():
    px = new_canvas()
    icon_bg(px)
    green = hex_to_rgba('#2ecc71')
    green_l = lighten(green, 1.3)
    glow = hex_to_rgba('#2ecc71', 100)
    # Green glow
    draw_circle(px, 15, 15, 10, glow)
    # Cross
    fill_rect(px, 13, 7, 5, 17, green)
    fill_rect(px, 7, 13, 17, 5, green)
    # Highlights
    fill_rect(px, 14, 8, 3, 3, green_l)
    fill_rect(px, 8, 14, 3, 3, green_l)
    # Center bright
    fill_rect(px, 14, 14, 3, 3, hex_to_rgba('#aaffaa'))
    return px

def gen_evasion():
    px = new_canvas()
    icon_bg(px)
    teal = hex_to_rgba('#1abc9c')
    teal_d = darken(teal)
    ghost = hex_to_rgba('#1abc9c', 100)
    # Ghost silhouette (shifted left)
    fill_rect(px, 8, 8, 5, 3, ghost)
    fill_rect(px, 9, 11, 3, 8, ghost)
    fill_rect(px, 8, 19, 2, 4, ghost)
    fill_rect(px, 11, 19, 2, 4, ghost)
    # Main silhouette
    fill_rect(px, 13, 7, 6, 4, teal)
    fill_rect(px, 14, 11, 4, 9, teal)
    fill_rect(px, 13, 20, 2, 5, teal_d)
    fill_rect(px, 17, 20, 2, 5, teal_d)
    # Head
    draw_circle(px, 15, 8, 3, teal)
    set_px(px, 14, 7, lighten(teal))
    # Motion lines
    for y in [9, 13, 17, 21]:
        draw_line(px, 4, y, 7, y, hex_to_rgba('#1abc9c', 120))
    return px

def gen_precision_strike():
    px = new_canvas()
    icon_bg(px)
    orange = hex_to_rgba('#e67e22')
    orange_l = lighten(orange)
    white = hex_to_rgba('#ffffff', 200)
    # Outer ring
    for angle_idx in range(32):
        import math
        a = angle_idx * math.pi * 2 / 32
        x = int(15 + 10 * math.cos(a))
        y = int(15 + 10 * math.sin(a))
        set_px(px, x, y, orange)
    # Inner ring
    for angle_idx in range(20):
        import math
        a = angle_idx * math.pi * 2 / 20
        x = int(15 + 5 * math.cos(a))
        y = int(15 + 5 * math.sin(a))
        set_px(px, x, y, orange)
    # Crosshair lines
    draw_line(px, 15, 3, 15, 10, orange_l)
    draw_line(px, 15, 20, 15, 27, orange_l)
    draw_line(px, 3, 15, 10, 15, orange_l)
    draw_line(px, 20, 15, 27, 15, orange_l)
    # Center dot
    fill_rect(px, 14, 14, 3, 3, white)
    set_px(px, 15, 15, hex_to_rgba('#ff0000'))
    return px

def gen_fortify():
    px = new_canvas()
    icon_bg(px)
    blue = hex_to_rgba('#34495e')
    blue_l = lighten(blue, 1.4)
    blue_d = darken(blue)
    gold = hex_to_rgba('#c9a84c')
    # Tower shield shape
    fill_rect(px, 8, 5, 15, 20, blue)
    # Pointed bottom
    for i in range(4):
        fill_rect(px, 8+i, 25+i, 15-2*i, 1, blue)
    # Highlight left edge
    fill_rect(px, 8, 5, 2, 20, blue_l)
    # Shadow right edge
    fill_rect(px, 21, 5, 2, 20, blue_d)
    # Top rim
    fill_rect(px, 8, 5, 15, 2, blue_l)
    # Gold cross emblem
    fill_rect(px, 14, 9, 3, 12, gold)
    fill_rect(px, 10, 13, 11, 3, gold)
    return px

def gen_venom_strike():
    px = new_canvas()
    icon_bg(px)
    green = hex_to_rgba('#16a085')
    green_l = lighten(green)
    drip = hex_to_rgba('#2ecc71')
    blade = hex_to_rgba('#aaaaaa')
    blade_l = hex_to_rgba('#cccccc')
    # Dagger blade (diagonal)
    draw_line(px, 18, 4, 12, 16, blade_l)
    draw_line(px, 19, 5, 13, 17, blade)
    draw_line(px, 20, 4, 14, 16, blade)
    # Guard
    draw_line(px, 10, 16, 16, 14, hex_to_rgba('#8B6914'))
    # Handle
    draw_line(px, 11, 18, 8, 24, hex_to_rgba('#5A3A1A'))
    draw_line(px, 12, 19, 9, 25, hex_to_rgba('#6B4B2A'))
    # Poison drips from blade
    set_px(px, 14, 19, drip)
    set_px(px, 15, 21, green)
    set_px(px, 13, 22, drip)
    set_px(px, 16, 24, green)
    set_px(px, 14, 26, hex_to_rgba('#2ecc71', 140))
    # Green glow on blade
    set_px(px, 16, 8, green)
    set_px(px, 15, 11, green)
    return px

def gen_cleave():
    px = new_canvas()
    icon_bg(px)
    orange = hex_to_rgba('#e67e22')
    orange_l = lighten(orange)
    orange_d = darken(orange)
    white = hex_to_rgba('#ffffff', 180)
    # Sweeping arc blade
    import math
    for t in range(40):
        a = math.pi * 0.2 + t * math.pi * 0.6 / 40
        for r in range(10, 14):
            x = int(15 + r * math.cos(a))
            y = int(15 + r * math.sin(a))
            c = orange_l if r == 13 else orange if r > 10 else orange_d
            set_px(px, x, y, c)
    # Arc trail (white edge)
    for t in range(40):
        a = math.pi * 0.2 + t * math.pi * 0.6 / 40
        x = int(15 + 13 * math.cos(a))
        y = int(15 + 13 * math.sin(a))
        set_px(px, x, y, white)
    # Motion lines from center
    draw_line(px, 15, 15, 8, 8, hex_to_rgba('#e67e22', 120))
    draw_line(px, 15, 15, 6, 16, hex_to_rgba('#e67e22', 120))
    draw_line(px, 15, 15, 10, 24, hex_to_rgba('#e67e22', 120))
    return px

def gen_war_cry():
    px = new_canvas()
    icon_bg(px)
    yellow = hex_to_rgba('#f39c12')
    yellow_l = lighten(yellow)
    orange = hex_to_rgba('#e67e22')
    # Mouth/face shape
    fill_rect(px, 11, 10, 9, 9, hex_to_rgba('#d4a574'))
    fill_rect(px, 12, 11, 7, 2, darken(hex_to_rgba('#d4a574')))
    # Open mouth
    fill_rect(px, 13, 14, 5, 4, hex_to_rgba('#333333'))
    fill_rect(px, 14, 15, 3, 2, hex_to_rgba('#111111'))
    # Eyes
    set_px(px, 13, 12, hex_to_rgba('#ffffff'))
    set_px(px, 17, 12, hex_to_rgba('#ffffff'))
    # Sound waves (arcs to the right)
    import math
    for wave in range(3):
        r = 6 + wave * 4
        for t in range(12):
            a = -math.pi/3 + t * math.pi * 2/3 / 12
            x = int(20 + r * math.cos(a))
            y = int(15 + r * math.sin(a))
            c = yellow_l if wave == 0 else yellow if wave == 1 else orange
            set_px(px, x, y, c)
    return px

def gen_iron_skin():
    px = new_canvas()
    icon_bg(px)
    grey = hex_to_rgba('#95a5a6')
    grey_l = lighten(grey, 1.3)
    grey_d = darken(grey)
    # Body silhouette with metal coating
    fill_rect(px, 11, 6, 9, 5, grey)
    fill_rect(px, 10, 11, 11, 10, grey)
    fill_rect(px, 8, 11, 3, 8, grey_d)   # left arm
    fill_rect(px, 20, 11, 3, 8, grey_d)   # right arm
    fill_rect(px, 11, 21, 4, 5, grey_d)   # left leg
    fill_rect(px, 16, 21, 4, 5, grey_d)   # right leg
    # Metallic highlights
    fill_rect(px, 12, 7, 3, 3, grey_l)
    fill_rect(px, 11, 12, 2, 4, grey_l)
    # Sparkle
    set_px(px, 13, 8, hex_to_rgba('#ffffff'))
    set_px(px, 18, 13, hex_to_rgba('#ffffff'))
    set_px(px, 11, 16, hex_to_rgba('#ffffff'))
    return px

def gen_whirlwind():
    px = new_canvas()
    icon_bg(px)
    purple = hex_to_rgba('#9b59b6')
    purple_l = lighten(purple)
    purple_d = darken(purple)
    # Spinning blade lines (spiral)
    import math
    for arm in range(3):
        offset = arm * math.pi * 2 / 3
        for t in range(20):
            r = 2 + t * 0.55
            a = offset + t * 0.3
            x = int(15 + r * math.cos(a))
            y = int(15 + r * math.sin(a))
            c = purple_l if t < 7 else purple if t < 14 else purple_d
            set_px(px, x, y, c)
    # Center glow
    draw_circle(px, 15, 15, 2, lighten(purple, 1.6))
    set_px(px, 15, 15, hex_to_rgba('#ffffff', 200))
    return px

def gen_execute():
    px = new_canvas()
    icon_bg(px)
    red = hex_to_rgba('#c0392b')
    red_l = lighten(red)
    bone = hex_to_rgba('#ddddcc')
    bone_d = darken(bone)
    dark = hex_to_rgba('#111111')
    # Skull
    fill_rect(px, 10, 8, 11, 10, bone)
    fill_rect(px, 11, 7, 9, 1, bone)
    fill_rect(px, 11, 18, 9, 2, bone_d)
    # Round top
    fill_rect(px, 12, 6, 7, 2, bone)
    # Eye sockets
    fill_rect(px, 12, 10, 3, 3, dark)
    fill_rect(px, 17, 10, 3, 3, dark)
    # Red glowing eyes
    set_px(px, 13, 11, red)
    set_px(px, 18, 11, red)
    # Nose
    set_px(px, 15, 14, bone_d)
    set_px(px, 15, 15, bone_d)
    # Teeth
    for x in range(12, 20):
        set_px(px, x, 17, dark)
    for x in range(12, 20, 2):
        set_px(px, x, 17, bone)
    # Crosshair around skull
    draw_line(px, 15, 2, 15, 5, red_l)
    draw_line(px, 15, 21, 15, 24, red_l)
    draw_line(px, 4, 13, 8, 13, red_l)
    draw_line(px, 23, 13, 27, 13, red_l)
    return px

def gen_regeneration():
    px = new_canvas()
    icon_bg(px)
    green = hex_to_rgba('#27ae60')
    green_l = lighten(green, 1.4)
    green_d = darken(green)
    # Heart shape
    draw_circle(px, 12, 12, 4, green)
    draw_circle(px, 18, 12, 4, green)
    # Heart bottom triangle
    for i in range(8):
        fill_rect(px, 9+i, 15+i, 13-2*i, 1, green)
    # Highlights
    draw_circle(px, 11, 11, 2, green_l)
    # Upward arrows
    arrow = hex_to_rgba('#aaffaa')
    for ax in [7, 15, 23]:
        draw_line(px, ax, 8, ax, 3, arrow)
        set_px(px, ax-1, 4, arrow)
        set_px(px, ax+1, 4, arrow)
    return px

def gen_berserker_rage():
    px = new_canvas()
    icon_bg(px)
    red = hex_to_rgba('#e74c3c')
    red_l = lighten(red)
    red_d = darken(red)
    orange = hex_to_rgba('#f39c12')
    yellow = hex_to_rgba('#f1c40f')
    # Angry eye
    fill_rect(px, 7, 12, 17, 7, hex_to_rgba('#111111'))
    # Red iris
    draw_circle(px, 15, 15, 5, red)
    draw_circle(px, 15, 15, 3, red_l)
    # Pupil
    draw_circle(px, 15, 15, 2, hex_to_rgba('#111111'))
    set_px(px, 14, 14, hex_to_rgba('#ffffff'))
    # Angry eyebrow slant
    draw_line(px, 6, 13, 14, 10, red_d)
    draw_line(px, 16, 10, 24, 13, red_d)
    # Fire border
    for x in range(6, 25):
        h = 3 + (x % 3)
        for dy in range(h):
            c = yellow if dy == 0 else orange if dy == 1 else red
            set_px(px, x, 6-dy, c)
            set_px(px, x, 24+dy, c)
    return px

def gen_life_steal():
    px = new_canvas()
    icon_bg(px)
    purple = hex_to_rgba('#8e44ad')
    purple_l = lighten(purple)
    red = hex_to_rgba('#e74c3c')
    # Heart shape
    draw_circle(px, 12, 13, 4, purple)
    draw_circle(px, 18, 13, 4, purple)
    for i in range(7):
        fill_rect(px, 9+i, 16+i, 13-2*i, 1, purple)
    # Heart highlight
    draw_circle(px, 11, 12, 2, purple_l)
    # Incoming drain swirl lines
    import math
    for t in range(25):
        a = t * 0.4
        r = 14 - t * 0.4
        x = int(15 + r * math.cos(a))
        y = int(15 + r * math.sin(a))
        set_px(px, x, y, red)
    return px

def gen_shadow_step():
    px = new_canvas()
    icon_bg(px)
    dark = hex_to_rgba('#2c3e50')
    dark_l = lighten(dark)
    blue = hex_to_rgba('#3498db', 140)
    # Ghost silhouette (left, faded)
    fill_rect(px, 5, 9, 5, 3, hex_to_rgba('#2c3e50', 80))
    fill_rect(px, 6, 12, 3, 7, hex_to_rgba('#2c3e50', 80))
    # Scatter particles between
    for pos in [(10,10),(11,14),(12,18),(10,22)]:
        set_px(px, pos[0], pos[1], blue)
    # Main silhouette (right)
    draw_circle(px, 19, 8, 3, dark)
    fill_rect(px, 17, 11, 5, 3, dark)
    fill_rect(px, 18, 14, 3, 7, dark)
    fill_rect(px, 17, 21, 2, 4, dark_l)
    fill_rect(px, 20, 21, 2, 4, dark_l)
    # Blue teleport glow
    draw_circle(px, 19, 15, 6, hex_to_rgba('#3498db', 50))
    for pos in [(22,7),(24,12),(23,17),(21,22)]:
        set_px(px, pos[0], pos[1], blue)
    return px

# ─── HOLY SKILLS ───

def gen_holy_light():
    px = new_canvas()
    icon_bg(px)
    gold = hex_to_rgba('#f1c40f')
    gold_l = lighten(gold)
    white = hex_to_rgba('#ffffff', 220)
    glow = hex_to_rgba('#f1c40f', 80)
    # Glow
    draw_circle(px, 15, 15, 11, glow)
    draw_circle(px, 15, 15, 7, hex_to_rgba('#f1c40f', 120))
    # Sunburst rays
    import math
    for i in range(8):
        a = i * math.pi / 4
        for r in range(4, 13):
            x = int(15 + r * math.cos(a))
            y = int(15 + r * math.sin(a))
            c = gold_l if r < 7 else gold
            set_px(px, x, y, c)
    # Center cross
    fill_rect(px, 14, 11, 3, 9, white)
    fill_rect(px, 11, 14, 9, 3, white)
    # Bright center
    fill_rect(px, 14, 14, 3, 3, hex_to_rgba('#ffffff'))
    return px

def gen_blessing_of_might():
    px = new_canvas()
    icon_bg(px)
    orange = hex_to_rgba('#e67e22')
    gold = hex_to_rgba('#ffd700')
    gold_glow = hex_to_rgba('#ffd700', 100)
    blade = hex_to_rgba('#cccccc')
    blade_l = hex_to_rgba('#eeeeee')
    # Upward sword
    fill_rect(px, 14, 4, 3, 16, blade)
    fill_rect(px, 15, 3, 1, 1, blade_l)
    # Sword tip
    set_px(px, 15, 3, blade_l)
    set_px(px, 14, 4, blade)
    set_px(px, 16, 4, blade)
    # Guard
    fill_rect(px, 10, 19, 11, 2, gold)
    # Grip
    fill_rect(px, 14, 21, 3, 4, hex_to_rgba('#5A3A1A'))
    # Pommel
    fill_rect(px, 14, 25, 3, 2, gold)
    # Golden glow/halo around sword
    draw_circle(px, 15, 12, 8, gold_glow)
    # Sparkles
    set_px(px, 8, 8, gold)
    set_px(px, 22, 8, gold)
    set_px(px, 7, 15, gold)
    set_px(px, 23, 15, gold)
    return px

def gen_divine_shield():
    px = new_canvas()
    icon_bg(px)
    gold = hex_to_rgba('#f39c12')
    gold_l = lighten(gold)
    gold_d = darken(gold)
    white = hex_to_rgba('#ffffff')
    # Shield shape
    fill_rect(px, 7, 5, 17, 16, gold)
    # Pointed bottom
    for i in range(5):
        fill_rect(px, 7+i, 21+i, 17-2*i, 1, gold)
    # Rim highlight
    draw_border(px, 7, 5, 17, 16, gold_l)
    # Shadow on right
    fill_rect(px, 22, 6, 2, 15, gold_d)
    # White holy cross
    fill_rect(px, 14, 8, 3, 14, white)
    fill_rect(px, 10, 12, 11, 3, white)
    # Glow effect
    draw_circle(px, 15, 14, 10, hex_to_rgba('#ffd700', 50))
    return px

def gen_divine_hymn():
    px = new_canvas()
    icon_bg(px)
    gold = hex_to_rgba('#ffd700')
    gold_l = lighten(gold)
    gold_d = darken(gold)
    white = hex_to_rgba('#ffffff', 200)
    # Musical notes
    # Note 1 (left)
    draw_circle(px, 10, 20, 2, gold)
    draw_line(px, 12, 20, 12, 10, gold_l)
    fill_rect(px, 12, 10, 4, 2, gold_l)
    # Note 2 (right)
    draw_circle(px, 20, 18, 2, gold)
    draw_line(px, 22, 18, 22, 8, gold_l)
    fill_rect(px, 22, 8, 4, 2, gold_l)
    # Beam connecting notes
    draw_line(px, 12, 10, 22, 8, gold)
    # Sparkles/glow
    for pos in [(7,12),(15,6),(24,14),(9,24),(22,24)]:
        set_px(px, pos[0], pos[1], white)
    # Halo glow
    draw_circle(px, 15, 15, 11, hex_to_rgba('#ffd700', 40))
    return px

# ─── NATURE SKILLS ───

def gen_rejuvenation():
    px = new_canvas()
    icon_bg(px)
    green = hex_to_rgba('#2ecc71')
    green_l = lighten(green, 1.3)
    green_d = darken(green)
    white = hex_to_rgba('#ffffff', 200)
    # Leaf shape (curved)
    import math
    for t in range(30):
        a = math.pi * 0.3 + t * math.pi * 0.4 / 30
        for r in range(1, 8):
            x = int(15 + r * math.cos(a))
            y = int(18 - r * math.sin(a))
            c = green_l if r < 3 else green if r < 6 else green_d
            set_px(px, x, y, c)
    # Leaf vein
    draw_line(px, 10, 19, 20, 9, green_d)
    # Stem
    draw_line(px, 10, 19, 7, 25, hex_to_rgba('#27ae60'))
    # Sparkles
    for pos in [(8,8),(22,7),(6,16),(24,18),(12,5),(20,24)]:
        set_px(px, pos[0], pos[1], white)
    return px

def gen_thorns():
    px = new_canvas()
    icon_bg(px)
    green = hex_to_rgba('#27ae60')
    green_d = darken(green)
    thorn = hex_to_rgba('#1a5c32')
    # Spiral vine
    import math
    for t in range(50):
        a = t * 0.25
        r = 3 + t * 0.18
        x = int(15 + r * math.cos(a))
        y = int(15 + r * math.sin(a))
        set_px(px, x, y, green)
        if t % 2 == 0:
            set_px(px, x+1, y, green_d)
    # Thorns (triangular protrusions)
    thorn_positions = [(8,8),(22,10),(6,18),(24,20),(10,24),(20,6)]
    for tx, ty in thorn_positions:
        set_px(px, tx, ty, thorn)
        set_px(px, tx+1, ty-1, thorn)
        set_px(px, tx-1, ty-1, thorn)
    return px

def gen_barkskin():
    px = new_canvas()
    icon_bg(px)
    bark = hex_to_rgba('#8B6914')
    bark_d = darken(bark)
    bark_l = lighten(bark)
    green = hex_to_rgba('#2ecc71')
    green_l = lighten(green)
    # Bark texture rectangle (shield-like)
    fill_rect(px, 7, 6, 17, 20, bark)
    # Bark lines/texture
    for y in range(8, 25, 3):
        draw_line(px, 8, y, 22, y, bark_d)
    for x in range(9, 22, 4):
        for y in range(7, 25, 6):
            set_px(px, x, y, bark_l)
    # Leaf accents at top
    fill_rect(px, 18, 4, 4, 3, green)
    fill_rect(px, 20, 3, 3, 2, green_l)
    set_px(px, 22, 2, green_l)
    # Small leaf bottom-left
    fill_rect(px, 5, 22, 3, 2, green)
    set_px(px, 4, 23, green_l)
    return px

def gen_tranquility():
    px = new_canvas()
    icon_bg(px)
    green = hex_to_rgba('#1abc9c')
    green_l = lighten(green)
    green_d = darken(green)
    trunk = hex_to_rgba('#5A3A1A')
    gold = hex_to_rgba('#ffd700', 100)
    # Tree trunk
    fill_rect(px, 14, 16, 3, 10, trunk)
    fill_rect(px, 13, 24, 5, 2, darken(trunk))
    # Tree canopy (layered circles)
    draw_circle(px, 15, 11, 7, green_d)
    draw_circle(px, 13, 9, 5, green)
    draw_circle(px, 18, 10, 4, green)
    draw_circle(px, 15, 8, 4, green_l)
    # Golden aura
    draw_circle(px, 15, 13, 12, gold)
    # Sparkles
    for pos in [(6,6),(24,8),(5,20),(25,18),(8,14),(22,14)]:
        set_px(px, pos[0], pos[1], hex_to_rgba('#aaffcc', 180))
    return px

# ─── BLOOD MAGIC SKILLS ───

def gen_blood_pact():
    px = new_canvas()
    icon_bg(px)
    red = hex_to_rgba('#c0392b')
    red_l = lighten(red)
    red_d = darken(red)
    chain = hex_to_rgba('#888888')
    # Blood droplet
    # Top narrow
    set_px(px, 15, 4, red_l)
    fill_rect(px, 14, 5, 3, 2, red_l)
    fill_rect(px, 13, 7, 5, 2, red)
    fill_rect(px, 12, 9, 7, 3, red)
    fill_rect(px, 12, 12, 7, 2, red_d)
    fill_rect(px, 13, 14, 5, 1, red_d)
    fill_rect(px, 14, 15, 3, 1, red_d)
    # Highlight
    set_px(px, 14, 8, lighten(red_l))
    set_px(px, 13, 10, red_l)
    # Chain links below
    for cy in [19, 23, 27]:
        draw_border(px, 13, cy, 5, 3, chain)
    return px

def gen_sanguine_fury():
    px = new_canvas()
    icon_bg(px)
    red = hex_to_rgba('#e74c3c')
    red_l = lighten(red)
    crimson = hex_to_rgba('#8e44ad')
    orange = hex_to_rgba('#ff6600')
    # Fire shape in red
    fill_rect(px, 11, 16, 9, 6, red)
    fill_rect(px, 10, 12, 11, 5, red)
    fill_rect(px, 12, 8, 7, 5, red_l)
    fill_rect(px, 13, 5, 5, 4, orange)
    fill_rect(px, 14, 3, 3, 3, hex_to_rgba('#ffaa00'))
    set_px(px, 15, 2, hex_to_rgba('#ffcc00'))
    # Side flames
    fill_rect(px, 8, 14, 3, 4, darken(red))
    fill_rect(px, 20, 14, 3, 4, darken(red))
    # Blood drops falling
    for dx, dy in [(9,24),(13,26),(18,25),(22,23)]:
        set_px(px, dx, dy, crimson)
        set_px(px, dx, dy+1, darken(crimson))
    return px

def gen_crimson_drain():
    px = new_canvas()
    icon_bg(px)
    red = hex_to_rgba('#e74c3c')
    red_d = darken(red)
    crimson = hex_to_rgba('#922B21')
    # Inward spiral vortex
    import math
    for t in range(60):
        a = t * 0.35
        r = 12 - t * 0.18
        if r < 1: r = 1
        x = int(15 + r * math.cos(a))
        y = int(15 + r * math.sin(a))
        c = crimson if t < 20 else red_d if t < 40 else red
        set_px(px, x, y, c)
    # Center dark core
    draw_circle(px, 15, 15, 2, hex_to_rgba('#111111'))
    set_px(px, 15, 15, red)
    # Outer red particles being pulled in
    for pos in [(4,6),(26,8),(3,22),(27,20),(6,28),(24,4)]:
        set_px(px, pos[0], pos[1], red_d)
    return px

def gen_blood_ritual():
    px = new_canvas()
    icon_bg(px)
    red = hex_to_rgba('#922B21')
    red_l = lighten(red)
    glow = hex_to_rgba('#e74c3c', 120)
    # Circle
    import math
    for t in range(40):
        a = t * math.pi * 2 / 40
        x = int(15 + 11 * math.cos(a))
        y = int(15 + 11 * math.sin(a))
        set_px(px, x, y, red)
    # Inner pentagon/pentagram
    pts = []
    for i in range(5):
        a = -math.pi/2 + i * math.pi * 2 / 5
        pts.append((int(15 + 8 * math.cos(a)), int(15 + 8 * math.sin(a))))
    # Draw star lines (connect every other point)
    for i in range(5):
        j = (i + 2) % 5
        draw_line(px, pts[i][0], pts[i][1], pts[j][0], pts[j][1], red_l)
    # Center glow
    draw_circle(px, 15, 15, 3, glow)
    set_px(px, 15, 15, hex_to_rgba('#ff4444'))
    return px

# ─── FIRE SKILLS ───

def gen_firebolt():
    px = new_canvas()
    icon_bg(px)
    core = hex_to_rgba('#FFEE44')
    bright = hex_to_rgba('#FF8800')
    mid = hex_to_rgba('#FF4400')
    outer = hex_to_rgba('#CC2200')
    # Fireball (moving right)
    draw_circle(px, 16, 15, 5, mid)
    draw_circle(px, 16, 15, 3, bright)
    draw_circle(px, 16, 15, 1, core)
    # Trail to the left
    fill_rect(px, 8, 13, 4, 5, mid)
    fill_rect(px, 5, 14, 4, 3, outer)
    set_px(px, 4, 15, hex_to_rgba('#881100', 180))
    # Flame tips
    set_px(px, 22, 14, bright)
    set_px(px, 23, 15, mid)
    set_px(px, 21, 12, hex_to_rgba('#FF6600', 140))
    set_px(px, 21, 18, hex_to_rgba('#FF6600', 140))
    # Sparks
    set_px(px, 6, 12, hex_to_rgba('#FFAA00', 120))
    set_px(px, 4, 17, hex_to_rgba('#FF6600', 100))
    # Specular highlight
    set_px(px, 15, 13, hex_to_rgba('#FFFFFF', 220))
    return px

def gen_ignite():
    px = new_canvas()
    icon_bg(px)
    fire = hex_to_rgba('#e67e22')
    fire_l = hex_to_rgba('#ffaa00')
    fire_d = hex_to_rgba('#cc4400')
    white = hex_to_rgba('#ffee88')
    # Ground line
    fill_rect(px, 6, 24, 19, 2, hex_to_rgba('#444444'))
    # Rising flames
    fill_rect(px, 11, 18, 9, 6, fire)
    fill_rect(px, 10, 14, 11, 5, fire)
    fill_rect(px, 12, 10, 7, 5, fire_l)
    fill_rect(px, 13, 7, 5, 4, fire_l)
    fill_rect(px, 14, 5, 3, 3, white)
    set_px(px, 15, 4, hex_to_rgba('#ffddaa'))
    # Side licks
    fill_rect(px, 8, 16, 3, 4, fire_d)
    fill_rect(px, 20, 16, 3, 4, fire_d)
    set_px(px, 7, 14, fire_d)
    set_px(px, 23, 14, fire_d)
    # Sparks
    set_px(px, 10, 8, hex_to_rgba('#ffcc00', 160))
    set_px(px, 21, 10, hex_to_rgba('#ffaa00', 140))
    return px

def gen_flame_wave():
    px = new_canvas()
    icon_bg(px)
    fire = hex_to_rgba('#d35400')
    fire_l = hex_to_rgba('#ff6600')
    fire_d = hex_to_rgba('#aa2200')
    yellow = hex_to_rgba('#ffaa00')
    # Expanding wave (left to right, widening)
    for x in range(6, 26):
        spread = (x - 6) * 0.5
        top = int(15 - spread)
        bot = int(15 + spread)
        for y in range(top, bot+1):
            if 0 <= y < 32:
                dist = abs(y - 15)
                if dist < spread * 0.3:
                    set_px(px, x, y, yellow)
                elif dist < spread * 0.6:
                    set_px(px, x, y, fire_l)
                else:
                    set_px(px, x, y, fire)
    # Dark outer edges
    for x in range(16, 26):
        spread = (x - 6) * 0.5
        set_px(px, x, int(15 - spread), fire_d)
        set_px(px, x, int(15 + spread), fire_d)
    # Source point glow
    draw_circle(px, 6, 15, 2, yellow)
    return px

def gen_meteor():
    px = new_canvas()
    icon_bg(px)
    rock = hex_to_rgba('#663322')
    rock_l = hex_to_rgba('#884433')
    fire = hex_to_rgba('#ff4400')
    fire_l = hex_to_rgba('#ff8800')
    yellow = hex_to_rgba('#ffcc00')
    # Meteor rock (diagonal, falling)
    draw_circle(px, 17, 18, 6, rock)
    draw_circle(px, 16, 17, 5, rock_l)
    draw_circle(px, 15, 16, 3, hex_to_rgba('#995544'))
    # Crater details
    set_px(px, 18, 20, darken(rock))
    set_px(px, 15, 19, darken(rock))
    # Fire trail (going up-right)
    fill_rect(px, 8, 8, 6, 4, fire)
    fill_rect(px, 5, 5, 5, 4, fire_l)
    fill_rect(px, 3, 3, 4, 3, yellow)
    set_px(px, 2, 2, hex_to_rgba('#ffee88'))
    # Connection between trail and rock
    fill_rect(px, 12, 12, 4, 4, fire)
    fill_rect(px, 10, 10, 3, 3, fire_l)
    # Sparks around meteor
    set_px(px, 24, 14, fire_l)
    set_px(px, 22, 24, fire)
    set_px(px, 12, 22, fire_l)
    return px

# ─── ICE SKILLS ───

def gen_frostbolt():
    px = new_canvas()
    icon_bg(px)
    ice = hex_to_rgba('#3498db')
    ice_l = hex_to_rgba('#5dade2')
    ice_d = hex_to_rgba('#2471a3')
    white = hex_to_rgba('#aaddff')
    core = hex_to_rgba('#ddeeff')
    # Ice shard (diagonal, flying right)
    # Main crystal body
    draw_diamond(px, 16, 15, 6, ice)
    draw_diamond(px, 15, 14, 4, ice_l)
    draw_diamond(px, 14, 13, 2, core)
    # Elongate: extra points
    set_px(px, 22, 15, ice_d)
    set_px(px, 21, 14, ice)
    set_px(px, 21, 16, ice)
    set_px(px, 10, 15, ice_d)
    # Trail
    for x in [5, 7, 9]:
        set_px(px, x, 15, hex_to_rgba('#3498db', 120))
        set_px(px, x, 16, hex_to_rgba('#2471a3', 80))
    # Sparkle
    set_px(px, 14, 12, hex_to_rgba('#ffffff', 220))
    # Frost particles
    set_px(px, 8, 12, hex_to_rgba('#5dade2', 100))
    set_px(px, 6, 18, hex_to_rgba('#5dade2', 80))
    return px

def gen_ice_nova():
    px = new_canvas()
    icon_bg(px)
    ice = hex_to_rgba('#2980b9')
    ice_l = hex_to_rgba('#5dade2')
    white = hex_to_rgba('#ddeeff')
    # Expanding rings
    import math
    for ring in range(3):
        r = 4 + ring * 4
        for t in range(32):
            a = t * math.pi * 2 / 32
            x = int(15 + r * math.cos(a))
            y = int(15 + r * math.sin(a))
            c = white if ring == 0 else ice_l if ring == 1 else ice
            set_px(px, x, y, c)
    # Crystal points at cardinal directions
    for dx, dy in [(0,-12),(0,12),(-12,0),(12,0)]:
        set_px(px, 15+dx, 15+dy, white)
        set_px(px, 15+dx, 15+dy-1, ice_l)
        set_px(px, 15+dx, 15+dy+1, ice_l)
    # Center snowflake
    fill_rect(px, 14, 14, 3, 3, white)
    set_px(px, 15, 15, hex_to_rgba('#ffffff'))
    return px

def gen_frozen_prison():
    px = new_canvas()
    icon_bg(px)
    ice = hex_to_rgba('#1abc9c')
    ice_l = lighten(ice)
    ice_d = darken(ice)
    white = hex_to_rgba('#ddeeff')
    # Vertical ice bars
    for x in [8, 12, 16, 20, 24]:
        fill_rect(px, x, 4, 2, 24, ice)
        fill_rect(px, x, 4, 1, 24, ice_l)
    # Horizontal crossbar
    fill_rect(px, 7, 14, 19, 2, ice_d)
    # Icicles hanging from top
    for x in [9, 13, 17, 21]:
        set_px(px, x, 3, ice_l)
    for x in [10, 14, 18, 22]:
        fill_rect(px, x, 2, 1, 3, white)
    # Frost particles
    set_px(px, 6, 10, hex_to_rgba('#aaddff', 140))
    set_px(px, 26, 18, hex_to_rgba('#aaddff', 140))
    return px

def gen_blizzard():
    px = new_canvas()
    icon_bg(px)
    ice = hex_to_rgba('#2471a3')
    ice_l = hex_to_rgba('#5dade2')
    white = hex_to_rgba('#ddeeff')
    wind = hex_to_rgba('#85c1e9', 160)
    # Snowflake (6-pointed)
    cx, cy = 15, 13
    # Main axes
    draw_line(px, cx, cy-8, cx, cy+8, ice_l)
    draw_line(px, cx-7, cy-4, cx+7, cy+4, ice_l)
    draw_line(px, cx-7, cy+4, cx+7, cy-4, ice_l)
    # Branch tips
    for dx, dy in [(0,-8),(0,8),(-7,-4),(7,4),(-7,4),(7,-4)]:
        set_px(px, cx+dx, cy+dy, white)
    # Center
    draw_circle(px, cx, cy, 2, white)
    set_px(px, cx, cy, hex_to_rgba('#ffffff'))
    # Wind lines (diagonal)
    for y in [20, 23, 26]:
        draw_line(px, 4, y, 26, y-3, wind)
    # Snow particles
    for pos in [(5,8),(25,6),(3,18),(27,16),(8,26),(22,28)]:
        set_px(px, pos[0], pos[1], white)
    return px

# ─── LIGHTNING SKILLS ───

def gen_lightning_strike():
    px = new_canvas()
    icon_bg(px)
    yellow = hex_to_rgba('#f1c40f')
    yellow_l = lighten(yellow)
    white = hex_to_rgba('#ffffff', 220)
    # Classic zigzag bolt
    draw_line(px, 15, 2, 12, 9, yellow_l)
    draw_line(px, 12, 9, 18, 12, yellow)
    draw_line(px, 18, 12, 13, 19, yellow_l)
    draw_line(px, 13, 19, 19, 22, yellow)
    draw_line(px, 19, 22, 15, 29, yellow_l)
    # Thicken bolt
    draw_line(px, 16, 2, 13, 9, yellow)
    draw_line(px, 13, 9, 19, 12, yellow_l)
    draw_line(px, 19, 12, 14, 19, yellow)
    draw_line(px, 14, 19, 20, 22, yellow_l)
    draw_line(px, 20, 22, 16, 29, yellow)
    # White hot center line
    draw_line(px, 15, 3, 12, 9, white)
    draw_line(px, 18, 12, 13, 19, white)
    draw_line(px, 19, 22, 15, 28, white)
    # Glow
    set_px(px, 11, 8, hex_to_rgba('#f1c40f', 100))
    set_px(px, 20, 13, hex_to_rgba('#f1c40f', 100))
    set_px(px, 12, 20, hex_to_rgba('#f1c40f', 100))
    return px

def gen_chain_lightning():
    px = new_canvas()
    icon_bg(px)
    yellow = hex_to_rgba('#f39c12')
    yellow_l = lighten(yellow)
    white = hex_to_rgba('#ffffff', 200)
    # Main bolt (center)
    draw_line(px, 15, 2, 12, 8, yellow_l)
    draw_line(px, 12, 8, 17, 12, yellow)
    draw_line(px, 17, 12, 14, 18, yellow_l)
    draw_line(px, 14, 18, 16, 22, yellow)
    # Branch 1 (left)
    draw_line(px, 12, 8, 6, 12, yellow)
    draw_line(px, 6, 12, 4, 16, yellow)
    # Branch 2 (right)
    draw_line(px, 17, 12, 23, 14, yellow)
    draw_line(px, 23, 14, 26, 18, yellow)
    # Branch 3 (bottom-left)
    draw_line(px, 14, 18, 8, 24, yellow)
    # Branch 4 (bottom-right)
    draw_line(px, 16, 22, 22, 26, yellow)
    # White hot cores
    set_px(px, 12, 8, white)
    set_px(px, 17, 12, white)
    set_px(px, 14, 18, white)
    # Spark particles at tips
    for pos in [(4,16),(26,18),(8,24),(22,26)]:
        set_px(px, pos[0], pos[1], hex_to_rgba('#ffee44'))
    return px

def gen_static_field():
    px = new_canvas()
    icon_bg(px)
    yellow = hex_to_rgba('#d4ac0d')
    yellow_l = lighten(yellow)
    white = hex_to_rgba('#ffffff', 180)
    # Electric circle
    import math
    for t in range(48):
        a = t * math.pi * 2 / 48
        r = 10 + (2 if t % 4 == 0 else 0)  # jagged edge
        x = int(15 + r * math.cos(a))
        y = int(15 + r * math.sin(a))
        set_px(px, x, y, yellow_l)
    # Inner glow ring
    for t in range(32):
        a = t * math.pi * 2 / 32
        x = int(15 + 6 * math.cos(a))
        y = int(15 + 6 * math.sin(a))
        set_px(px, x, y, yellow)
    # Spark lines radiating outward
    for i in range(6):
        a = i * math.pi / 3
        x1 = int(15 + 10 * math.cos(a))
        y1 = int(15 + 10 * math.sin(a))
        x2 = int(15 + 13 * math.cos(a))
        y2 = int(15 + 13 * math.sin(a))
        draw_line(px, x1, y1, x2, y2, white)
    # Center glow
    draw_circle(px, 15, 15, 3, hex_to_rgba('#f1c40f', 140))
    set_px(px, 15, 15, hex_to_rgba('#ffffff'))
    return px

def gen_storm_call():
    px = new_canvas()
    icon_bg(px)
    cloud = hex_to_rgba('#555555')
    cloud_l = hex_to_rgba('#777777')
    yellow = hex_to_rgba('#f1c40f')
    yellow_l = lighten(yellow)
    white = hex_to_rgba('#ffffff', 200)
    # Cloud shape at top
    draw_circle(px, 11, 7, 5, cloud)
    draw_circle(px, 17, 6, 5, cloud)
    draw_circle(px, 22, 7, 4, cloud)
    fill_rect(px, 6, 7, 21, 5, cloud)
    # Cloud highlights
    draw_circle(px, 11, 5, 3, cloud_l)
    draw_circle(px, 17, 4, 3, cloud_l)
    # Lightning bolts from cloud
    # Bolt 1 (left)
    draw_line(px, 10, 12, 8, 18, yellow)
    draw_line(px, 8, 18, 11, 20, yellow_l)
    draw_line(px, 11, 20, 9, 26, yellow)
    # Bolt 2 (right)
    draw_line(px, 20, 12, 22, 17, yellow)
    draw_line(px, 22, 17, 19, 19, yellow_l)
    draw_line(px, 19, 19, 21, 25, yellow)
    # Center bolt (bright)
    draw_line(px, 15, 12, 14, 16, white)
    draw_line(px, 14, 16, 16, 18, yellow_l)
    draw_line(px, 16, 18, 15, 24, white)
    return px

# ─── DASH ───

def gen_dash():
    px = new_canvas()
    icon_bg(px)
    blue = hex_to_rgba('#3498db')
    blue_l = lighten(blue)
    white = hex_to_rgba('#ffffff', 200)
    # Arrow/chevron pointing right
    # Arrow head
    for i in range(7):
        set_px(px, 18+i, 15-i, blue_l)
        set_px(px, 18+i, 15+i, blue_l)
        set_px(px, 17+i, 15-i, blue)
        set_px(px, 17+i, 15+i, blue)
    # Arrow shaft
    fill_rect(px, 8, 13, 12, 5, blue)
    fill_rect(px, 8, 14, 12, 3, blue_l)
    # Bright center
    fill_rect(px, 10, 14, 8, 3, white)
    # Motion lines behind
    for y in [10, 15, 20]:
        draw_line(px, 2, y, 7, y, hex_to_rgba('#3498db', 120))
    for y in [12, 18]:
        draw_line(px, 3, y, 6, y, hex_to_rgba('#2980b9', 80))
    return px

# ─── REGISTRY ───

GENERATORS = {
    # Combat
    'power_strike': gen_power_strike,
    'heal': gen_heal,
    'evasion': gen_evasion,
    'precision_strike': gen_precision_strike,
    'fortify': gen_fortify,
    'venom_strike': gen_venom_strike,
    'cleave': gen_cleave,
    'war_cry': gen_war_cry,
    'iron_skin': gen_iron_skin,
    'life_steal': gen_life_steal,
    'whirlwind': gen_whirlwind,
    'execute': gen_execute,
    'shadow_step': gen_shadow_step,
    'regeneration': gen_regeneration,
    'berserker_rage': gen_berserker_rage,
    # Holy
    'holy_light': gen_holy_light,
    'blessing_of_might': gen_blessing_of_might,
    'divine_shield': gen_divine_shield,
    'divine_hymn': gen_divine_hymn,
    # Nature
    'rejuvenation': gen_rejuvenation,
    'thorns': gen_thorns,
    'barkskin': gen_barkskin,
    'tranquility': gen_tranquility,
    # Blood
    'blood_pact': gen_blood_pact,
    'sanguine_fury': gen_sanguine_fury,
    'crimson_drain': gen_crimson_drain,
    'blood_ritual': gen_blood_ritual,
    # Fire
    'firebolt': gen_firebolt,
    'ignite': gen_ignite,
    'flame_wave': gen_flame_wave,
    'meteor': gen_meteor,
    # Ice
    'frostbolt': gen_frostbolt,
    'ice_nova': gen_ice_nova,
    'frozen_prison': gen_frozen_prison,
    'blizzard': gen_blizzard,
    # Lightning
    'lightning_strike': gen_lightning_strike,
    'chain_lightning': gen_chain_lightning,
    'static_field': gen_static_field,
    'storm_call': gen_storm_call,
    # Universal
    'dash': gen_dash,
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
    print(f'Generated {len(GENERATORS)} skill icons in {os.path.abspath(OUT_DIR)}')

if __name__ == '__main__':
    main()
