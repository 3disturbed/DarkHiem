#!/usr/bin/env python3
"""Generate 64x64 resource node sprites using pycairo. Transparent backgrounds."""

import cairo
import os
import math
import random

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tileArt', 'resources')
SIZE = 64
CX = SIZE / 2
CY = SIZE / 2


def make_ctx():
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, SIZE, SIZE)
    ctx = cairo.Context(surface)
    ctx.set_antialias(cairo.ANTIALIAS_DEFAULT)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    return surface, ctx


def hex_to_rgb(h):
    """Convert '#RRGGBB' to (r, g, b) floats 0-1."""
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4))


def darken(r, g, b, f=0.7):
    return r * f, g * f, b * f


def lighten(r, g, b, f=0.3):
    return r + (1 - r) * f, g + (1 - g) * f, b + (1 - b) * f


def seed_rng(name):
    """Seed random from resource name for deterministic output."""
    random.seed(hash(name) & 0xFFFFFFFF)


# ── Shared drawing helpers ─────────────────────────────────────────────

def draw_irregular_rock(ctx, cx, cy, radius, points=8, jitter=0.25):
    """Draw an irregular rock polygon around (cx, cy)."""
    angles = []
    for i in range(points):
        a = (i / points) * 2 * math.pi - math.pi / 2
        a += (random.random() - 0.5) * 0.3
        angles.append(a)
    angles.sort()

    verts = []
    for a in angles:
        r = radius * (1 + (random.random() - 0.5) * jitter * 2)
        verts.append((cx + r * math.cos(a), cy + r * math.sin(a)))

    ctx.move_to(*verts[0])
    for v in verts[1:]:
        ctx.line_to(*v)
    ctx.close_path()
    return verts


def draw_ore_veins(ctx, cx, cy, radius, ore_color, num_veins=3):
    """Draw colored ore vein streaks inside a rock shape."""
    r, g, b = ore_color
    for _ in range(num_veins):
        angle = random.random() * 2 * math.pi
        dist = random.random() * radius * 0.6
        sx = cx + dist * math.cos(angle)
        sy = cy + dist * math.sin(angle)
        length = radius * (0.3 + random.random() * 0.4)
        end_angle = angle + (random.random() - 0.5) * 1.2
        ex = sx + length * math.cos(end_angle)
        ey = sy + length * math.sin(end_angle)

        ctx.set_source_rgba(r, g, b, 0.7 + random.random() * 0.3)
        ctx.set_line_width(2 + random.random() * 2)
        ctx.move_to(sx, sy)
        mid_x = (sx + ex) / 2 + (random.random() - 0.5) * 8
        mid_y = (sy + ey) / 2 + (random.random() - 0.5) * 8
        ctx.curve_to(mid_x, mid_y, mid_x, mid_y, ex, ey)
        ctx.stroke()


def draw_rock_highlights(ctx, cx, cy, radius):
    """Add subtle highlight and shadow to give rock depth."""
    # Top-left highlight
    grad = cairo.RadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0,
                                 cx, cy, radius)
    grad.add_color_stop_rgba(0, 1, 1, 1, 0.15)
    grad.add_color_stop_rgba(0.5, 1, 1, 1, 0.0)
    grad.add_color_stop_rgba(1, 0, 0, 0, 0.1)
    ctx.set_source(grad)
    ctx.arc(cx, cy, radius, 0, 2 * math.pi)
    ctx.fill()


def draw_cave_overlay(ctx):
    """Darken the sprite and add subtle stalactite hints at top."""
    # Overall darkening
    ctx.set_source_rgba(0, 0, 0, 0.25)
    ctx.rectangle(0, 0, SIZE, SIZE)
    ctx.fill()

    # Stalactite-like shadows at top
    ctx.set_source_rgba(0.1, 0.1, 0.15, 0.3)
    for i in range(3):
        x = 12 + i * 18 + random.random() * 6
        w = 4 + random.random() * 4
        h = 6 + random.random() * 6
        ctx.move_to(x, 0)
        ctx.line_to(x + w, 0)
        ctx.line_to(x + w / 2, h)
        ctx.close_path()
        ctx.fill()


# ── Tree generators ────────────────────────────────────────────────────

def gen_wood_oak():
    """Oak tree — round leafy canopy, warm brown trunk."""
    seed_rng('wood_oak')
    surface, ctx = make_ctx()

    # Trunk
    ctx.set_source_rgb(0.35, 0.24, 0.10)
    ctx.rectangle(CX - 4, 36, 8, 24)
    ctx.fill()
    # Trunk highlights
    ctx.set_source_rgba(0.45, 0.32, 0.16, 0.5)
    ctx.rectangle(CX - 2, 36, 3, 24)
    ctx.fill()

    # Canopy shadow
    ctx.set_source_rgba(0.15, 0.3, 0.08, 0.8)
    ctx.arc(CX + 1, 30, 22, 0, 2 * math.pi)
    ctx.fill()

    # Main canopy
    ctx.set_source_rgb(0.28, 0.48, 0.18)
    ctx.arc(CX, 28, 21, 0, 2 * math.pi)
    ctx.fill()

    # Canopy highlights
    for _ in range(6):
        hx = CX + (random.random() - 0.5) * 28
        hy = 28 + (random.random() - 0.5) * 28
        hr = 4 + random.random() * 6
        ctx.set_source_rgba(0.35, 0.58, 0.22, 0.5)
        ctx.arc(hx, hy, hr, 0, 2 * math.pi)
        ctx.fill()

    # Top highlight
    grad = cairo.RadialGradient(CX - 6, 18, 2, CX, 28, 20)
    grad.add_color_stop_rgba(0, 0.5, 0.7, 0.3, 0.3)
    grad.add_color_stop_rgba(1, 0, 0, 0, 0)
    ctx.set_source(grad)
    ctx.arc(CX, 28, 21, 0, 2 * math.pi)
    ctx.fill()

    # Outline
    ctx.set_source_rgba(0.12, 0.22, 0.06, 0.6)
    ctx.set_line_width(1.5)
    ctx.arc(CX, 28, 21, 0, 2 * math.pi)
    ctx.stroke()

    return surface


def gen_wood_pine():
    """Pine tree — triangular conical canopy, dark green."""
    seed_rng('wood_pine')
    surface, ctx = make_ctx()

    # Trunk
    ctx.set_source_rgb(0.30, 0.20, 0.10)
    ctx.rectangle(CX - 3, 44, 6, 18)
    ctx.fill()

    # Three layered triangle sections
    layers = [(CX, 12, 22, 20), (CX, 24, 20, 18), (CX, 34, 18, 16)]
    for lx, ly, h, w in layers:
        # Shadow
        ctx.set_source_rgba(0.08, 0.2, 0.04, 0.7)
        ctx.move_to(lx + 1, ly + h + 1)
        ctx.line_to(lx - w / 2 + 1, ly + h + 1)
        ctx.line_to(lx + 1, ly + 1)
        ctx.line_to(lx + w / 2 + 1, ly + h + 1)
        ctx.close_path()
        ctx.fill()

        # Main triangle
        ctx.set_source_rgb(0.18, 0.29, 0.10)
        ctx.move_to(lx, ly + h)
        ctx.line_to(lx - w / 2, ly + h)
        ctx.line_to(lx, ly)
        ctx.line_to(lx + w / 2, ly + h)
        ctx.close_path()
        ctx.fill()

        # Lighter left side
        ctx.set_source_rgba(0.25, 0.38, 0.14, 0.4)
        ctx.move_to(lx, ly)
        ctx.line_to(lx - w / 4, ly + h * 0.7)
        ctx.line_to(lx, ly + h * 0.5)
        ctx.close_path()
        ctx.fill()

    return surface


def gen_wood_dark_oak():
    """Dark oak — wide sprawling dark canopy, thick trunk."""
    seed_rng('wood_dark_oak')
    surface, ctx = make_ctx()

    # Thick trunk
    ctx.set_source_rgb(0.15, 0.12, 0.06)
    ctx.rectangle(CX - 5, 34, 10, 26)
    ctx.fill()
    # Roots
    ctx.set_line_width(3)
    ctx.set_source_rgb(0.12, 0.10, 0.05)
    ctx.move_to(CX - 5, 56)
    ctx.line_to(CX - 12, 62)
    ctx.stroke()
    ctx.move_to(CX + 5, 56)
    ctx.line_to(CX + 12, 62)
    ctx.stroke()

    # Wide dark canopy
    ctx.set_source_rgb(0.10, 0.10, 0.03)
    ctx.save()
    ctx.translate(CX, 26)
    ctx.scale(1.3, 1.0)
    ctx.arc(0, 0, 22, 0, 2 * math.pi)
    ctx.restore()
    ctx.fill()

    # Canopy depth
    for _ in range(5):
        hx = CX + (random.random() - 0.5) * 36
        hy = 26 + (random.random() - 0.5) * 26
        hr = 3 + random.random() * 5
        ctx.set_source_rgba(0.15, 0.18, 0.05, 0.4)
        ctx.arc(hx, hy, hr, 0, 2 * math.pi)
        ctx.fill()

    # Outline
    ctx.set_source_rgba(0.05, 0.05, 0.02, 0.7)
    ctx.set_line_width(1.5)
    ctx.save()
    ctx.translate(CX, 26)
    ctx.scale(1.3, 1.0)
    ctx.arc(0, 0, 22, 0, 2 * math.pi)
    ctx.restore()
    ctx.stroke()

    return surface


def gen_ancient_tree():
    """Ancient tree — massive gnarled trunk, dark brown-green canopy."""
    seed_rng('ancient_tree')
    surface, ctx = make_ctx()

    # Gnarled trunk
    ctx.set_source_rgb(0.24, 0.18, 0.12)
    ctx.move_to(CX - 8, 62)
    ctx.curve_to(CX - 10, 48, CX - 6, 38, CX - 4, 32)
    ctx.line_to(CX + 4, 32)
    ctx.curve_to(CX + 6, 38, CX + 10, 48, CX + 8, 62)
    ctx.close_path()
    ctx.fill()

    # Trunk texture
    ctx.set_source_rgba(0.18, 0.12, 0.06, 0.4)
    ctx.set_line_width(1)
    for i in range(4):
        y = 36 + i * 7
        ctx.move_to(CX - 7 + i, y)
        ctx.curve_to(CX - 2, y + 2, CX + 2, y - 1, CX + 7 - i, y + 1)
        ctx.stroke()

    # Massive canopy
    ctx.set_source_rgb(0.18, 0.24, 0.10)
    ctx.save()
    ctx.translate(CX, 22)
    ctx.scale(1.4, 1.0)
    ctx.arc(0, 0, 22, 0, 2 * math.pi)
    ctx.restore()
    ctx.fill()

    # Moss/lichen highlights
    for _ in range(8):
        hx = CX + (random.random() - 0.5) * 40
        hy = 22 + (random.random() - 0.5) * 28
        hr = 3 + random.random() * 5
        ctx.set_source_rgba(0.22, 0.35, 0.12, 0.4)
        ctx.arc(hx, hy, hr, 0, 2 * math.pi)
        ctx.fill()

    # Subtle glow
    grad = cairo.RadialGradient(CX, 22, 0, CX, 22, 28)
    grad.add_color_stop_rgba(0, 0.3, 0.4, 0.1, 0.1)
    grad.add_color_stop_rgba(1, 0, 0, 0, 0)
    ctx.set_source(grad)
    ctx.rectangle(0, 0, SIZE, SIZE)
    ctx.fill()

    return surface


def gen_frost_pine():
    """Frost pine — pine shape with blue-white frost tint."""
    seed_rng('frost_pine')
    surface, ctx = make_ctx()

    # Trunk
    ctx.set_source_rgb(0.28, 0.30, 0.32)
    ctx.rectangle(CX - 3, 44, 6, 18)
    ctx.fill()

    # Layered triangles with frost tint
    layers = [(CX, 10, 22, 22), (CX, 22, 20, 20), (CX, 32, 18, 18)]
    for lx, ly, h, w in layers:
        ctx.set_source_rgb(0.29, 0.42, 0.48)
        ctx.move_to(lx, ly + h)
        ctx.line_to(lx - w / 2, ly + h)
        ctx.line_to(lx, ly)
        ctx.line_to(lx + w / 2, ly + h)
        ctx.close_path()
        ctx.fill()

    # Frost/snow patches
    ctx.set_source_rgba(0.85, 0.92, 0.95, 0.5)
    for _ in range(8):
        fx = CX + (random.random() - 0.5) * 24
        fy = 14 + random.random() * 30
        fr = 2 + random.random() * 3
        ctx.arc(fx, fy, fr, 0, 2 * math.pi)
        ctx.fill()

    # Ice crystal accents
    ctx.set_source_rgba(0.7, 0.85, 0.95, 0.6)
    ctx.set_line_width(1)
    for _ in range(3):
        sx = CX + (random.random() - 0.5) * 18
        sy = 16 + random.random() * 24
        for a in range(3):
            angle = a * math.pi * 2 / 3
            ex = sx + 3 * math.cos(angle)
            ey = sy + 3 * math.sin(angle)
            ctx.move_to(sx, sy)
            ctx.line_to(ex, ey)
            ctx.stroke()

    return surface


# ── Ore/Rock generators ────────────────────────────────────────────────

def _gen_rock_base(name, rock_color, ore_color=None, num_veins=3,
                   glow_color=None, special_fn=None):
    """Shared rock node generator."""
    seed_rng(name)
    surface, ctx = make_ctx()
    rr, rg, rb = hex_to_rgb(rock_color)

    # Rock body
    ctx.set_source_rgb(rr, rg, rb)
    draw_irregular_rock(ctx, CX, CY + 4, 22)
    ctx.fill_preserve()

    # Outline
    ctx.set_source_rgba(*darken(rr, rg, rb, 0.5), 0.7)
    ctx.set_line_width(1.5)
    ctx.stroke()

    # Rock texture noise
    for _ in range(15):
        nx = CX + (random.random() - 0.5) * 32
        ny = CY + 4 + (random.random() - 0.5) * 32
        ns = 1 + random.random() * 2
        shade = (random.random() - 0.5) * 0.15
        ctx.set_source_rgba(rr + shade, rg + shade, rb + shade, 0.4)
        ctx.arc(nx, ny, ns, 0, 2 * math.pi)
        ctx.fill()

    # Ore veins
    if ore_color:
        draw_ore_veins(ctx, CX, CY + 4, 18, hex_to_rgb(ore_color), num_veins)

    # Highlights
    draw_rock_highlights(ctx, CX, CY + 4, 22)

    # Glow effect
    if glow_color:
        gr, gg, gb = hex_to_rgb(glow_color)
        grad = cairo.RadialGradient(CX, CY + 4, 4, CX, CY + 4, 28)
        grad.add_color_stop_rgba(0, gr, gg, gb, 0.3)
        grad.add_color_stop_rgba(0.5, gr, gg, gb, 0.1)
        grad.add_color_stop_rgba(1, 0, 0, 0, 0)
        ctx.set_source(grad)
        ctx.rectangle(0, 0, SIZE, SIZE)
        ctx.fill()

    # Custom overlay
    if special_fn:
        special_fn(ctx)

    return surface


def gen_stone_node():
    return _gen_rock_base('stone_node', '#888888')


def gen_copper_node():
    return _gen_rock_base('copper_node', '#777777', ore_color='#b87333', num_veins=4)


def gen_tin_node():
    return _gen_rock_base('tin_node', '#777777', ore_color='#8ca0a8', num_veins=3)


def gen_iron_deposit():
    return _gen_rock_base('iron_deposit', '#6a5a4a', ore_color='#8b4513', num_veins=5)


def gen_silver_vein():
    def silver_sparkle(ctx):
        ctx.set_source_rgba(0.95, 0.95, 1.0, 0.6)
        for _ in range(4):
            sx = CX + (random.random() - 0.5) * 24
            sy = CY + 4 + (random.random() - 0.5) * 24
            ctx.arc(sx, sy, 1.5, 0, 2 * math.pi)
            ctx.fill()
    return _gen_rock_base('silver_vein', '#808080', ore_color='#c0c0c0', num_veins=4,
                          special_fn=silver_sparkle)


def gen_obsidian_node():
    def obsidian_sheen(ctx):
        # Purple glassy reflection
        grad = cairo.LinearGradient(CX - 16, CY - 12, CX + 16, CY + 16)
        grad.add_color_stop_rgba(0, 0.3, 0.1, 0.4, 0.2)
        grad.add_color_stop_rgba(0.5, 0.1, 0.1, 0.2, 0.0)
        grad.add_color_stop_rgba(1, 0.2, 0.1, 0.35, 0.15)
        ctx.set_source(grad)
        ctx.arc(CX, CY + 4, 20, 0, 2 * math.pi)
        ctx.fill()
    return _gen_rock_base('obsidian_node', '#1a1a2e', special_fn=obsidian_sheen)


def gen_obsidian_large():
    def obsidian_sheen(ctx):
        grad = cairo.LinearGradient(CX - 20, CY - 16, CX + 20, CY + 20)
        grad.add_color_stop_rgba(0, 0.3, 0.1, 0.4, 0.2)
        grad.add_color_stop_rgba(0.5, 0.1, 0.1, 0.2, 0.0)
        grad.add_color_stop_rgba(1, 0.2, 0.1, 0.35, 0.15)
        ctx.set_source(grad)
        ctx.arc(CX, CY + 4, 24, 0, 2 * math.pi)
        ctx.fill()
    return _gen_rock_base('obsidian_large', '#1a1a2e', special_fn=obsidian_sheen)


def gen_flametal_node():
    return _gen_rock_base('flametal_node', '#4a3030', ore_color='#ff6347', num_veins=5,
                          glow_color='#ff4500')


def gen_surtling_core_node():
    def surtling_core(ctx):
        # Glowing red orb in center
        grad = cairo.RadialGradient(CX, CY + 2, 2, CX, CY + 2, 10)
        grad.add_color_stop_rgba(0, 1.0, 0.5, 0.2, 0.9)
        grad.add_color_stop_rgba(0.4, 0.9, 0.2, 0.1, 0.7)
        grad.add_color_stop_rgba(1, 0.4, 0.05, 0.0, 0.0)
        ctx.set_source(grad)
        ctx.arc(CX, CY + 2, 10, 0, 2 * math.pi)
        ctx.fill()
    return _gen_rock_base('surtling_core_node', '#3a2a2a', glow_color='#e74c3c',
                          special_fn=surtling_core)


def gen_dragon_egg():
    """Ovoid purple shape with iridescent highlights."""
    seed_rng('dragon_egg')
    surface, ctx = make_ctx()

    # Egg shape (ellipse)
    ctx.save()
    ctx.translate(CX, CY + 2)
    ctx.scale(0.75, 1.0)
    ctx.arc(0, 0, 22, 0, 2 * math.pi)
    ctx.restore()

    # Purple fill
    grad = cairo.RadialGradient(CX - 4, CY - 6, 2, CX, CY + 2, 22)
    grad.add_color_stop_rgb(0, 0.7, 0.4, 0.8)
    grad.add_color_stop_rgb(0.6, 0.5, 0.25, 0.6)
    grad.add_color_stop_rgb(1, 0.3, 0.12, 0.4)
    ctx.set_source(grad)
    ctx.fill_preserve()

    # Outline
    ctx.set_source_rgba(0.2, 0.08, 0.3, 0.8)
    ctx.set_line_width(1.5)
    ctx.stroke()

    # Iridescent bands
    ctx.set_source_rgba(0.6, 0.7, 0.9, 0.2)
    ctx.set_line_width(2)
    for i in range(3):
        y_off = -8 + i * 8
        ctx.save()
        ctx.translate(CX, CY + 2 + y_off)
        ctx.scale(0.6, 0.15)
        ctx.arc(0, 0, 22, 0, 2 * math.pi)
        ctx.restore()
        ctx.stroke()

    # Specular highlight
    ctx.set_source_rgba(1, 1, 1, 0.25)
    ctx.arc(CX - 5, CY - 6, 5, 0, 2 * math.pi)
    ctx.fill()

    # Glow
    grad = cairo.RadialGradient(CX, CY, 8, CX, CY, 30)
    grad.add_color_stop_rgba(0, 0.6, 0.3, 0.7, 0.15)
    grad.add_color_stop_rgba(1, 0, 0, 0, 0)
    ctx.set_source(grad)
    ctx.rectangle(0, 0, SIZE, SIZE)
    ctx.fill()

    return surface


# ── Gatherable plant generators ────────────────────────────────────────

def gen_stick_pile():
    """Scattered brown sticks."""
    seed_rng('stick_pile')
    surface, ctx = make_ctx()

    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    sticks = [
        (20, 42, 44, 36, 2.5),
        (22, 30, 46, 38, 2.0),
        (18, 38, 40, 28, 2.0),
        (24, 44, 42, 32, 1.8),
        (28, 40, 38, 26, 1.5),
    ]
    for x1, y1, x2, y2, w in sticks:
        # Shadow
        ctx.set_source_rgba(0.2, 0.14, 0.06, 0.3)
        ctx.set_line_width(w + 1)
        ctx.move_to(x1 + 1, y1 + 1)
        ctx.line_to(x2 + 1, y2 + 1)
        ctx.stroke()
        # Stick
        ctx.set_source_rgb(0.42, 0.26, 0.15)
        ctx.set_line_width(w)
        ctx.move_to(x1, y1)
        ctx.line_to(x2, y2)
        ctx.stroke()

    return surface


def gen_loose_stone():
    """2-3 small gray pebbles."""
    seed_rng('loose_stone')
    surface, ctx = make_ctx()

    pebbles = [(CX - 8, CY + 4, 8), (CX + 6, CY, 7), (CX - 1, CY + 10, 6)]
    for px, py, pr in pebbles:
        # Shadow
        ctx.set_source_rgba(0, 0, 0, 0.2)
        ctx.arc(px + 1, py + 2, pr, 0, 2 * math.pi)
        ctx.fill()

        # Pebble
        shade = 0.5 + random.random() * 0.2
        ctx.set_source_rgb(shade, shade, shade)
        ctx.arc(px, py, pr, 0, 2 * math.pi)
        ctx.fill()

        # Highlight
        ctx.set_source_rgba(1, 1, 1, 0.2)
        ctx.arc(px - 2, py - 2, pr * 0.4, 0, 2 * math.pi)
        ctx.fill()

    return surface


def gen_berry_bush():
    """Green leafy bush with small red dots (berries)."""
    seed_rng('berry_bush')
    surface, ctx = make_ctx()

    # Bush body (overlapping circles)
    bush_parts = [
        (CX - 8, CY + 2, 14),
        (CX + 6, CY - 2, 13),
        (CX, CY - 6, 12),
        (CX - 4, CY + 8, 11),
        (CX + 4, CY + 6, 12),
    ]
    for bx, by, br in bush_parts:
        ctx.set_source_rgb(0.2, 0.45, 0.15)
        ctx.arc(bx, by, br, 0, 2 * math.pi)
        ctx.fill()

    # Leaf highlights
    for _ in range(6):
        lx = CX + (random.random() - 0.5) * 24
        ly = CY + (random.random() - 0.5) * 22
        lr = 3 + random.random() * 4
        ctx.set_source_rgba(0.3, 0.55, 0.2, 0.4)
        ctx.arc(lx, ly, lr, 0, 2 * math.pi)
        ctx.fill()

    # Berries
    for _ in range(7):
        bx = CX + (random.random() - 0.5) * 22
        by = CY + (random.random() - 0.5) * 20
        ctx.set_source_rgb(0.75, 0.15, 0.15)
        ctx.arc(bx, by, 2.5, 0, 2 * math.pi)
        ctx.fill()
        # Berry shine
        ctx.set_source_rgba(1, 1, 1, 0.3)
        ctx.arc(bx - 0.5, by - 0.5, 1, 0, 2 * math.pi)
        ctx.fill()

    return surface


def gen_flax_plant():
    """Tall green stems with small blue flowers at top."""
    seed_rng('flax_plant')
    surface, ctx = make_ctx()

    stems = [(CX - 6, 3), (CX, 2.5), (CX + 6, 3), (CX - 3, 2), (CX + 3, 2.5)]
    for sx, sway in stems:
        ctx.set_source_rgb(0.35, 0.55, 0.18)
        ctx.set_line_width(sway - 0.5)
        ctx.move_to(sx, 58)
        ctx.curve_to(sx + sway, 40, sx - sway, 25, sx + sway * 0.5, 14)
        ctx.stroke()

        # Blue flower at top
        fx = sx + sway * 0.5
        fy = 13 + random.random() * 3
        ctx.set_source_rgba(0.4, 0.5, 0.85, 0.8)
        ctx.arc(fx, fy, 3, 0, 2 * math.pi)
        ctx.fill()

    return surface


def gen_mushroom_cluster():
    """2-3 mushrooms with tan caps."""
    seed_rng('mushroom_cluster')
    surface, ctx = make_ctx()

    mushrooms = [
        (CX - 10, CY + 8, 10, 16),  # x, base_y, cap_radius, stem_height
        (CX + 4, CY + 4, 12, 20),
        (CX - 2, CY + 12, 8, 12),
    ]
    for mx, base_y, cap_r, stem_h in mushrooms:
        cap_y = base_y - stem_h + cap_r

        # Stem
        ctx.set_source_rgb(0.85, 0.80, 0.70)
        ctx.rectangle(mx - 2, cap_y + cap_r * 0.5, 4, stem_h - cap_r * 0.5)
        ctx.fill()

        # Cap (half-ellipse)
        ctx.save()
        ctx.translate(mx, cap_y)
        ctx.scale(1.0, 0.6)
        ctx.arc(0, 0, cap_r, math.pi, 2 * math.pi)
        ctx.restore()

        grad = cairo.RadialGradient(mx - 2, cap_y - 2, 1, mx, cap_y, cap_r)
        grad.add_color_stop_rgb(0, 0.9, 0.75, 0.5)
        grad.add_color_stop_rgb(1, 0.7, 0.55, 0.35)
        ctx.set_source(grad)
        ctx.fill()

        # Cap spots
        for _ in range(3):
            sx = mx + (random.random() - 0.5) * cap_r
            sy = cap_y - random.random() * cap_r * 0.4
            ctx.set_source_rgba(1, 1, 0.9, 0.5)
            ctx.arc(sx, sy, 1.5, 0, 2 * math.pi)
            ctx.fill()

    return surface


def gen_thistle():
    """Spiky purple-tipped plant."""
    seed_rng('thistle')
    surface, ctx = make_ctx()

    # Stem
    ctx.set_source_rgb(0.3, 0.45, 0.2)
    ctx.set_line_width(2.5)
    ctx.move_to(CX, 58)
    ctx.curve_to(CX + 2, 44, CX - 1, 30, CX, 18)
    ctx.stroke()

    # Thorny leaves
    ctx.set_line_width(1.5)
    leaves = [(CX, 44, -12, -4), (CX, 38, 10, -5), (CX, 48, -8, -3), (CX, 32, 8, -4)]
    for lx, ly, dx, dy in leaves:
        ctx.set_source_rgb(0.28, 0.42, 0.18)
        ctx.move_to(lx, ly)
        ctx.line_to(lx + dx, ly + dy)
        ctx.stroke()

    # Purple flower head
    ctx.set_source_rgb(0.55, 0.25, 0.65)
    ctx.arc(CX, 14, 7, 0, 2 * math.pi)
    ctx.fill()

    # Spiky tips
    ctx.set_source_rgba(0.65, 0.35, 0.75, 0.8)
    ctx.set_line_width(1.2)
    for i in range(8):
        angle = i * math.pi / 4
        ex = CX + 10 * math.cos(angle)
        ey = 14 + 10 * math.sin(angle)
        ctx.move_to(CX + 5 * math.cos(angle), 14 + 5 * math.sin(angle))
        ctx.line_to(ex, ey)
        ctx.stroke()

    return surface


def gen_guck_sac():
    """Blobby green sac, semi-translucent look."""
    seed_rng('guck_sac')
    surface, ctx = make_ctx()

    # Shadow
    ctx.set_source_rgba(0, 0.15, 0, 0.2)
    ctx.save()
    ctx.translate(CX + 1, CY + 6)
    ctx.scale(1.0, 0.8)
    ctx.arc(0, 0, 18, 0, 2 * math.pi)
    ctx.restore()
    ctx.fill()

    # Main blobby body
    grad = cairo.RadialGradient(CX - 4, CY - 4, 2, CX, CY + 2, 18)
    grad.add_color_stop_rgba(0, 0.2, 0.75, 0.3, 0.85)
    grad.add_color_stop_rgba(0.6, 0.15, 0.6, 0.25, 0.75)
    grad.add_color_stop_rgba(1, 0.08, 0.4, 0.15, 0.65)
    ctx.set_source(grad)

    ctx.save()
    ctx.translate(CX, CY + 2)
    ctx.scale(1.0, 0.85)
    ctx.arc(0, 0, 18, 0, 2 * math.pi)
    ctx.restore()
    ctx.fill()

    # Internal glow
    ctx.set_source_rgba(0.4, 0.9, 0.4, 0.2)
    ctx.arc(CX - 3, CY - 2, 6, 0, 2 * math.pi)
    ctx.fill()

    # Specular highlight
    ctx.set_source_rgba(1, 1, 1, 0.25)
    ctx.arc(CX - 5, CY - 5, 4, 0, 2 * math.pi)
    ctx.fill()

    return surface


def gen_bloodbag():
    """Drooping red pod on thin stem."""
    seed_rng('bloodbag')
    surface, ctx = make_ctx()

    # Stem
    ctx.set_source_rgb(0.3, 0.22, 0.18)
    ctx.set_line_width(2)
    ctx.move_to(CX, 10)
    ctx.curve_to(CX + 4, 20, CX - 2, 28, CX, 32)
    ctx.stroke()

    # Pod (teardrop shape pointing down)
    grad = cairo.RadialGradient(CX - 2, CY + 4, 2, CX, CY + 8, 14)
    grad.add_color_stop_rgb(0, 0.85, 0.2, 0.15)
    grad.add_color_stop_rgb(0.6, 0.7, 0.12, 0.1)
    grad.add_color_stop_rgb(1, 0.45, 0.08, 0.06)
    ctx.set_source(grad)

    ctx.move_to(CX, 30)
    ctx.curve_to(CX - 12, 38, CX - 10, 52, CX, 56)
    ctx.curve_to(CX + 10, 52, CX + 12, 38, CX, 30)
    ctx.fill()

    # Vein lines
    ctx.set_source_rgba(0.5, 0.05, 0.05, 0.3)
    ctx.set_line_width(1)
    ctx.move_to(CX, 32)
    ctx.curve_to(CX - 4, 42, CX - 2, 50, CX, 54)
    ctx.stroke()
    ctx.move_to(CX, 34)
    ctx.curve_to(CX + 3, 42, CX + 1, 48, CX, 52)
    ctx.stroke()

    # Highlight
    ctx.set_source_rgba(1, 0.6, 0.5, 0.2)
    ctx.arc(CX - 3, CY + 2, 4, 0, 2 * math.pi)
    ctx.fill()

    return surface


def gen_charred_bone_pile():
    """Scattered dark bone shapes, ashy appearance."""
    seed_rng('charred_bone_pile')
    surface, ctx = make_ctx()

    # Ash base
    ctx.set_source_rgba(0.2, 0.2, 0.2, 0.3)
    ctx.save()
    ctx.translate(CX, CY + 6)
    ctx.scale(1.3, 0.6)
    ctx.arc(0, 0, 18, 0, 2 * math.pi)
    ctx.restore()
    ctx.fill()

    # Bone pieces
    bones = [
        (CX - 10, CY + 2, CX + 6, CY - 4, 3),
        (CX - 6, CY + 8, CX + 10, CY + 10, 2.5),
        (CX - 2, CY - 2, CX + 4, CY + 12, 2.5),
        (CX - 12, CY + 10, CX - 4, CY + 6, 2),
        (CX + 2, CY + 4, CX + 14, CY + 2, 2),
    ]
    for x1, y1, x2, y2, w in bones:
        ctx.set_source_rgb(0.3, 0.28, 0.26)
        ctx.set_line_width(w)
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        ctx.move_to(x1, y1)
        ctx.line_to(x2, y2)
        ctx.stroke()
        # Bone ends (joints)
        ctx.set_source_rgb(0.35, 0.32, 0.3)
        ctx.arc(x1, y1, w * 0.6, 0, 2 * math.pi)
        ctx.fill()
        ctx.arc(x2, y2, w * 0.6, 0, 2 * math.pi)
        ctx.fill()

    # Char/ash overlay
    ctx.set_source_rgba(0, 0, 0, 0.15)
    for _ in range(8):
        ax = CX + (random.random() - 0.5) * 30
        ay = CY + (random.random() - 0.5) * 20
        ar = 2 + random.random() * 3
        ctx.arc(ax, ay, ar, 0, 2 * math.pi)
        ctx.fill()

    return surface


# ── Cave variant generators ────────────────────────────────────────────

def _gen_cave_rock(name, rock_color, ore_color, num_veins=3, glow_color=None):
    """Cave rock node — darker version of surface rock."""
    seed_rng(name)
    surface, ctx = make_ctx()
    rr, rg, rb = hex_to_rgb(rock_color)

    # Darken base for cave feel
    rr, rg, rb = darken(rr, rg, rb, 0.75)

    ctx.set_source_rgb(rr, rg, rb)
    draw_irregular_rock(ctx, CX, CY + 4, 20)
    ctx.fill_preserve()

    ctx.set_source_rgba(*darken(rr, rg, rb, 0.5), 0.7)
    ctx.set_line_width(1.5)
    ctx.stroke()

    # Rock texture
    for _ in range(12):
        nx = CX + (random.random() - 0.5) * 28
        ny = CY + 4 + (random.random() - 0.5) * 28
        ns = 1 + random.random() * 2
        shade = (random.random() - 0.5) * 0.1
        ctx.set_source_rgba(rr + shade, rg + shade, rb + shade, 0.35)
        ctx.arc(nx, ny, ns, 0, 2 * math.pi)
        ctx.fill()

    if ore_color:
        draw_ore_veins(ctx, CX, CY + 4, 16, hex_to_rgb(ore_color), num_veins)

    draw_rock_highlights(ctx, CX, CY + 4, 20)

    if glow_color:
        gr, gg, gb = hex_to_rgb(glow_color)
        grad = cairo.RadialGradient(CX, CY + 4, 3, CX, CY + 4, 24)
        grad.add_color_stop_rgba(0, gr, gg, gb, 0.25)
        grad.add_color_stop_rgba(0.5, gr, gg, gb, 0.08)
        grad.add_color_stop_rgba(1, 0, 0, 0, 0)
        ctx.set_source(grad)
        ctx.rectangle(0, 0, SIZE, SIZE)
        ctx.fill()

    draw_cave_overlay(ctx)
    return surface


def gen_cave_copper_vein():
    return _gen_cave_rock('cave_copper_vein', '#777777', '#b87333', 4)


def gen_cave_tin_vein():
    return _gen_cave_rock('cave_tin_vein', '#777777', '#c0c0c0', 3)


def gen_cave_iron_vein():
    return _gen_cave_rock('cave_iron_vein', '#666666', '#6a6a6a', 4)


def gen_cave_coal_deposit():
    return _gen_cave_rock('cave_coal_deposit', '#3a3a3a', '#1a1a1a', 5)


def gen_cave_iron_scrap_pile():
    return _gen_cave_rock('cave_iron_scrap_pile', '#5a4a3a', '#7a5a3a', 4)


def gen_cave_silver_vein():
    return _gen_cave_rock('cave_silver_vein', '#707070', '#c0c0d0', 4)


def gen_cave_obsidian_vein():
    seed_rng('cave_obsidian_vein')
    surface = _gen_cave_rock('cave_obsidian_vein', '#1a1a2e', None, 0)
    ctx = cairo.Context(surface)
    # Purple sheen
    grad = cairo.LinearGradient(CX - 14, CY - 10, CX + 14, CY + 14)
    grad.add_color_stop_rgba(0, 0.3, 0.1, 0.4, 0.15)
    grad.add_color_stop_rgba(0.5, 0.1, 0.1, 0.2, 0.0)
    grad.add_color_stop_rgba(1, 0.2, 0.1, 0.35, 0.1)
    ctx.set_source(grad)
    ctx.arc(CX, CY + 4, 18, 0, 2 * math.pi)
    ctx.fill()
    return surface


def gen_cave_crystal_cluster():
    """Glowing crystal formations in cave."""
    seed_rng('cave_crystal_cluster')
    surface, ctx = make_ctx()

    # Dark rock base
    ctx.set_source_rgb(0.15, 0.15, 0.2)
    draw_irregular_rock(ctx, CX, CY + 8, 16)
    ctx.fill()

    # Crystal shards
    crystals = [
        (CX - 8, CY + 4, 6, 18, -0.2),
        (CX + 2, CY + 2, 5, 22, 0.1),
        (CX + 10, CY + 6, 4, 14, 0.3),
        (CX - 2, CY + 8, 4, 16, -0.1),
    ]
    for cx, cy_base, w, h, tilt in crystals:
        ctx.save()
        ctx.translate(cx, cy_base)
        ctx.rotate(tilt)

        # Crystal body
        grad = cairo.LinearGradient(-w, 0, w, -h)
        grad.add_color_stop_rgba(0, 0.4, 0.4, 0.75, 0.8)
        grad.add_color_stop_rgba(0.5, 0.55, 0.55, 0.9, 0.9)
        grad.add_color_stop_rgba(1, 0.7, 0.7, 1.0, 0.7)
        ctx.set_source(grad)

        ctx.move_to(-w / 2, 0)
        ctx.line_to(0, -h)
        ctx.line_to(w / 2, 0)
        ctx.close_path()
        ctx.fill_preserve()

        ctx.set_source_rgba(0.5, 0.5, 0.8, 0.5)
        ctx.set_line_width(1)
        ctx.stroke()

        ctx.restore()

    # Glow
    grad = cairo.RadialGradient(CX, CY, 4, CX, CY, 26)
    grad.add_color_stop_rgba(0, 0.5, 0.5, 0.9, 0.2)
    grad.add_color_stop_rgba(1, 0, 0, 0, 0)
    ctx.set_source(grad)
    ctx.rectangle(0, 0, SIZE, SIZE)
    ctx.fill()

    draw_cave_overlay(ctx)
    return surface


def gen_cave_flametal_vein():
    return _gen_cave_rock('cave_flametal_vein', '#3a2020', '#ff6600', 5, glow_color='#ff4400')


def gen_cave_sulfite_deposit():
    return _gen_cave_rock('cave_sulfite_deposit', '#4a4a30', '#cccc00', 4, glow_color='#aaaa00')


# ── Master resource dictionary ─────────────────────────────────────────

RESOURCES = {
    # Trees
    'wood_oak': gen_wood_oak,
    'wood_pine': gen_wood_pine,
    'wood_dark_oak': gen_wood_dark_oak,
    'ancient_tree': gen_ancient_tree,
    'frost_pine': gen_frost_pine,

    # Ore/Rock nodes
    'stone_node': gen_stone_node,
    'copper_node': gen_copper_node,
    'tin_node': gen_tin_node,
    'iron_deposit': gen_iron_deposit,
    'silver_vein': gen_silver_vein,
    'obsidian_node': gen_obsidian_node,
    'obsidian_large': gen_obsidian_large,
    'flametal_node': gen_flametal_node,
    'surtling_core_node': gen_surtling_core_node,
    'dragon_egg': gen_dragon_egg,

    # Gatherable plants
    'stick_pile': gen_stick_pile,
    'loose_stone': gen_loose_stone,
    'berry_bush': gen_berry_bush,
    'flax_plant': gen_flax_plant,
    'mushroom_cluster': gen_mushroom_cluster,
    'thistle': gen_thistle,
    'guck_sac': gen_guck_sac,
    'bloodbag': gen_bloodbag,
    'charred_bone_pile': gen_charred_bone_pile,

    # Cave variants
    'cave_copper_vein': gen_cave_copper_vein,
    'cave_tin_vein': gen_cave_tin_vein,
    'cave_iron_vein': gen_cave_iron_vein,
    'cave_coal_deposit': gen_cave_coal_deposit,
    'cave_iron_scrap_pile': gen_cave_iron_scrap_pile,
    'cave_silver_vein': gen_cave_silver_vein,
    'cave_obsidian_vein': gen_cave_obsidian_vein,
    'cave_crystal_cluster': gen_cave_crystal_cluster,
    'cave_flametal_vein': gen_cave_flametal_vein,
    'cave_sulfite_deposit': gen_cave_sulfite_deposit,
}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, gen_func in RESOURCES.items():
        surface = gen_func()
        path = os.path.join(OUT_DIR, f'{name}.png')
        surface.write_to_png(path)
        print(f'  {name}.png')
    print(f'\nGenerated {len(RESOURCES)} resource sprites in {os.path.abspath(OUT_DIR)}')


if __name__ == '__main__':
    main()
