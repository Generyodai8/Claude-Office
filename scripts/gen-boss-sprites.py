#!/usr/bin/env python3
"""
Membuat sprite pixel-art perabot Ruang Bos (sofa, meja kopi, rak buku, lampu lantai) dengan geometri
isometrik yang sama dengan bossIso() di src/rooms.ts. Hasil: PNG di public/sprites/boss/ dan
manifest di src/bossSprites.ts (posisi dalam persen panggung).

Jalankan ulang jika ingin mengubah desain:   python3 scripts/gen-boss-sprites.py
"""
import json, os, random, zlib
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'sprites', 'boss')
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.png'):
        os.remove(os.path.join(OUT, f))

# --- geometri lantai (harus sama dengan rooms.ts) ---
BX, BY = 43.3, 35.2
LX, LY = -40.0, 28.4
RX, RY = 52.1, 29.0
ASPECT = 4800 / 3584
C = 5.0  # piksel sprite per 1% lebar panggung


def proj(u, v, z=0.0):
    return (BX + u * LX + v * RX, BY + u * LY + v * RY - z)


class Canvas:
    def __init__(self, ulo, uhi, vlo, vhi, zmax, pad=1.4):
        pts = [proj(u, v, z) for u in (ulo, uhi) for v in (vlo, vhi) for z in (0, zmax)]
        self.x0 = min(p[0] for p in pts) - pad
        self.x1 = max(p[0] for p in pts) + pad
        self.y0 = min(p[1] for p in pts) - pad
        self.y1 = max(p[1] for p in pts) + pad + 1.0
        self.w = int(round((self.x1 - self.x0) * C))
        self.h = int(round((self.y1 - self.y0) * C / ASPECT))
        self.im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def px(self, u, v, z=0.0):
        x, y = proj(u, v, z)
        return ((x - self.x0) * C, (y - self.y0) * C / ASPECT)

    def poly(self, pts, fill, outline=None):
        self.d.polygon(pts, fill=fill, outline=outline)

    def line(self, a, b, fill, width=1):
        self.d.line([a, b], fill=fill, width=width)

    def dot(self, p, fill):
        x, y = int(round(p[0])), int(round(p[1]))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.im.putpixel((x, y), fill)

    def save(self, name):
        self.im.save(os.path.join(OUT, name))
        return {'src': f'/sprites/boss/{name}', 'x': round(self.x0, 3), 'y': round(self.y0, 3),
                'w': round(self.w / C, 3), 'h': round(self.h / C * ASPECT, 3)}


def hexc(s, a=255):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


def shade(c, f):
    return tuple(max(0, min(255, int(c[i] * f))) for i in range(3)) + (c[3],)


OUTLINE = hexc('#17100c')


def box(cv, u0, u1, v0, v1, z0, z1, top, left, right, outline=OUTLINE, hi=True):
    """Balok: atas terang, sisi +u sedang, sisi +v gelap, outline 1px, sorotan di tepi atas."""
    A = cv.px(u0, v0, z1); B = cv.px(u1, v0, z1); Cc = cv.px(u1, v1, z1); D = cv.px(u0, v1, z1)
    B0 = cv.px(u1, v0, z0); C0 = cv.px(u1, v1, z0); D0 = cv.px(u0, v1, z0)
    cv.poly([B, Cc, C0, B0], left, outline)
    cv.poly([Cc, D, D0, C0], right, outline)
    cv.poly([A, B, Cc, D], top, outline)
    if hi:
        light = shade(top, 1.25)
        cv.line(A, B, light)
        cv.line(A, D, light)


def face_v(cv, v, u0, u1, z0, z1, fill, outline=None):
    """Persegi pada bidang v = const (sisi yang menghadap +v)."""
    cv.poly([cv.px(u0, v, z0), cv.px(u1, v, z0), cv.px(u1, v, z1), cv.px(u0, v, z1)], fill, outline)


def floor_shadow(cv, u0, u1, v0, v1, a=70):
    cv.poly([cv.px(u0 + 0.01, v0 + 0.01), cv.px(u1 + 0.02, v0 + 0.01), cv.px(u1 + 0.025, v1 + 0.02), cv.px(u0 + 0.01, v1 + 0.02)], (0, 0, 0, a))


def noise_top(cv, u0, u1, v0, v1, z, base, rnd, n=30, f=(0.85, 1.15)):
    for _ in range(n):
        cv.dot(cv.px(rnd.uniform(u0, u1), rnd.uniform(v0, v1), z), shade(base, rnd.choice(f)))


# ------------------------------------------------------------------ sofa
def make_sofa():
    rnd = random.Random(11)
    U0, U1, V0, V1 = 0.50, 0.90, 0.030, 0.170
    cv = Canvas(U0, U1, V0, V1, 8.5)
    fab = hexc('#35697a'); fabL = hexc('#27505e'); fabR = hexc('#1d3c47'); dark = hexc('#1f1a17')
    floor_shadow(cv, U0, U1, V0, V1, 80)
    for (u, v) in [(U0 + 0.012, V0 + 0.01), (U1 - 0.03, V0 + 0.01), (U0 + 0.012, V1 - 0.03), (U1 - 0.03, V1 - 0.03)]:
        box(cv, u, u + 0.018, v, v + 0.018, 0, 1.2, dark, dark, dark, hi=False)
    box(cv, U0, U1, V0, V1, 1.1, 2.0, fab, fabL, fabR)
    box(cv, U0 + 0.035, U1 - 0.035, V0, V0 + 0.05, 2.0, 7.6, fab, fabL, fabR)
    n = 3; gap = 0.006; span = (U1 - U0 - 0.07 - gap * (n - 1)) / n
    for i in range(n):
        a = U0 + 0.035 + i * (span + gap)
        box(cv, a + 0.004, a + span - 0.004, V0 + 0.05, V0 + 0.082, 2.9, 6.9, shade(fab, 1.08), shade(fabL, 1.1), shade(fabR, 1.1))
    for i in range(n):
        a = U0 + 0.035 + i * (span + gap)
        box(cv, a, a + span, V0 + 0.058, V1 - 0.004, 2.0, 3.2, shade(fab, 1.12), shade(fabL, 1.12), shade(fabR, 1.12))
        cv.line(cv.px(a + span / 2, V0 + 0.07, 3.2), cv.px(a + span / 2, V1 - 0.015, 3.2), shade(fab, 0.8))
        noise_top(cv, a, a + span, V0 + 0.06, V1 - 0.01, 3.2, fab, rnd, 14)
    box(cv, U0, U0 + 0.04, V0, V1, 1.1, 4.8, shade(fab, 1.05), fabL, fabR)
    box(cv, U1 - 0.04, U1, V0, V1, 1.1, 4.8, shade(fab, 1.05), fabL, fabR)
    box(cv, U0 + 0.045, U0 + 0.085, V0 + 0.06, V0 + 0.105, 3.2, 5.6, hexc('#d9a441'), hexc('#a87d2e'), hexc('#876222'))
    box(cv, U1 - 0.085, U1 - 0.045, V0 + 0.065, V0 + 0.11, 3.2, 5.4, hexc('#e8dcc2'), hexc('#bfb293'), hexc('#9d9174'))
    return cv.save('sofa.png')


# ------------------------------------------------------------- meja kopi
def make_coffee_table():
    U0, U1, V0, V1 = 0.60, 0.80, 0.215, 0.315
    cv = Canvas(U0, U1, V0, V1, 6.5)
    wood = hexc('#8a5634'); woodL = hexc('#66401f'); woodR = hexc('#4d2f18'); dark = hexc('#241812')
    floor_shadow(cv, U0, U1, V0, V1, 70)
    for (u, v) in [(U0 + 0.012, V0 + 0.01), (U1 - 0.03, V0 + 0.01), (U0 + 0.012, V1 - 0.03), (U1 - 0.03, V1 - 0.03)]:
        box(cv, u, u + 0.018, v, v + 0.018, 0, 2.3, dark, shade(dark, 1.2), dark, hi=False)
    box(cv, U0 + 0.012, U1 - 0.012, V0 + 0.01, V1 - 0.01, 0.9, 1.3, shade(wood, 0.85), woodL, woodR, hi=False)
    box(cv, U0, U1, V0, V1, 2.3, 3.0, wood, woodL, woodR)
    for i in range(1, 9):
        u = U0 + i * (U1 - U0) / 9
        cv.line(cv.px(u, V0 + 0.004, 3.0), cv.px(u, V1 - 0.004, 3.0), shade(wood, 0.84 if i % 2 else 1.12))
    z = 3.0
    box(cv, 0.625, 0.70, 0.235, 0.295, z, z + 0.25, hexc('#d8d3c4'), hexc('#a9a597'), hexc('#8a8679'), hi=False)
    box(cv, 0.632, 0.675, 0.24, 0.285, z + 0.25, z + 0.9, hexc('#b2453a'), hexc('#8a3329'), hexc('#6d281f'))
    box(cv, 0.636, 0.67, 0.245, 0.28, z + 0.9, z + 1.4, hexc('#efece2'), hexc('#c9c2b0'), hexc('#aaa392'))
    p = cv.px(0.69, 0.26, z + 0.25)
    cv.d.rectangle([p[0] - 2, p[1] - 3, p[0] + 1, p[1]], fill=hexc('#f1ede4'), outline=OUTLINE)
    cv.d.rectangle([p[0] - 1, p[1] - 3, p[0], p[1] - 3], fill=hexc('#5b3a24'))
    box(cv, 0.735, 0.77, 0.25, 0.285, z, z + 1.1, hexc('#d9d5c8'), hexc('#b0ac9f'), hexc('#8d897d'))
    p = cv.px(0.7525, 0.2675, z + 1.1)
    for dx, dy, col in [(-3, -3, '#3aa65d'), (0, -5, '#2f8f4e'), (3, -3, '#3aa65d'), (0, -2, '#4fbe73'), (-1, -4, '#2f8f4e')]:
        cv.d.rectangle([p[0] + dx - 1, p[1] + dy - 1, p[0] + dx + 1, p[1] + dy + 1], fill=hexc(col), outline=hexc('#1c4d2c'))
    return cv.save('coffee-table.png')


# ------------------------------------------------------------- rak buku
def make_bookcase():
    rnd = random.Random(21)
    U0, U1, V0, V1 = 0.355, 0.50, 0.012, 0.075
    H = 15.0
    cv = Canvas(U0, U1, V0, V1, H)
    wood = hexc('#6b4328'); woodL = hexc('#4f301b'); woodR = hexc('#3b2313'); back = hexc('#2a1a10')
    floor_shadow(cv, U0, U1, V0, V1, 70)
    box(cv, U0, U1, V0, V1, 0, H, wood, woodL, woodR)
    inset = 0.006
    face_v(cv, V1, U0 + inset, U1 - inset, 0.9, H - 0.6, back)
    shelves = [0.9, 4.6, 8.3, 12.0]
    palette = ['#b2453a', '#2f6fa8', '#d9a441', '#3c8f5a', '#7a4fa0', '#c9c2b0', '#a4553a', '#2a8d8d', '#d27a2c']
    for si in range(3):
        z0 = shelves[si] + 0.4; z1 = shelves[si + 1] - 0.35
        u = U0 + inset + 0.004
        while u < U1 - inset - 0.012:
            w = rnd.choice([0.008, 0.010, 0.012, 0.014])
            hgt = rnd.uniform(z1 - z0 - 1.2, z1 - z0 - 0.1)
            if rnd.random() < 0.12:
                u += w * 1.5
                continue
            col = hexc(rnd.choice(palette))
            face_v(cv, V1 - 0.001, u, u + w, z0, z0 + hgt, col, outline=shade(col, 0.55))
            a = cv.px(u + w * 0.5, V1 - 0.001, z0 + hgt * 0.35); b = cv.px(u + w * 0.5, V1 - 0.001, z0 + hgt * 0.7)
            cv.line(a, b, shade(col, 1.35))
            u += w + 0.002
    for z in shelves:
        face_v(cv, V1, U0, U1, z - 0.35, z + 0.15, shade(wood, 1.12), outline=OUTLINE)
    face_v(cv, V1, U0, U0 + inset + 0.002, 0, H, shade(wood, 1.1), outline=OUTLINE)
    face_v(cv, V1, U1 - inset - 0.002, U1, 0, H, shade(wood, 1.1), outline=OUTLINE)
    p = cv.px((U0 + U1) / 2, (V0 + V1) / 2, H)
    cv.d.rectangle([p[0] - 1, p[1] - 4, p[0] + 1, p[1]], fill=hexc('#c9a15c'), outline=OUTLINE)
    cv.d.ellipse([p[0] - 3, p[1] - 9, p[0] + 3, p[1] - 3], fill=hexc('#e3b94f'), outline=hexc('#7a5c24'))
    return cv.save('bookcase.png')


# ---------------------------------------------------------- lampu lantai
def make_floor_lamp():
    cv = Canvas(-0.03, 0.03, -0.03, 0.03, 15.0, pad=3.2)
    c = cv.px(0, 0, 0)
    cv.d.ellipse([c[0] - 5, c[1] - 2, c[0] + 5, c[1] + 2], fill=(0, 0, 0, 80))
    cv.d.ellipse([c[0] - 4, c[1] - 2, c[0] + 4, c[1] + 1], fill=hexc('#2a2d33'), outline=OUTLINE)
    top = cv.px(0, 0, 11.5)
    cv.d.rectangle([c[0] - 1, top[1], c[0], c[1] - 1], fill=hexc('#c9a15c'))
    halo = Image.new('RGBA', cv.im.size, (0, 0, 0, 0)); hd = ImageDraw.Draw(halo)
    sc = cv.px(0, 0, 13.2)
    for r, a in [(22, 14), (16, 22), (11, 34)]:
        hd.ellipse([sc[0] - r, sc[1] - r * 0.8, sc[0] + r, sc[1] + r * 0.8], fill=(255, 226, 160, a))
    cv.im.alpha_composite(halo)
    cv.d = ImageDraw.Draw(cv.im)
    s0 = cv.px(0, 0, 11.2); s1 = cv.px(0, 0, 15.0)
    cv.d.polygon([(s0[0] - 6, s0[1]), (s0[0] + 6, s0[1]), (s1[0] + 3.5, s1[1]), (s1[0] - 3.5, s1[1])], fill=hexc('#f3dfae'), outline=hexc('#8a6a2a'))
    cv.d.polygon([(s0[0] + 1, s0[1]), (s0[0] + 6, s0[1]), (s1[0] + 3.5, s1[1]), (s1[0] + 1, s1[1])], fill=hexc('#e0c685'))
    return cv.save('floor-lamp.png')


def main():
    manifest = {
        'sofa': make_sofa(),
        'coffeeTable': make_coffee_table(),
        'bookcase': make_bookcase(),
        'floorLamp': make_floor_lamp(),
    }
    ts = [
        '// DIBUAT OTOMATIS oleh scripts/gen-boss-sprites.py — jangan diedit tangan.',
        '// Posisi (x, y) dan ukuran (w, h) dalam persen panggung (lampu lantai: relatif terhadap (u,v)=(0,0)).',
        'export interface BossSprite { src: string; x: number; y: number; w: number; h: number }',
        'export const BOSS_FURNITURE: Record<string, BossSprite> = ' + json.dumps(manifest, indent=2),
        '',
    ]
    with open(os.path.join(ROOT, 'src', 'bossSprites.ts'), 'w') as f:
        f.write('\n'.join(ts))
    print('ok', list(manifest))


if __name__ == '__main__':
    main()
