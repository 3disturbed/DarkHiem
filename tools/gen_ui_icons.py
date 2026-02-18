#!/usr/bin/env python3
"""Generate 64x64 touch UI icons using pycairo. White silhouettes on transparent."""

import cairo
import os
import math

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'tileArt', 'ui')
SIZE = 64
CX = SIZE / 2
CY = SIZE / 2


def make_ctx():
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, SIZE, SIZE)
    ctx = cairo.Context(surface)
    ctx.set_antialias(cairo.ANTIALIAS_DEFAULT)
    ctx.set_source_rgba(1, 1, 1, 1)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    return surface, ctx


def gen_action():
    """Sword icon — diagonal blade with crossguard and grip."""
    surface, ctx = make_ctx()

    # Blade
    ctx.set_line_width(3.5)
    ctx.move_to(20, 12)
    ctx.line_to(42, 40)
    ctx.stroke()

    # Blade edge highlight
    ctx.set_line_width(1.5)
    ctx.set_source_rgba(1, 1, 1, 0.5)
    ctx.move_to(22, 12)
    ctx.line_to(43, 39)
    ctx.stroke()

    # Crossguard
    ctx.set_source_rgba(1, 1, 1, 1)
    ctx.set_line_width(4)
    ctx.move_to(27, 37)
    ctx.line_to(41, 27)
    ctx.stroke()

    # Grip
    ctx.set_line_width(4.5)
    ctx.move_to(42, 40)
    ctx.line_to(50, 50)
    ctx.stroke()

    # Pommel
    ctx.arc(51, 51, 3, 0, 2 * math.pi)
    ctx.fill()

    # Blade tip
    ctx.set_line_width(2)
    ctx.move_to(20, 12)
    ctx.line_to(17, 9)
    ctx.stroke()

    return surface


def gen_interact():
    """Open hand icon."""
    surface, ctx = make_ctx()

    # Palm
    ctx.set_line_width(2.5)
    ctx.move_to(24, 42)
    ctx.curve_to(20, 36, 20, 28, 24, 24)
    ctx.line_to(40, 24)
    ctx.curve_to(44, 28, 44, 36, 40, 42)
    ctx.close_path()
    ctx.fill_preserve()
    ctx.set_source_rgba(1, 1, 1, 0.4)
    ctx.stroke()

    # Fingers
    ctx.set_source_rgba(1, 1, 1, 1)
    ctx.set_line_width(4)
    fingers = [
        (26, 24, 24, 12),  # index
        (30, 24, 29, 10),  # middle
        (34, 24, 34, 11),  # ring
        (38, 24, 39, 14),  # pinky
    ]
    for x1, y1, x2, y2 in fingers:
        ctx.move_to(x1, y1)
        ctx.line_to(x2, y2)
        ctx.stroke()

    # Thumb
    ctx.set_line_width(4)
    ctx.move_to(24, 32)
    ctx.curve_to(18, 30, 16, 26, 18, 22)
    ctx.stroke()

    return surface


def gen_cancel():
    """X mark — two crossed lines."""
    surface, ctx = make_ctx()

    ctx.set_line_width(5)

    ctx.move_to(18, 18)
    ctx.line_to(46, 46)
    ctx.stroke()

    ctx.move_to(46, 18)
    ctx.line_to(18, 46)
    ctx.stroke()

    return surface


def gen_inventory():
    """Backpack/bag shape."""
    surface, ctx = make_ctx()

    # Bag body (rounded rectangle)
    r = 6
    x, y, w, h = 16, 22, 32, 30
    ctx.new_path()
    ctx.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    ctx.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    ctx.arc(x + r, y + r, r, math.pi, 3 * math.pi / 2)
    ctx.close_path()
    ctx.set_line_width(2.5)
    ctx.stroke()

    # Flap
    ctx.move_to(20, 28)
    ctx.line_to(20, 22)
    ctx.curve_to(20, 16, 44, 16, 44, 22)
    ctx.line_to(44, 28)
    ctx.set_line_width(2.5)
    ctx.stroke()

    # Flap buckle
    ctx.arc(32, 28, 3, 0, 2 * math.pi)
    ctx.fill()

    # Shoulder straps
    ctx.set_line_width(2.5)
    ctx.move_to(24, 22)
    ctx.curve_to(24, 14, 26, 10, 30, 10)
    ctx.stroke()
    ctx.move_to(40, 22)
    ctx.curve_to(40, 14, 38, 10, 34, 10)
    ctx.stroke()

    return surface


def gen_dash():
    """Speed lines with forward chevron."""
    surface, ctx = make_ctx()

    ctx.set_line_width(3)

    # Speed lines (horizontal dashes)
    for y_off in [-10, 0, 10]:
        ctx.move_to(12, CY + y_off)
        ctx.line_to(30, CY + y_off)
        ctx.stroke()

    # Forward chevron (arrow head)
    ctx.set_line_width(4)
    ctx.move_to(36, 20)
    ctx.line_to(50, CY)
    ctx.line_to(36, 44)
    ctx.stroke()

    return surface


def gen_questLog():
    """Scroll/document icon."""
    surface, ctx = make_ctx()

    # Main scroll body
    ctx.set_line_width(2)
    ctx.rectangle(20, 14, 24, 36)
    ctx.stroke()

    # Top roll
    ctx.save()
    ctx.arc(32, 14, 6, math.pi, 2 * math.pi)
    ctx.set_line_width(2)
    ctx.stroke()
    ctx.restore()

    # Bottom roll
    ctx.save()
    ctx.arc(32, 50, 6, 0, math.pi)
    ctx.set_line_width(2)
    ctx.stroke()
    ctx.restore()

    # Text lines
    ctx.set_line_width(1.5)
    for i in range(4):
        ly = 22 + i * 7
        ctx.move_to(24, ly)
        ctx.line_to(40, ly)
        ctx.stroke()

    return surface


def gen_skills():
    """4-pointed star/sparkle."""
    surface, ctx = make_ctx()

    # Main 4-pointed star
    points = []
    for i in range(8):
        angle = i * math.pi / 4 - math.pi / 2
        r = 22 if i % 2 == 0 else 8
        px = CX + r * math.cos(angle)
        py = CY + r * math.sin(angle)
        points.append((px, py))

    ctx.move_to(*points[0])
    for p in points[1:]:
        ctx.line_to(*p)
    ctx.close_path()
    ctx.fill()

    # Small sparkle at top-right
    ctx.set_line_width(2)
    sx, sy = 46, 16
    ctx.move_to(sx, sy - 6)
    ctx.line_to(sx, sy + 6)
    ctx.stroke()
    ctx.move_to(sx - 6, sy)
    ctx.line_to(sx + 6, sy)
    ctx.stroke()

    return surface


def gen_map():
    """Compass rose."""
    surface, ctx = make_ctx()

    # Outer ring
    ctx.set_line_width(2)
    ctx.arc(CX, CY, 24, 0, 2 * math.pi)
    ctx.stroke()

    # Inner ring
    ctx.arc(CX, CY, 4, 0, 2 * math.pi)
    ctx.fill()

    # Cardinal points (N/S/E/W arrows)
    ctx.set_line_width(2.5)
    # North (emphasized)
    ctx.move_to(CX, CY - 6)
    ctx.line_to(CX, CY - 22)
    ctx.stroke()
    ctx.move_to(CX - 4, CY - 17)
    ctx.line_to(CX, CY - 22)
    ctx.line_to(CX + 4, CY - 17)
    ctx.fill()

    # South
    ctx.set_line_width(2)
    ctx.move_to(CX, CY + 6)
    ctx.line_to(CX, CY + 22)
    ctx.stroke()

    # East
    ctx.move_to(CX + 6, CY)
    ctx.line_to(CX + 22, CY)
    ctx.stroke()

    # West
    ctx.move_to(CX - 6, CY)
    ctx.line_to(CX - 22, CY)
    ctx.stroke()

    # Diagonal ticks
    ctx.set_line_width(1.5)
    for angle in [math.pi / 4, 3 * math.pi / 4, 5 * math.pi / 4, 7 * math.pi / 4]:
        ix = CX + 14 * math.cos(angle)
        iy = CY + 14 * math.sin(angle)
        ox = CX + 20 * math.cos(angle)
        oy = CY + 20 * math.sin(angle)
        ctx.move_to(ix, iy)
        ctx.line_to(ox, oy)
        ctx.stroke()

    return surface


def gen_petTeam():
    """Paw print — large pad + 4 toe beans."""
    surface, ctx = make_ctx()

    # Main pad (large ellipse at bottom)
    ctx.save()
    ctx.translate(CX, CY + 8)
    ctx.scale(14, 10)
    ctx.arc(0, 0, 1, 0, 2 * math.pi)
    ctx.restore()
    ctx.fill()

    # Four toe beans
    toes = [
        (CX - 12, CY - 10, 6),
        (CX - 4,  CY - 16, 6),
        (CX + 4,  CY - 16, 6),
        (CX + 12, CY - 10, 6),
    ]
    for tx, ty, tr in toes:
        ctx.arc(tx, ty, tr, 0, 2 * math.pi)
        ctx.fill()

    return surface


def gen_horseAction():
    """Horse head silhouette."""
    surface, ctx = make_ctx()

    ctx.set_line_width(3)

    # Horse head profile (facing right)
    ctx.move_to(18, 48)  # neck base
    ctx.curve_to(16, 38, 14, 28, 18, 20)  # neck curve up
    ctx.curve_to(20, 14, 26, 10, 32, 10)  # top of head
    ctx.curve_to(36, 10, 40, 12, 42, 16)  # forehead
    ctx.curve_to(46, 20, 48, 26, 48, 30)  # face
    ctx.curve_to(48, 34, 46, 38, 42, 38)  # muzzle bottom
    ctx.curve_to(38, 38, 34, 36, 32, 32)  # jaw
    ctx.curve_to(30, 36, 28, 42, 26, 48)  # neck underside
    ctx.close_path()
    ctx.fill()

    # Ear
    ctx.move_to(28, 12)
    ctx.line_to(26, 4)
    ctx.line_to(32, 10)
    ctx.fill()

    # Eye (dark spot)
    ctx.set_source_rgba(0, 0, 0, 0.7)
    ctx.arc(36, 20, 2.5, 0, 2 * math.pi)
    ctx.fill()

    # Nostril
    ctx.arc(45, 32, 2, 0, 2 * math.pi)
    ctx.fill()

    return surface


ICONS = {
    'action': gen_action,
    'interact': gen_interact,
    'cancel': gen_cancel,
    'inventory': gen_inventory,
    'dash': gen_dash,
    'questLog': gen_questLog,
    'skills': gen_skills,
    'map': gen_map,
    'petTeam': gen_petTeam,
    'horseAction': gen_horseAction,
}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, gen_func in ICONS.items():
        surface = gen_func()
        path = os.path.join(OUT_DIR, f'{name}.png')
        surface.write_to_png(path)
        print(f'  {name}.png')
    print(f'\nGenerated {len(ICONS)} UI icons in {os.path.abspath(OUT_DIR)}')


if __name__ == '__main__':
    main()
