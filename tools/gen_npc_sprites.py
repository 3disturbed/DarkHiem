#!/usr/bin/env python3
"""Generate pixel-art NPC sprites as 32x32 PNGs using only stdlib."""

import struct, zlib, os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'tileArt', 'npcs')
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

def fill_circle(px, cx, cy, r, c):
    for y in range(-r, r+1):
        for x in range(-r, r+1):
            if x*x + y*y <= r*r:
                set_px(px, cx+x, cy+y, c)


# ─── Shared palette ───
SKIN       = hex_to_rgba('#E8B88A')
SKIN_DARK  = darken(SKIN, 0.8)
SKIN_LIGHT = lighten(SKIN, 1.15)
EYE        = hex_to_rgba('#222222')
HAIR_GREY  = hex_to_rgba('#AAAAAA')
HAIR_BROWN = hex_to_rgba('#5C3A1E')
BLACK      = hex_to_rgba('#111111')
WHITE      = hex_to_rgba('#F0F0F0')
SHOE_BROWN = hex_to_rgba('#4A3020')


# ─── QUEST GIVER ───
# Robed elder/sage with pointed hat, holding a scroll. Burgundy/brown warm tones.
def gen_quest_giver():
    px = new_canvas()

    # Palette
    robe       = hex_to_rgba('#7B2D3B')   # burgundy
    robe_dark  = darken(robe, 0.7)
    robe_light = lighten(robe, 1.25)
    hat        = hex_to_rgba('#5A1A28')   # dark burgundy hat
    hat_light  = lighten(hat, 1.3)
    belt       = hex_to_rgba('#C8A84E')   # gold belt/sash
    scroll_bg  = hex_to_rgba('#F5DEB3')   # parchment
    scroll_dk  = darken(scroll_bg, 0.75)
    staff      = hex_to_rgba('#6B4226')   # wooden staff
    staff_lt   = lighten(staff, 1.3)
    beard      = hex_to_rgba('#C0C0C0')
    beard_dk   = darken(beard, 0.75)

    # --- Pointed hat ---
    # Tip (rows 1-2)
    set_px(px, 15, 1, hat_light)
    set_px(px, 16, 1, hat_light)
    fill_rect(px, 14, 2, 4, 1, hat)
    # Middle cone (rows 3-4)
    fill_rect(px, 13, 3, 6, 1, hat)
    fill_rect(px, 12, 4, 8, 1, hat)
    # Brim (row 5)
    fill_rect(px, 11, 5, 10, 1, hat)
    fill_rect(px, 10, 6, 12, 1, hat_light)
    # Hat shading - left highlight
    set_px(px, 13, 3, hat_light)
    set_px(px, 12, 4, hat_light)

    # --- Head / Face ---
    # Face block (rows 7-10)
    fill_rect(px, 13, 7, 6, 4, SKIN)
    # Forehead highlight
    fill_rect(px, 14, 7, 4, 1, SKIN_LIGHT)
    # Cheek shading
    set_px(px, 13, 9, SKIN_DARK)
    set_px(px, 18, 9, SKIN_DARK)
    # Eyes (row 8) - friendly, slightly wide
    set_px(px, 14, 8, EYE)
    set_px(px, 17, 8, EYE)
    # Small friendly smile (row 10)
    set_px(px, 15, 10, SKIN_DARK)
    set_px(px, 16, 10, SKIN_DARK)
    # Nose hint
    set_px(px, 16, 9, SKIN_DARK)

    # --- Beard ---
    # Flowing white/grey beard
    fill_rect(px, 13, 11, 6, 2, beard)
    fill_rect(px, 14, 13, 4, 2, beard)
    fill_rect(px, 15, 15, 2, 1, beard_dk)
    # Beard shading
    set_px(px, 13, 12, beard_dk)
    set_px(px, 18, 12, beard_dk)

    # --- Body / Robe ---
    # Shoulders (row 11-12, wider than head)
    fill_rect(px, 10, 11, 3, 2, robe)
    fill_rect(px, 19, 11, 3, 2, robe)
    # Main robe body (rows 13-26)
    fill_rect(px, 10, 13, 12, 14, robe)
    # Robe flares out at bottom
    fill_rect(px, 9, 24, 14, 3, robe)
    fill_rect(px, 8, 26, 16, 2, robe)
    # Left side highlight (light source from left)
    fill_rect(px, 10, 13, 2, 14, robe_light)
    fill_rect(px, 9, 24, 2, 4, robe_light)
    # Right side shadow
    fill_rect(px, 20, 13, 2, 11, robe_dark)
    fill_rect(px, 21, 24, 2, 4, robe_dark)
    # Center fold line
    for y in range(15, 27):
        set_px(px, 16, y, robe_dark)
    # Robe bottom hem shadow
    fill_rect(px, 8, 27, 16, 1, robe_dark)

    # --- Gold belt/sash ---
    fill_rect(px, 10, 16, 12, 1, belt)
    fill_rect(px, 10, 17, 12, 1, darken(belt, 0.8))

    # --- Left arm holding staff ---
    # Arm extends left from shoulder
    fill_rect(px, 7, 13, 3, 2, robe)
    fill_rect(px, 6, 14, 2, 2, robe_light)
    # Hand on staff
    fill_rect(px, 6, 16, 2, 2, SKIN)
    set_px(px, 6, 16, SKIN_DARK)

    # --- Staff ---
    fill_rect(px, 6, 3, 2, 13, staff)
    fill_rect(px, 6, 3, 1, 13, staff_lt)
    # Staff top orb/knob
    fill_rect(px, 5, 1, 4, 3, hex_to_rgba('#FFD700'))
    fill_rect(px, 6, 0, 2, 1, hex_to_rgba('#FFEE88'))
    set_px(px, 5, 1, hex_to_rgba('#DAA520'))

    # --- Right arm holding scroll ---
    fill_rect(px, 22, 13, 3, 2, robe)
    fill_rect(px, 23, 14, 2, 2, robe_dark)
    # Hand
    fill_rect(px, 23, 16, 2, 2, SKIN)
    set_px(px, 24, 17, SKIN_DARK)

    # --- Scroll in right hand ---
    fill_rect(px, 23, 18, 4, 6, scroll_bg)
    fill_rect(px, 23, 18, 4, 1, scroll_dk)
    fill_rect(px, 23, 23, 4, 1, scroll_dk)
    # Scroll rolled ends
    fill_rect(px, 22, 18, 1, 6, scroll_dk)
    fill_rect(px, 27, 18, 1, 6, scroll_dk)
    # Text lines on scroll
    fill_rect(px, 24, 20, 2, 1, hex_to_rgba('#666666', 160))
    fill_rect(px, 24, 22, 2, 1, hex_to_rgba('#666666', 160))

    # --- Feet (peeking below robe) ---
    fill_rect(px, 11, 28, 4, 2, SHOE_BROWN)
    fill_rect(px, 17, 28, 4, 2, SHOE_BROWN)
    fill_rect(px, 11, 28, 4, 1, lighten(SHOE_BROWN, 1.2))
    fill_rect(px, 17, 28, 4, 1, lighten(SHOE_BROWN, 1.2))

    return px


# ─── VENDOR ───
# Round/stocky merchant with apron, satchel, friendly mercantile look.
def gen_vendor():
    px = new_canvas()

    # Palette
    shirt      = hex_to_rgba('#C2955A')   # tan/khaki shirt
    shirt_dk   = darken(shirt, 0.75)
    shirt_lt   = lighten(shirt, 1.2)
    apron      = hex_to_rgba('#E8DCC8')   # off-white apron
    apron_dk   = darken(apron, 0.8)
    pants      = hex_to_rgba('#6B4226')   # brown pants
    pants_dk   = darken(pants, 0.7)
    pants_lt   = lighten(pants, 1.2)
    satchel    = hex_to_rgba('#8B5E3C')   # leather satchel
    satchel_dk = darken(satchel, 0.7)
    satchel_lt = lighten(satchel, 1.3)
    belt_col   = hex_to_rgba('#5A3A1A')
    hat_col    = hex_to_rgba('#8B6914')   # straw/merchant hat
    hat_lt     = lighten(hat_col, 1.3)

    # --- Hat (flat merchant cap) ---
    fill_rect(px, 12, 3, 8, 2, hat_col)
    fill_rect(px, 10, 5, 12, 1, hat_col)
    fill_rect(px, 10, 5, 12, 1, hat_lt)
    # Hat top highlight
    fill_rect(px, 13, 3, 6, 1, hat_lt)

    # --- Head / Face ---
    # Rounder face for stocky look (wider)
    fill_rect(px, 12, 6, 8, 5, SKIN)
    # Forehead highlight
    fill_rect(px, 13, 6, 6, 1, SKIN_LIGHT)
    # Cheeks (rosy, friendly)
    set_px(px, 12, 8, hex_to_rgba('#D4937A'))
    set_px(px, 19, 8, hex_to_rgba('#D4937A'))
    # Eyes - friendly, slightly squinted (happy)
    set_px(px, 14, 8, EYE)
    set_px(px, 17, 8, EYE)
    # Eyebrows (raised, friendly)
    set_px(px, 14, 7, HAIR_BROWN)
    set_px(px, 17, 7, HAIR_BROWN)
    # Nose
    set_px(px, 15, 9, SKIN_DARK)
    set_px(px, 16, 9, SKIN_DARK)
    # Friendly smile (wider)
    set_px(px, 14, 10, SKIN_DARK)
    set_px(px, 15, 10, SKIN_DARK)
    set_px(px, 16, 10, SKIN_DARK)
    set_px(px, 17, 10, SKIN_DARK)
    # Chin shadow
    fill_rect(px, 13, 10, 6, 1, SKIN_DARK)

    # --- Body (stocky/round) ---
    # Neck
    fill_rect(px, 14, 11, 4, 1, SKIN)

    # Shoulders and torso (wider for stocky build)
    fill_rect(px, 9, 12, 14, 10, shirt)
    # Extra width for round belly
    fill_rect(px, 8, 14, 16, 6, shirt)
    # Left highlight
    fill_rect(px, 9, 12, 2, 10, shirt_lt)
    fill_rect(px, 8, 14, 1, 6, shirt_lt)
    # Right shadow
    fill_rect(px, 21, 12, 2, 10, shirt_dk)
    fill_rect(px, 23, 14, 1, 6, shirt_dk)

    # --- Apron (over shirt, front) ---
    fill_rect(px, 11, 13, 10, 9, apron)
    # Apron neck strap
    fill_rect(px, 14, 11, 1, 2, apron_dk)
    fill_rect(px, 17, 11, 1, 2, apron_dk)
    # Apron pocket
    fill_rect(px, 13, 17, 6, 3, apron_dk)
    fill_rect(px, 13, 17, 6, 1, darken(apron_dk, 0.85))
    # Gold coins peeking from pocket
    set_px(px, 14, 18, hex_to_rgba('#FFD700'))
    set_px(px, 15, 18, hex_to_rgba('#DAA520'))
    set_px(px, 17, 18, hex_to_rgba('#FFD700'))
    # Apron strings at sides
    set_px(px, 11, 15, apron_dk)
    set_px(px, 20, 15, apron_dk)

    # --- Belt ---
    fill_rect(px, 8, 21, 16, 1, belt_col)
    # Belt buckle
    set_px(px, 15, 21, hex_to_rgba('#C8A84E'))
    set_px(px, 16, 21, hex_to_rgba('#C8A84E'))

    # --- Arms ---
    # Left arm
    fill_rect(px, 6, 12, 3, 8, shirt)
    fill_rect(px, 6, 12, 1, 8, shirt_lt)
    # Left hand
    fill_rect(px, 6, 20, 3, 2, SKIN)
    set_px(px, 6, 21, SKIN_DARK)

    # Right arm (holding satchel strap)
    fill_rect(px, 23, 12, 3, 8, shirt)
    fill_rect(px, 25, 12, 1, 8, shirt_dk)
    # Right hand
    fill_rect(px, 23, 20, 3, 2, SKIN)
    set_px(px, 25, 21, SKIN_DARK)

    # --- Satchel (on right hip) ---
    fill_rect(px, 23, 15, 5, 7, satchel)
    fill_rect(px, 23, 15, 5, 1, satchel_lt)
    fill_rect(px, 23, 21, 5, 1, satchel_dk)
    # Satchel flap
    fill_rect(px, 23, 15, 5, 2, satchel_lt)
    fill_rect(px, 23, 16, 5, 1, satchel_dk)
    # Satchel buckle
    set_px(px, 25, 17, hex_to_rgba('#C8A84E'))
    # Satchel strap going up to shoulder
    fill_rect(px, 23, 12, 1, 3, satchel_dk)

    # --- Pants ---
    fill_rect(px, 9, 22, 14, 5, pants)
    fill_rect(px, 8, 22, 1, 5, pants_lt)
    # Leg separation
    fill_rect(px, 15, 23, 2, 4, pants_dk)
    # Left leg highlight
    fill_rect(px, 9, 22, 2, 5, pants_lt)
    # Right leg shadow
    fill_rect(px, 21, 22, 2, 5, pants_dk)

    # --- Feet/Boots ---
    fill_rect(px, 9, 27, 5, 3, SHOE_BROWN)
    fill_rect(px, 18, 27, 5, 3, SHOE_BROWN)
    fill_rect(px, 9, 27, 5, 1, lighten(SHOE_BROWN, 1.3))
    fill_rect(px, 18, 27, 5, 1, lighten(SHOE_BROWN, 1.3))

    # --- Small goods display (in left hand) ---
    # A small pouch/bag of wares
    fill_rect(px, 3, 18, 4, 4, hex_to_rgba('#A67C52'))
    fill_rect(px, 3, 18, 4, 1, lighten(hex_to_rgba('#A67C52'), 1.3))
    # Item peeking out of bag (red apple or potion)
    set_px(px, 4, 17, hex_to_rgba('#CC3333'))
    set_px(px, 5, 17, hex_to_rgba('#CC3333'))
    set_px(px, 4, 16, hex_to_rgba('#EE4444'))

    return px


# ─── GUARD ───
# Armored soldier with shield, helmet. Steel blue/grey armor. Upright posture.
def gen_guard():
    px = new_canvas()

    # Palette
    armor      = hex_to_rgba('#7088A0')   # steel blue
    armor_dk   = darken(armor, 0.7)
    armor_lt   = lighten(armor, 1.3)
    helmet     = hex_to_rgba('#6078A0')   # slightly darker blue steel
    helmet_lt  = lighten(helmet, 1.4)
    helmet_dk  = darken(helmet, 0.65)
    chainmail  = hex_to_rgba('#909090')
    chain_dk   = darken(chainmail, 0.75)
    shield_col = hex_to_rgba('#4A6080')   # blue shield
    shield_lt  = lighten(shield_col, 1.4)
    shield_dk  = darken(shield_col, 0.6)
    emblem     = hex_to_rgba('#FFD700')   # gold emblem on shield
    pants_col  = hex_to_rgba('#505868')   # dark grey-blue pants
    pants_dk   = darken(pants_col, 0.7)
    boots_col  = hex_to_rgba('#3A3A3A')
    cape_col   = hex_to_rgba('#2A4060')   # dark blue cape hint
    spear      = hex_to_rgba('#888888')   # weapon metal
    wood       = hex_to_rgba('#6B4226')

    # --- Helmet ---
    # Helmet dome (rows 2-5)
    fill_rect(px, 12, 2, 8, 4, helmet)
    fill_rect(px, 11, 4, 10, 2, helmet)
    # Helmet top ridge
    fill_rect(px, 15, 1, 2, 1, helmet_lt)
    fill_rect(px, 14, 2, 4, 1, helmet_lt)
    # Helmet cheek guards
    fill_rect(px, 11, 6, 2, 3, helmet_dk)
    fill_rect(px, 19, 6, 2, 3, helmet_dk)
    # Helmet visor slit / face opening
    fill_rect(px, 13, 6, 6, 3, SKIN)
    # Nose guard
    set_px(px, 16, 6, helmet_dk)
    set_px(px, 16, 7, helmet_dk)
    # Forehead highlight
    fill_rect(px, 13, 6, 3, 1, SKIN_LIGHT)

    # --- Face (visible through helmet) ---
    # Eyes
    set_px(px, 14, 7, EYE)
    set_px(px, 17, 7, EYE)
    # Stern mouth
    set_px(px, 15, 8, SKIN_DARK)
    set_px(px, 16, 8, SKIN_DARK)
    # Chin area
    fill_rect(px, 13, 9, 6, 1, SKIN)

    # --- Neck / gorget ---
    fill_rect(px, 13, 9, 6, 2, chainmail)
    fill_rect(px, 14, 9, 4, 1, chain_dk)

    # --- Shoulders (pauldrons) ---
    fill_rect(px, 8, 10, 5, 3, armor)
    fill_rect(px, 19, 10, 5, 3, armor)
    fill_rect(px, 8, 10, 5, 1, armor_lt)
    fill_rect(px, 19, 10, 5, 1, armor_lt)
    # Pauldron bottom edge
    fill_rect(px, 8, 12, 5, 1, armor_dk)
    fill_rect(px, 19, 12, 5, 1, armor_dk)

    # --- Torso (breastplate) ---
    fill_rect(px, 11, 11, 10, 9, armor)
    # Chest plate center ridge
    fill_rect(px, 15, 11, 2, 9, armor_lt)
    # Left highlight
    fill_rect(px, 11, 11, 2, 9, armor_lt)
    # Right shadow
    fill_rect(px, 19, 11, 2, 9, armor_dk)
    # Chest emblem / crest
    fill_rect(px, 14, 13, 4, 3, emblem)
    set_px(px, 15, 14, darken(emblem, 0.7))
    set_px(px, 16, 14, darken(emblem, 0.7))

    # --- Belt ---
    fill_rect(px, 11, 20, 10, 1, hex_to_rgba('#4A3A2A'))
    set_px(px, 15, 20, emblem)
    set_px(px, 16, 20, emblem)

    # --- Arms ---
    # Left arm (holding spear)
    fill_rect(px, 7, 13, 3, 7, armor)
    fill_rect(px, 7, 13, 1, 7, armor_lt)
    fill_rect(px, 9, 13, 1, 7, armor_dk)
    # Left gauntlet
    fill_rect(px, 7, 20, 3, 2, armor_dk)
    fill_rect(px, 7, 20, 3, 1, armor)
    # Left hand
    fill_rect(px, 7, 22, 2, 1, SKIN)

    # Right arm (shield arm)
    fill_rect(px, 22, 13, 3, 7, armor)
    fill_rect(px, 22, 13, 1, 7, armor_dk)
    fill_rect(px, 24, 13, 1, 7, armor_lt)
    # Right gauntlet
    fill_rect(px, 22, 20, 3, 2, armor_dk)
    fill_rect(px, 22, 20, 3, 1, armor)

    # --- Spear (in left hand) ---
    fill_rect(px, 7, 1, 2, 21, wood)
    fill_rect(px, 7, 1, 1, 21, lighten(wood, 1.2))
    # Spear tip
    fill_rect(px, 7, 0, 2, 2, spear)
    set_px(px, 7, 0, lighten(spear, 1.5))

    # --- Shield (on right side) ---
    fill_rect(px, 24, 12, 6, 11, shield_col)
    # Shield border
    fill_rect(px, 24, 12, 6, 1, shield_lt)
    fill_rect(px, 24, 22, 6, 1, shield_dk)
    fill_rect(px, 24, 12, 1, 11, shield_lt)
    fill_rect(px, 29, 12, 1, 11, shield_dk)
    # Shield rounded bottom
    fill_rect(px, 25, 23, 4, 1, shield_col)
    fill_rect(px, 26, 24, 2, 1, shield_dk)
    # Shield emblem (cross)
    fill_rect(px, 26, 14, 2, 6, emblem)
    fill_rect(px, 25, 16, 4, 2, emblem)
    # Shield boss
    set_px(px, 27, 17, lighten(emblem, 1.3))

    # --- Pants / leg armor ---
    fill_rect(px, 11, 21, 10, 5, pants_col)
    # Leg separation
    fill_rect(px, 15, 22, 2, 4, pants_dk)
    # Knee guards
    fill_rect(px, 11, 23, 4, 1, armor_dk)
    fill_rect(px, 17, 23, 4, 1, armor_dk)

    # --- Boots (armored) ---
    fill_rect(px, 10, 26, 5, 4, boots_col)
    fill_rect(px, 17, 26, 5, 4, boots_col)
    fill_rect(px, 10, 26, 5, 1, lighten(boots_col, 1.4))
    fill_rect(px, 17, 26, 5, 1, lighten(boots_col, 1.4))
    # Boot tops (metal trim)
    fill_rect(px, 10, 26, 5, 1, armor_dk)
    fill_rect(px, 17, 26, 5, 1, armor_dk)

    # --- Cape hint (behind, visible at edges) ---
    fill_rect(px, 10, 11, 1, 10, cape_col)
    fill_rect(px, 21, 11, 1, 10, cape_col)

    return px


# ─── CITIZEN ───
# Simple townsperson. Plain brown/green clothing. Shorter, no special equipment.
def gen_citizen():
    px = new_canvas()

    # Palette
    shirt      = hex_to_rgba('#7A9B5A')   # muted green tunic
    shirt_dk   = darken(shirt, 0.7)
    shirt_lt   = lighten(shirt, 1.25)
    vest       = hex_to_rgba('#6B5030')   # brown vest over shirt
    vest_dk    = darken(vest, 0.7)
    vest_lt    = lighten(vest, 1.3)
    pants_col  = hex_to_rgba('#8B7355')   # tan/brown pants
    pants_dk   = darken(pants_col, 0.7)
    pants_lt   = lighten(pants_col, 1.2)
    hair       = hex_to_rgba('#7A5530')   # medium brown hair
    hair_dk    = darken(hair, 0.7)
    shoe_col   = hex_to_rgba('#5A4030')

    # Citizen is slightly shorter - body starts a bit lower, offset down 2px

    # --- Hair ---
    fill_rect(px, 12, 5, 8, 2, hair)
    fill_rect(px, 11, 6, 10, 2, hair)
    # Hair highlight
    fill_rect(px, 13, 5, 4, 1, lighten(hair, 1.3))
    # Side hair
    set_px(px, 11, 8, hair)
    set_px(px, 20, 8, hair)
    set_px(px, 11, 9, hair_dk)
    set_px(px, 20, 9, hair_dk)

    # --- Head / Face ---
    fill_rect(px, 12, 7, 8, 5, SKIN)
    # Forehead highlight
    fill_rect(px, 13, 7, 6, 1, SKIN_LIGHT)
    # Cheeks
    set_px(px, 12, 9, SKIN_DARK)
    set_px(px, 19, 9, SKIN_DARK)
    # Eyes - simple, friendly
    set_px(px, 14, 9, EYE)
    set_px(px, 17, 9, EYE)
    # Eyebrows
    set_px(px, 14, 8, darken(hair, 0.5))
    set_px(px, 17, 8, darken(hair, 0.5))
    # Nose
    set_px(px, 15, 10, SKIN_DARK)
    # Friendly smile
    set_px(px, 14, 11, SKIN_DARK)
    set_px(px, 15, 11, SKIN_DARK)
    set_px(px, 16, 11, SKIN_DARK)
    set_px(px, 17, 11, SKIN_DARK)

    # --- Neck ---
    fill_rect(px, 14, 12, 4, 1, SKIN)

    # --- Body / Tunic ---
    # Shoulders
    fill_rect(px, 10, 13, 12, 2, shirt)
    # Main tunic body
    fill_rect(px, 10, 15, 12, 8, shirt)
    # Left highlight
    fill_rect(px, 10, 13, 2, 10, shirt_lt)
    # Right shadow
    fill_rect(px, 20, 13, 2, 10, shirt_dk)
    # Center fold
    for y in range(15, 23):
        set_px(px, 16, y, shirt_dk)

    # --- Brown vest over tunic ---
    fill_rect(px, 11, 13, 3, 9, vest)
    fill_rect(px, 18, 13, 3, 9, vest)
    fill_rect(px, 11, 13, 1, 9, vest_lt)
    fill_rect(px, 20, 13, 1, 9, vest_dk)
    # Vest bottom
    fill_rect(px, 11, 21, 3, 1, vest_dk)
    fill_rect(px, 18, 21, 3, 1, vest_dk)
    # Vest buttons (center line)
    set_px(px, 14, 14, hex_to_rgba('#C8A84E'))
    set_px(px, 14, 16, hex_to_rgba('#C8A84E'))
    set_px(px, 14, 18, hex_to_rgba('#C8A84E'))

    # --- Belt ---
    fill_rect(px, 10, 22, 12, 1, hex_to_rgba('#5A3A1A'))
    set_px(px, 16, 22, hex_to_rgba('#AA8844'))

    # --- Arms ---
    # Left arm
    fill_rect(px, 7, 13, 3, 8, shirt)
    fill_rect(px, 7, 13, 1, 8, shirt_lt)
    # Rolled-up sleeve appearance
    fill_rect(px, 7, 13, 3, 1, shirt_dk)
    # Left hand
    fill_rect(px, 7, 21, 3, 2, SKIN)
    set_px(px, 7, 22, SKIN_DARK)

    # Right arm
    fill_rect(px, 22, 13, 3, 8, shirt)
    fill_rect(px, 24, 13, 1, 8, shirt_dk)
    # Rolled-up sleeve
    fill_rect(px, 22, 13, 3, 1, shirt_dk)
    # Right hand
    fill_rect(px, 22, 21, 3, 2, SKIN)
    set_px(px, 24, 22, SKIN_DARK)

    # --- Pants ---
    fill_rect(px, 10, 23, 12, 5, pants_col)
    # Leg separation
    fill_rect(px, 15, 24, 2, 4, pants_dk)
    # Left leg highlight
    fill_rect(px, 10, 23, 2, 5, pants_lt)
    # Right leg shadow
    fill_rect(px, 20, 23, 2, 5, pants_dk)
    # Knee patches (worn clothing detail)
    fill_rect(px, 11, 25, 3, 2, darken(pants_col, 0.85))
    fill_rect(px, 18, 25, 3, 2, darken(pants_col, 0.85))

    # --- Shoes (simple leather) ---
    fill_rect(px, 10, 28, 4, 2, shoe_col)
    fill_rect(px, 18, 28, 4, 2, shoe_col)
    fill_rect(px, 10, 28, 4, 1, lighten(shoe_col, 1.3))
    fill_rect(px, 18, 28, 4, 1, lighten(shoe_col, 1.3))

    return px


GENERATORS = {
    'quest_giver': gen_quest_giver,
    'vendor': gen_vendor,
    'guard': gen_guard,
    'citizen': gen_citizen,
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
    print(f'Generated {len(GENERATORS)} NPC sprites in {os.path.abspath(OUT_DIR)}')

if __name__ == '__main__':
    main()
