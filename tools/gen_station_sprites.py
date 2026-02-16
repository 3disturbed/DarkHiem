#!/usr/bin/env python3
"""Generate pixel-art station sprites as 32x32 PNGs using only stdlib."""

import struct, zlib, os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'tileArt', 'stations')
SIZE = 32  # pixels

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
    """Create a PNG file from a 2D list of (r,g,b,a) tuples."""
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    raw = b''
    for row in pixels:
        raw += b'\x00'  # filter: none
        for r,g,b,a in row:
            raw += struct.pack('BBBB', r, g, b, a)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)  # 8-bit RGBA
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

# ─── WORKBENCH ───
def gen_workbench():
    px = new_canvas()
    wood = hex_to_rgba('#8B6914')
    wood_dark = darken(wood)
    wood_light = lighten(wood)
    plank = hex_to_rgba('#A07828')
    nail = hex_to_rgba('#C0C0C0')

    # Table top (thick slab)
    fill_rect(px, 4, 6, 24, 6, wood)
    fill_rect(px, 3, 6, 26, 1, wood_light)  # top highlight
    fill_rect(px, 4, 11, 24, 1, wood_dark)  # bottom shadow
    # Plank lines on top
    for x in range(5, 27, 4):
        for y in range(7, 11):
            set_px(px, x, y, wood_dark)

    # Legs
    fill_rect(px, 6, 12, 3, 14, wood_dark)
    fill_rect(px, 23, 12, 3, 14, wood_dark)
    # Leg highlights
    fill_rect(px, 6, 12, 1, 14, wood)
    fill_rect(px, 23, 12, 1, 14, wood)

    # Cross support bar
    fill_rect(px, 9, 18, 14, 2, plank)

    # Nails/bolts
    set_px(px, 7, 13, nail)
    set_px(px, 24, 13, nail)

    # Tools on top: hammer
    fill_rect(px, 9, 3, 2, 4, hex_to_rgba('#666666'))  # handle
    fill_rect(px, 7, 2, 6, 2, hex_to_rgba('#888888'))  # head

    # Saw blade hint
    for i in range(4):
        set_px(px, 18+i*2, 4, hex_to_rgba('#AAAAAA'))
        set_px(px, 19+i*2, 5, hex_to_rgba('#999999'))

    # Border
    draw_border(px, 2, 1, 28, 28, hex_to_rgba('#5A4010'))
    return px

# ─── FURNACE ───
def gen_furnace():
    px = new_canvas()
    brick = hex_to_rgba('#B22222')
    brick_dark = darken(brick)
    brick_light = lighten(brick, 1.2)
    mortar = hex_to_rgba('#8B7355')
    fire = hex_to_rgba('#FF6600')
    fire_y = hex_to_rgba('#FFAA00')
    smoke = hex_to_rgba('#666666', 120)

    # Body (brick structure)
    fill_rect(px, 5, 6, 22, 22, brick)

    # Brick pattern (mortar lines)
    for y in range(8, 27, 3):
        for x in range(5, 27):
            set_px(px, x, y, mortar)
    for y in range(6, 28, 3):
        offset = 4 if (y//3) % 2 == 0 else 0
        for x in range(5+offset, 27, 8):
            if 0 <= y < 32 and 0 <= x < 32:
                set_px(px, x, y, mortar)
                if y+1 < 32: set_px(px, x, y+1, mortar)

    # Top rim
    fill_rect(px, 4, 5, 24, 2, brick_dark)
    fill_rect(px, 4, 5, 24, 1, brick_light)

    # Fire opening (mouth)
    fill_rect(px, 10, 18, 12, 8, hex_to_rgba('#1a1a1a'))
    # Arch top
    fill_rect(px, 11, 17, 10, 1, hex_to_rgba('#1a1a1a'))
    fill_rect(px, 12, 16, 8, 1, hex_to_rgba('#1a1a1a'))

    # Fire inside
    fill_rect(px, 12, 22, 8, 3, fire)
    fill_rect(px, 13, 20, 6, 2, fire_y)
    fill_rect(px, 14, 19, 4, 1, hex_to_rgba('#FFDD44'))
    set_px(px, 15, 18, hex_to_rgba('#FFEE88'))

    # Chimney
    fill_rect(px, 13, 1, 6, 5, brick_dark)
    # Smoke
    set_px(px, 15, 0, smoke)
    set_px(px, 16, 0, smoke)

    return px

# ─── FORGE ───
def gen_forge():
    px = new_canvas()
    stone = hex_to_rgba('#4A4A4A')
    stone_dark = darken(stone)
    stone_light = lighten(stone, 1.3)
    iron = hex_to_rgba('#707070')
    fire = hex_to_rgba('#FF4400')
    fire_y = hex_to_rgba('#FF8800')
    ember = hex_to_rgba('#FFCC00')

    # Anvil base/forge body
    fill_rect(px, 3, 10, 26, 18, stone)
    fill_rect(px, 3, 10, 26, 1, stone_light)

    # Stone texture
    for y in range(12, 28, 4):
        for x in range(4, 28, 5):
            set_px(px, x, y, stone_dark)
            set_px(px, x+1, y, stone_dark)

    # Fire pit (center)
    fill_rect(px, 8, 12, 10, 8, hex_to_rgba('#222222'))
    fill_rect(px, 9, 14, 8, 5, fire)
    fill_rect(px, 10, 15, 6, 3, fire_y)
    fill_rect(px, 11, 16, 4, 1, ember)

    # Bellows (right side)
    fill_rect(px, 20, 13, 7, 6, hex_to_rgba('#8B6914'))
    fill_rect(px, 20, 13, 7, 1, lighten(hex_to_rgba('#8B6914')))
    fill_rect(px, 22, 15, 3, 2, hex_to_rgba('#666666'))

    # Anvil on top
    fill_rect(px, 6, 5, 14, 5, iron)
    fill_rect(px, 4, 7, 3, 3, iron)      # horn left
    fill_rect(px, 19, 7, 4, 3, iron)     # horn right
    fill_rect(px, 6, 5, 14, 1, stone_light) # highlight
    fill_rect(px, 9, 3, 8, 2, lighten(iron)) # flat top

    # Hammer resting
    fill_rect(px, 22, 3, 2, 6, hex_to_rgba('#8B6914'))
    fill_rect(px, 20, 2, 6, 2, hex_to_rgba('#888888'))

    return px

# ─── COOKING FIRE ───
def gen_cooking_fire():
    px = new_canvas()
    wood = hex_to_rgba('#6B4414')
    stone = hex_to_rgba('#777777')
    fire = hex_to_rgba('#FF6600')
    fire_y = hex_to_rgba('#FFAA00')
    fire_w = hex_to_rgba('#FFEE88')
    pot = hex_to_rgba('#444444')

    # Stone ring
    stones = [(10,22),(14,24),(18,24),(22,22),(24,18),(24,14),(22,10),(18,8),(14,8),(10,10),(8,14),(8,18)]
    for sx, sy in stones:
        fill_rect(px, sx, sy, 3, 3, stone)
        set_px(px, sx, sy, lighten(stone))

    # Logs
    fill_rect(px, 11, 18, 10, 2, wood)
    fill_rect(px, 13, 16, 6, 2, darken(wood))
    fill_rect(px, 12, 20, 8, 2, darken(wood, 0.8))

    # Fire
    fill_rect(px, 13, 12, 6, 6, fire)
    fill_rect(px, 14, 10, 4, 4, fire_y)
    fill_rect(px, 15, 8, 2, 3, fire_w)
    set_px(px, 15, 7, hex_to_rgba('#FFDDAA', 180))
    set_px(px, 16, 6, hex_to_rgba('#FFDDAA', 100))

    # Sparks
    set_px(px, 12, 9, hex_to_rgba('#FFAA00', 200))
    set_px(px, 19, 8, hex_to_rgba('#FFCC00', 180))
    set_px(px, 11, 7, hex_to_rgba('#FF8800', 150))

    # Cooking pot / spit
    fill_rect(px, 7, 5, 1, 14, hex_to_rgba('#555555'))  # left pole
    fill_rect(px, 24, 5, 1, 14, hex_to_rgba('#555555'))  # right pole
    fill_rect(px, 7, 5, 18, 1, hex_to_rgba('#666666'))   # crossbar
    # Pot hanging
    set_px(px, 16, 6, hex_to_rgba('#555555'))
    fill_rect(px, 13, 7, 6, 4, pot)
    fill_rect(px, 13, 7, 6, 1, lighten(pot))

    return px

# ─── GEM TABLE ───
def gen_gem_table():
    px = new_canvas()
    cloth = hex_to_rgba('#9B59B6')
    cloth_dark = darken(cloth)
    cloth_light = lighten(cloth, 1.2)
    wood = hex_to_rgba('#5A3A1A')
    gem_r = hex_to_rgba('#FF3333')
    gem_b = hex_to_rgba('#3399FF')
    gem_g = hex_to_rgba('#33FF66')
    gem_y = hex_to_rgba('#FFEE33')
    crystal = hex_to_rgba('#DDDDFF')

    # Table body
    fill_rect(px, 4, 8, 24, 5, wood)
    fill_rect(px, 3, 8, 26, 1, lighten(wood))

    # Purple cloth on top
    fill_rect(px, 3, 6, 26, 3, cloth)
    fill_rect(px, 3, 6, 26, 1, cloth_light)
    fill_rect(px, 4, 8, 24, 1, cloth_dark)
    # Cloth drape
    fill_rect(px, 2, 8, 2, 3, cloth_dark)
    fill_rect(px, 28, 8, 2, 3, cloth_dark)

    # Legs
    fill_rect(px, 6, 13, 2, 14, wood)
    fill_rect(px, 24, 13, 2, 14, wood)
    fill_rect(px, 6, 13, 1, 14, lighten(wood))
    fill_rect(px, 24, 13, 1, 14, lighten(wood))

    # Cross beam
    fill_rect(px, 8, 20, 16, 2, darken(wood))

    # Gems scattered on table
    fill_rect(px, 7, 4, 3, 3, gem_r)
    set_px(px, 7, 4, lighten(gem_r))

    fill_rect(px, 14, 5, 3, 2, gem_b)
    set_px(px, 14, 5, lighten(gem_b))

    fill_rect(px, 21, 4, 3, 3, gem_g)
    set_px(px, 21, 4, lighten(gem_g))

    # Small yellow gem
    fill_rect(px, 11, 6, 2, 2, gem_y)
    set_px(px, 11, 6, lighten(gem_y))

    # Magnifying glass
    fill_rect(px, 25, 2, 4, 4, crystal)
    draw_border(px, 25, 2, 4, 4, hex_to_rgba('#888888'))
    fill_rect(px, 27, 6, 1, 3, hex_to_rgba('#8B6914'))

    return px

# ─── ARCANE TABLE ───
def gen_arcane_table():
    px = new_canvas()
    purple = hex_to_rgba('#6a0dad')
    purple_dark = darken(purple)
    purple_light = lighten(purple, 1.4)
    wood = hex_to_rgba('#2A1A3A')
    gold = hex_to_rgba('#FFD700')
    glow = hex_to_rgba('#AA66FF', 160)
    rune = hex_to_rgba('#CC99FF')

    # Table body (dark ornate)
    fill_rect(px, 4, 8, 24, 5, wood)
    fill_rect(px, 3, 7, 26, 2, purple_dark)
    fill_rect(px, 3, 7, 26, 1, purple)

    # Gold trim
    fill_rect(px, 3, 9, 26, 1, gold)
    fill_rect(px, 3, 12, 26, 1, gold)

    # Legs (ornate)
    fill_rect(px, 5, 13, 3, 14, wood)
    fill_rect(px, 24, 13, 3, 14, wood)
    # Gold leg accents
    fill_rect(px, 5, 16, 3, 1, gold)
    fill_rect(px, 24, 16, 3, 1, gold)
    fill_rect(px, 5, 22, 3, 1, gold)
    fill_rect(px, 24, 22, 3, 1, gold)

    # Glowing runes on top
    # Rune circle
    rune_pts = [(16,3),(19,4),(21,6),(21,9),(19,11),(16,12),(13,11),(11,9),(11,6),(13,4)]
    for rx, ry in rune_pts:
        set_px(px, rx, ry, rune)

    # Center glow
    fill_rect(px, 15, 6, 2, 2, glow)
    set_px(px, 15, 5, hex_to_rgba('#CC99FF', 100))
    set_px(px, 16, 5, hex_to_rgba('#CC99FF', 100))

    # Book/scroll
    fill_rect(px, 7, 4, 4, 5, hex_to_rgba('#8B2222'))
    fill_rect(px, 8, 5, 2, 3, hex_to_rgba('#F5DEB3'))

    # Floating orb
    fill_rect(px, 22, 2, 3, 3, hex_to_rgba('#BB77FF', 200))
    set_px(px, 23, 2, hex_to_rgba('#DDAAFF', 220))

    return px

# ─── BOSS ALTAR ───
def gen_boss_altar():
    px = new_canvas()
    copper = hex_to_rgba('#B87333')
    copper_dark = darken(copper)
    copper_light = lighten(copper, 1.3)
    stone = hex_to_rgba('#555555')
    stone_dark = darken(stone)
    gold = hex_to_rgba('#FFD700')
    glow = hex_to_rgba('#FF6633', 140)

    # Base platform (octagonal suggestion)
    fill_rect(px, 6, 20, 20, 8, stone)
    fill_rect(px, 4, 22, 24, 6, stone)
    fill_rect(px, 4, 22, 24, 1, lighten(stone))

    # Pillar body
    fill_rect(px, 10, 6, 12, 16, copper)
    fill_rect(px, 10, 6, 2, 16, copper_light)  # left highlight
    fill_rect(px, 20, 6, 2, 16, copper_dark)   # right shadow

    # Top crown
    fill_rect(px, 8, 4, 16, 3, copper)
    fill_rect(px, 8, 4, 16, 1, copper_light)

    # Gold accents
    fill_rect(px, 8, 6, 16, 1, gold)
    fill_rect(px, 10, 13, 12, 1, gold)

    # Skull/emblem center
    fill_rect(px, 13, 8, 6, 5, hex_to_rgba('#DDDDCC'))
    set_px(px, 14, 9, hex_to_rgba('#111111'))  # left eye
    set_px(px, 17, 9, hex_to_rgba('#111111'))  # right eye
    fill_rect(px, 14, 11, 4, 1, hex_to_rgba('#111111'))  # mouth

    # Glow effect at base
    fill_rect(px, 8, 19, 16, 2, glow)

    # Spikes on top
    for sx in [9, 13, 17, 21]:
        set_px(px, sx, 3, copper_light)
        set_px(px, sx, 2, copper_light)

    return px

# ─── WOODEN CHEST ───
def gen_wooden_chest():
    px = new_canvas()
    wood = hex_to_rgba('#8B6914')
    wood_dark = darken(wood)
    wood_light = lighten(wood)
    iron = hex_to_rgba('#888888')
    gold_clasp = hex_to_rgba('#F1C40F')

    # Body
    fill_rect(px, 4, 12, 24, 14, wood)
    # Lid
    fill_rect(px, 4, 8, 24, 5, wood_light)
    fill_rect(px, 3, 7, 26, 2, wood)
    fill_rect(px, 3, 7, 26, 1, lighten(wood_light))

    # Plank lines
    for y in [14, 18, 22]:
        fill_rect(px, 4, y, 24, 1, wood_dark)

    # Iron bands
    fill_rect(px, 4, 10, 24, 1, iron)
    fill_rect(px, 4, 25, 24, 1, iron)

    # Vertical bands
    fill_rect(px, 8, 8, 2, 18, iron)
    fill_rect(px, 22, 8, 2, 18, iron)

    # Gold clasp/lock
    fill_rect(px, 14, 10, 4, 4, gold_clasp)
    fill_rect(px, 15, 14, 2, 2, darken(gold_clasp))

    # Keyhole
    set_px(px, 15, 11, hex_to_rgba('#333333'))
    set_px(px, 16, 11, hex_to_rgba('#333333'))

    # Border shadow
    fill_rect(px, 4, 26, 24, 1, wood_dark)

    return px

# ─── REINFORCED CHEST ───
def gen_reinforced_chest():
    px = new_canvas()
    wood = hex_to_rgba('#A0782C')
    wood_dark = darken(wood)
    wood_light = lighten(wood)
    iron = hex_to_rgba('#707070')
    iron_light = lighten(iron)
    gold = hex_to_rgba('#DAA520')

    # Body
    fill_rect(px, 4, 12, 24, 14, wood)
    # Lid
    fill_rect(px, 3, 7, 26, 6, wood_light)
    fill_rect(px, 3, 7, 26, 1, lighten(wood_light))

    # Heavy iron bands (more than wooden)
    fill_rect(px, 4, 12, 24, 2, iron)
    fill_rect(px, 4, 18, 24, 1, iron)
    fill_rect(px, 4, 24, 24, 2, iron)

    # Corner reinforcements
    fill_rect(px, 4, 7, 4, 4, iron)
    fill_rect(px, 24, 7, 4, 4, iron)
    fill_rect(px, 4, 22, 4, 4, iron)
    fill_rect(px, 24, 22, 4, 4, iron)
    # Rivets
    set_px(px, 5, 8, iron_light)
    set_px(px, 26, 8, iron_light)
    set_px(px, 5, 24, iron_light)
    set_px(px, 26, 24, iron_light)

    # Cross bands
    fill_rect(px, 14, 7, 4, 19, iron)

    # Gold lock plate
    fill_rect(px, 13, 10, 6, 5, gold)
    fill_rect(px, 14, 15, 4, 2, darken(gold))
    set_px(px, 15, 12, hex_to_rgba('#222222'))
    set_px(px, 16, 12, hex_to_rgba('#222222'))

    return px

# ─── IRON CHEST ───
def gen_iron_chest():
    px = new_canvas()
    iron = hex_to_rgba('#6A6A6A')
    iron_dark = darken(iron)
    iron_light = lighten(iron, 1.3)
    rivet = hex_to_rgba('#AAAAAA')
    gold = hex_to_rgba('#DAA520')

    # Body (all metal)
    fill_rect(px, 4, 12, 24, 14, iron)
    # Lid
    fill_rect(px, 3, 7, 26, 6, iron_light)
    fill_rect(px, 3, 7, 26, 1, lighten(iron_light))

    # Panel lines
    fill_rect(px, 4, 12, 24, 1, iron_dark)
    fill_rect(px, 15, 7, 2, 19, iron_dark)

    # Rivets around edges
    for x in range(6, 26, 4):
        set_px(px, x, 8, rivet)
        set_px(px, x, 25, rivet)
    for y in range(9, 25, 3):
        set_px(px, 5, y, rivet)
        set_px(px, 26, y, rivet)

    # Center band
    fill_rect(px, 4, 16, 24, 2, iron_dark)
    fill_rect(px, 4, 16, 24, 1, iron_light)

    # Ornate lock
    fill_rect(px, 12, 10, 8, 6, gold)
    draw_border(px, 12, 10, 8, 6, darken(gold))
    fill_rect(px, 14, 12, 4, 2, hex_to_rgba('#222222'))
    set_px(px, 15, 12, hex_to_rgba('#FFE444'))
    set_px(px, 16, 12, hex_to_rgba('#FFE444'))

    # Handle on top
    fill_rect(px, 13, 5, 6, 2, iron_dark)
    fill_rect(px, 14, 4, 4, 1, iron)

    return px

# ─── OBSIDIAN VAULT ───
def gen_obsidian_vault():
    px = new_canvas()
    obs = hex_to_rgba('#2A1A3A')
    obs_dark = darken(obs)
    obs_light = lighten(obs, 1.6)
    purple = hex_to_rgba('#6633AA', 200)
    gold = hex_to_rgba('#FFD700')
    glow = hex_to_rgba('#9933FF', 140)

    # Body
    fill_rect(px, 4, 12, 24, 14, obs)
    # Lid
    fill_rect(px, 3, 7, 26, 6, obs)
    fill_rect(px, 3, 7, 26, 1, obs_light)

    # Purple crystalline veins
    for x, y in [(6,14),(10,16),(18,20),(22,15),(8,22),(20,24),(14,19)]:
        set_px(px, x, y, purple)
        set_px(px, x+1, y, hex_to_rgba('#8844CC', 160))

    # Gold ornate trim
    fill_rect(px, 3, 12, 26, 1, gold)
    fill_rect(px, 3, 25, 26, 1, gold)
    fill_rect(px, 4, 7, 24, 1, gold)

    # Corner gold accents
    fill_rect(px, 4, 7, 3, 3, gold)
    fill_rect(px, 25, 7, 3, 3, gold)
    fill_rect(px, 4, 23, 3, 3, gold)
    fill_rect(px, 25, 23, 3, 3, gold)

    # Arcane lock
    fill_rect(px, 12, 9, 8, 6, hex_to_rgba('#111111'))
    # Glowing rune in lock
    fill_rect(px, 14, 10, 4, 4, glow)
    set_px(px, 15, 11, hex_to_rgba('#CC66FF'))
    set_px(px, 16, 11, hex_to_rgba('#CC66FF'))

    # Glow around lock
    for x in range(11, 21):
        set_px(px, x, 8, hex_to_rgba('#6633AA', 80))

    # Handles
    fill_rect(px, 13, 5, 6, 2, obs_light)
    fill_rect(px, 14, 4, 4, 1, gold)

    return px


# ─── KILN ───
def gen_kiln():
    px = new_canvas()
    stone = hex_to_rgba('#8B7355')
    stone_dark = darken(stone)
    stone_light = lighten(stone, 1.2)
    fire = hex_to_rgba('#FF6600')
    fire_y = hex_to_rgba('#FFAA00')
    smoke = hex_to_rgba('#666666', 100)

    # Dome body (stone dome shape)
    # Bottom base
    fill_rect(px, 6, 22, 20, 6, stone)
    # Middle section
    fill_rect(px, 5, 16, 22, 6, stone)
    # Upper section
    fill_rect(px, 7, 11, 18, 5, stone)
    # Top dome
    fill_rect(px, 9, 8, 14, 3, stone)
    fill_rect(px, 11, 6, 10, 2, stone)
    fill_rect(px, 13, 5, 6, 1, stone_dark)

    # Stone texture - darker patches
    for y in range(8, 28, 4):
        for x in range(6, 26, 5):
            set_px(px, x, y, stone_dark)
            set_px(px, x+1, y, stone_dark)

    # Lighter highlights on dome
    for x in range(10, 22, 3):
        set_px(px, x, 9, stone_light)
    for x in range(8, 24, 3):
        set_px(px, x, 14, stone_light)

    # Opening (front mouth)
    fill_rect(px, 11, 20, 10, 8, hex_to_rgba('#1a1a1a'))
    # Arch top
    fill_rect(px, 12, 19, 8, 1, hex_to_rgba('#1a1a1a'))
    fill_rect(px, 13, 18, 6, 1, hex_to_rgba('#1a1a1a'))

    # Fire glow inside
    fill_rect(px, 13, 24, 6, 3, fire)
    fill_rect(px, 14, 22, 4, 2, fire_y)
    set_px(px, 15, 21, hex_to_rgba('#FFDD44'))
    set_px(px, 16, 21, hex_to_rgba('#FFDD44'))

    # Chimney hole at top
    fill_rect(px, 14, 4, 4, 2, hex_to_rgba('#333333'))
    # Smoke wisps
    set_px(px, 15, 2, smoke)
    set_px(px, 16, 1, smoke)
    set_px(px, 15, 0, hex_to_rgba('#555555', 60))

    # Orange glow around opening
    set_px(px, 10, 21, hex_to_rgba('#FF8800', 100))
    set_px(px, 10, 22, hex_to_rgba('#FF6600', 80))
    set_px(px, 21, 21, hex_to_rgba('#FF8800', 100))
    set_px(px, 21, 22, hex_to_rgba('#FF6600', 80))

    return px

# ─── FISH SMOKER ───
def gen_fish_smoker():
    px = new_canvas()
    wood = hex_to_rgba('#6B4226')
    wood_dark = darken(wood)
    wood_light = lighten(wood, 1.3)
    iron = hex_to_rgba('#555555')
    iron_light = lighten(iron, 1.3)
    smoke = hex_to_rgba('#888888', 120)
    grill = hex_to_rgba('#444444')
    ember = hex_to_rgba('#FF6600')
    ember_y = hex_to_rgba('#FFAA00')

    # Base/barrel body
    fill_rect(px, 6, 14, 20, 14, wood)
    fill_rect(px, 5, 16, 22, 10, wood)
    # Top rim
    fill_rect(px, 7, 13, 18, 2, wood_dark)
    # Wood grain
    for y in range(16, 27, 3):
        fill_rect(px, 6, y, 20, 1, wood_dark)
    # Light highlights
    fill_rect(px, 7, 15, 1, 10, wood_light)
    fill_rect(px, 24, 15, 1, 10, wood_light)

    # Iron bands
    fill_rect(px, 5, 18, 22, 1, iron)
    fill_rect(px, 5, 24, 22, 1, iron)
    # Band rivets
    for x in [7, 11, 15, 19, 23]:
        set_px(px, x, 18, iron_light)
        set_px(px, x, 24, iron_light)

    # Lid (slightly lifted showing smoke gap)
    fill_rect(px, 7, 10, 18, 3, iron)
    fill_rect(px, 8, 9, 16, 1, iron_light)
    # Handle on lid
    fill_rect(px, 14, 8, 4, 2, iron_light)
    fill_rect(px, 15, 7, 2, 1, iron)

    # Grill lines visible through gap
    fill_rect(px, 8, 13, 16, 1, grill)
    for x in range(9, 24, 2):
        set_px(px, x, 13, wood_dark)

    # Ember glow at bottom
    fill_rect(px, 10, 26, 12, 2, hex_to_rgba('#331100'))
    set_px(px, 12, 27, ember)
    set_px(px, 15, 27, ember_y)
    set_px(px, 18, 27, ember)

    # Smoke wisps rising from lid gap
    set_px(px, 12, 8, smoke)
    set_px(px, 11, 6, hex_to_rgba('#777777', 100))
    set_px(px, 13, 5, hex_to_rgba('#888888', 80))
    set_px(px, 19, 7, smoke)
    set_px(px, 20, 5, hex_to_rgba('#777777', 90))
    set_px(px, 18, 4, hex_to_rgba('#666666', 60))
    set_px(px, 15, 3, hex_to_rgba('#555555', 50))
    set_px(px, 16, 2, hex_to_rgba('#555555', 40))

    # Fish silhouette hint on side
    fill_rect(px, 11, 20, 6, 1, wood_light)
    set_px(px, 17, 20, wood_light)
    set_px(px, 10, 20, wood_light)
    set_px(px, 18, 19, wood_light)
    set_px(px, 18, 21, wood_light)

    return px


GENERATORS = {
    'workbench': gen_workbench,
    'furnace': gen_furnace,
    'forge': gen_forge,
    'cooking_fire': gen_cooking_fire,
    'gem_table': gen_gem_table,
    'arcane_table': gen_arcane_table,
    'boss_altar': gen_boss_altar,
    'wooden_chest': gen_wooden_chest,
    'reinforced_chest': gen_reinforced_chest,
    'iron_chest': gen_iron_chest,
    'obsidian_vault': gen_obsidian_vault,
    'kiln': gen_kiln,
    'fish_smoker': gen_fish_smoker,
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
    print(f'Generated {len(GENERATORS)} sprites in {os.path.abspath(OUT_DIR)}')

if __name__ == '__main__':
    main()
