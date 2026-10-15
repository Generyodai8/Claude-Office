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


def face_u(cv, u, v0, v1, z0, z1, fill, outline=None):
    """Persegi pada bidang u = const (sisi yang menghadap +u)."""
    cv.poly([cv.px(u, v0, z0), cv.px(u, v1, z0), cv.px(u, v1, z1), cv.px(u, v0, z1)], fill, outline)


def pix_rect_u(cv, u, v0, v1, z0, z1, fill):
    face_u(cv, u, v0, v1, z0, z1, fill)


# --------------------------------------------------------- meja kerja Bos
def make_desk():
    rnd = random.Random(31)
    U0, U1, V0, V1 = 0.17, 0.325, 0.09, 0.44
    cv = Canvas(U0, U1, V0, V1, 16.0)
    wood = hexc('#6d4630'); woodL = hexc('#4d3220'); woodR = hexc('#3b2616'); dark = hexc('#1d130c')
    brass = hexc('#c9a15c')
    floor_shadow(cv, U0, U1, V0, V1, 80)
    zT0, zT1 = 2.7, 3.5
    # panel samping kiri (belakang) dan laci di ujung +v
    box(cv, U0 + 0.012, U1 - 0.012, V0 + 0.012, V0 + 0.03, 0, zT0, shade(wood, 0.8), woodL, woodR, hi=False)
    box(cv, U0 + 0.012, U1 - 0.012, V1 - 0.115, V1 - 0.012, 0, zT0, shade(wood, 0.8), woodL, woodR, hi=False)
    # tiga laci di sisi +u pedestal
    for i in range(3):
        z0 = 0.3 + i * 0.78; z1 = z0 + 0.66
        face_u(cv, U1 - 0.012, V1 - 0.108, V1 - 0.02, z0, z1, shade(wood, 1.12), outline=OUTLINE)
        a = cv.px(U1 - 0.012, V1 - 0.064 - 0.016, (z0 + z1) / 2); b = cv.px(U1 - 0.012, V1 - 0.064 + 0.016, (z0 + z1) / 2)
        cv.line(a, b, brass)
    # papan atas
    box(cv, U0, U1, V0, V1, zT0, zT1, wood, woodL, woodR)
    for i in range(1, 12):
        u = U0 + i * (U1 - U0) / 12
        cv.line(cv.px(u, V0 + 0.004, zT1), cv.px(u, V1 - 0.004, zT1), shade(wood, 0.82 if i % 2 else 1.12))
    cv.line(cv.px(U1, V0, zT1 - 0.4), cv.px(U1, V1, zT1 - 0.4), brass)    # lis kuningan di tepi
    # alas meja kulit hitam
    box(cv, 0.205, 0.30, 0.145, 0.375, zT1, zT1 + 0.12, hexc('#262b2e'), hexc('#171a1c'), hexc('#101214'), hi=False)
    z = zT1 + 0.12
    # monitor lengkung ultra-lebar (tiga ruas) di atas kaki + dasar
    box(cv, 0.205, 0.225, 0.225, 0.265, z, z + 0.25, hexc('#2b3038'), hexc('#1e2228'), hexc('#171a1f'), hi=False)
    box(cv, 0.208, 0.218, 0.238, 0.252, z + 0.25, z + 2.4, hexc('#2b3038'), hexc('#1e2228'), hexc('#171a1f'), hi=False)
    segs = [(0.130, 0.205, 0.206), (0.205, 0.275, 0.200), (0.275, 0.350, 0.206)]
    zb0, zb1 = z + 2.0, z + 9.0
    for (a, b, u) in segs:
        box(cv, u - 0.006, u, a, b, zb0, zb1, hexc('#14181e'), hexc('#0c0f13'), hexc('#0c0f13'), hi=False)
        # layar menghadap +u: bingkai tipis lalu isi biru gelap
        face_u(cv, u, a + 0.003, b - 0.003, zb0 + 0.35, zb1 - 0.35, hexc('#12263f'))
    # isi layar: panel dashboard (batang warna, garis, angka kecil)
    def sc(v, zz):
        # u untuk titik v pada layar lengkung (ruas tengah lebih ke belakang)
        if v < 0.205: u = 0.206
        elif v < 0.275: u = 0.200
        else: u = 0.206
        return cv.px(u, v, zz)
    # judul bar
    cv.line(sc(0.14, zb1 - 0.9), sc(0.20, zb1 - 0.9), hexc('#5ab0ff'))
    # kotak sidebar kiri
    for k in range(4):
        zz = zb1 - 1.6 - k * 1.2
        cv.line(sc(0.14, zz), sc(0.17, zz), hexc('#2f4f78'))
    # batang grafik
    cols = ['#44d19a', '#f2b84a', '#5ab0ff', '#44d19a', '#f2b84a', '#5ab0ff', '#44d19a']
    for k in range(7):
        v = 0.215 + k * 0.011
        h = [1.6, 2.6, 1.9, 3.3, 2.2, 3.0, 2.4][k]
        cv.line(sc(v, zb0 + 0.7), sc(v, zb0 + 0.7 + h), hexc(cols[k]), 1)
    # garis tren
    pts = [sc(0.295 + i * 0.012, zb0 + 2.4 + [0.4, 1.4, 0.8, 2.1, 1.6, 2.6][i]) for i in range(6)]
    cv.d.line(pts, fill=hexc('#f2f6ff'), width=1)
    # lingkaran indikator (hijau/kuning)
    for (v, col) in [(0.335, '#44d19a'), (0.345, '#f2b84a')]:
        p = sc(v, zb1 - 1.4)
        cv.d.rectangle([p[0] - 1, p[1] - 1, p[0] + 1, p[1] + 1], fill=hexc(col))
    # keyboard + mouse
    box(cv, 0.245, 0.275, 0.20, 0.30, z, z + 0.18, hexc('#2a2f36'), hexc('#1c2025'), hexc('#14171b'), hi=False)
    for i in range(3):
        for j in range(12):
            cv.dot(cv.px(0.248 + i * 0.008, 0.205 + j * 0.0075, z + 0.19), hexc('#8d97a6'))
    box(cv, 0.262, 0.275, 0.325, 0.345, z, z + 0.3, hexc('#2f353d'), hexc('#1e2228'), hexc('#15181c'), hi=False)
    # laptop terbuka dekat laci
    box(cv, 0.255, 0.30, 0.375, 0.425, z, z + 0.14, hexc('#80868f'), hexc('#5d626b'), hexc('#464a52'), hi=False)
    box(cv, 0.299, 0.306, 0.37, 0.43, z, z + 3.6, hexc('#1b1f2b'), hexc('#2b3b5e'), hexc('#2b3b5e'), hi=False)
    face_u(cv, 0.3065, 0.376, 0.424, z + 0.35, z + 3.3, hexc('#6fb7ff'))
    # tumpukan kertas + map
    box(cv, 0.235, 0.285, 0.105, 0.145, z, z + 0.5, hexc('#f2efe5'), hexc('#c9c2b0'), hexc('#aaa392'))
    box(cv, 0.24, 0.28, 0.108, 0.142, z + 0.5, z + 0.95, hexc('#e8e4d6'), hexc('#bdb7a4'), hexc('#9e9886'))
    box(cv, 0.26, 0.30, 0.108, 0.125, z + 0.95, z + 1.1, hexc('#2f6fa8'), hexc('#245585'), hexc('#1b4167'), hi=False)
    # piala emas
    p = cv.px(0.205, 0.125, z)
    cv.d.rectangle([p[0] - 3, p[1] - 1, p[0] + 3, p[1]], fill=hexc('#7a5c24'), outline=OUTLINE)
    cv.d.rectangle([p[0] - 1, p[1] - 5, p[0], p[1] - 1], fill=hexc('#c9a15c'))
    cv.d.polygon([(p[0] - 4, p[1] - 11), (p[0] + 4, p[1] - 11), (p[0] + 2, p[1] - 5), (p[0] - 2, p[1] - 5)], fill=hexc('#e3b94f'), outline=hexc('#7a5c24'))
    cv.dot((p[0] - 2, p[1] - 9), hexc('#fff0a8'))
    # cangkir kopi + lampu meja
    p = cv.px(0.30, 0.31, z)
    cv.d.rectangle([p[0] - 2, p[1] - 3, p[0] + 1, p[1]], fill=hexc('#f1ede4'), outline=OUTLINE)
    cv.d.rectangle([p[0] - 1, p[1] - 3, p[0], p[1] - 3], fill=hexc('#5b3a24'))
    cv.dot((p[0] + 2, p[1] - 2), hexc('#f1ede4'))
    b = cv.px(0.215, 0.415, z)
    cv.d.rectangle([b[0] - 2, b[1] - 1, b[0] + 2, b[1]], fill=hexc('#2a2d33'), outline=OUTLINE)
    top = (b[0] + 2, b[1] - 12)
    cv.line((b[0], b[1] - 1), (b[0] + 1, b[1] - 8), hexc('#3a3f48'), 1)
    cv.line((b[0] + 1, b[1] - 8), top, hexc('#3a3f48'), 1)
    cv.d.polygon([(top[0] - 3, top[1]), (top[0] + 4, top[1]), (top[0] + 2, top[1] + 3), (top[0] - 2, top[1] + 3)], fill=hexc('#e0c685'), outline=hexc('#8a6a2a'))
    return cv.save('boss-desk.png')


# ----------------------------------------------------- pojok mesin kopi
def make_coffee_station():
    rnd = random.Random(41)
    U0, U1, V0, V1 = 0.0, 0.215, 0.575, 0.985
    H = 4.6
    cv = Canvas(U0, U1, V0, V1, 14.0)
    cab = hexc('#5a3a24'); cabL = hexc('#432a18'); cabR = hexc('#321f11'); dark = hexc('#1d130c'); brass = hexc('#c9a15c')
    steel = hexc('#c9ccd1'); steelL = hexc('#8e939b'); steelR = hexc('#6d727a'); black = hexc('#1c1e22')
    floor_shadow(cv, U0, U1, V0, V1, 70)
    # lemari bawah
    box(cv, U0, U1, V0, V1, 0.4, H, cab, cabL, cabR)
    box(cv, U0 + 0.01, U1 - 0.01, V0 + 0.01, V1 - 0.01, 0, 0.5, dark, dark, dark, hi=False)
    # pintu-pintu pada sisi +u (menghadap penonton) dan sisi +v ujung
    n = 4
    seg = (V1 - V0 - 0.03) / n
    for i in range(n):
        a = V0 + 0.015 + i * seg
        face_u(cv, U1, a + 0.004, a + seg - 0.004, 0.7, H - 0.5, shade(cab, 1.12), outline=OUTLINE)
        face_u(cv, U1 + 0.0005, a + 0.01, a + seg - 0.01, 0.95, H - 0.75, shade(cab, 1.02))
        m = cv.px(U1, a + seg / 2, 2.6)
        cv.d.rectangle([m[0] - 1, m[1] - 1, m[0] + 1, m[1] + 1], fill=brass)
    # papan atas marmer
    box(cv, U0, U1 + 0.012, V0 - 0.006, V1 + 0.006, H, H + 0.5, hexc('#e6e3dc'), hexc('#b9b5ab'), hexc('#9a968c'))
    for _ in range(26):
        cv.dot(cv.px(rnd.uniform(U0, U1), rnd.uniform(V0, V1), H + 0.5), hexc(rnd.choice(['#cfcbc0', '#f4f2ec', '#bdb8ac'])))
    z = H + 0.5
    # mesin espresso (baja tahan karat) dengan panel hitam, tuas, dan baki tetes
    box(cv, 0.035, 0.115, 0.625, 0.745, z, z + 1.2, steelL, steelL, steelR, hi=False)          # baki tetes
    box(cv, 0.04, 0.11, 0.63, 0.74, z + 1.2, z + 7.8, steel, steelL, steelR)                   # badan
    face_u(cv, 0.11, 0.645, 0.725, z + 2.6, z + 6.4, black, outline=OUTLINE)                   # panel depan
    for (v, col) in [(0.66, '#44d19a'), (0.70, '#f2b84a')]:
        p = cv.px(0.1105, v, z + 5.6)
        cv.d.rectangle([p[0] - 1, p[1] - 1, p[0] + 1, p[1] + 1], fill=hexc(col))
    cv.line(cv.px(0.1105, 0.65, z + 4.1), cv.px(0.1105, 0.715, z + 4.1), steelL, 1)
    box(cv, 0.095, 0.108, 0.665, 0.70, z + 1.3, z + 2.2, hexc('#2a2d33'), hexc('#1c1e22'), hexc('#14161a'), hi=False)  # portafilter
    box(cv, 0.04, 0.11, 0.63, 0.74, z + 7.8, z + 8.3, shade(steel, 1.08), steelL, steelR)       # tutup atas (pemanas cangkir)
    for v in (0.66, 0.705):                                                                     # cangkir di bawah keran
        p = cv.px(0.10, v, z + 1.2)
        cv.d.rectangle([p[0] - 2, p[1] - 3, p[0] + 1, p[1]], fill=hexc('#f1ede4'), outline=OUTLINE)
        cv.d.rectangle([p[0] - 1, p[1] - 3, p[0], p[1] - 3], fill=hexc('#5b3a24'))
    # gilingan kopi di sebelahnya
    box(cv, 0.05, 0.095, 0.765, 0.805, z, z + 3.6, hexc('#2a2d33'), hexc('#1c1e22'), hexc('#14161a'))
    box(cv, 0.058, 0.088, 0.772, 0.798, z + 3.6, z + 5.6, hexc('#7a5230'), hexc('#5a3a1f'), hexc('#432a15'))
    # nampan teko + cangkir + gula
    box(cv, 0.06, 0.15, 0.835, 0.925, z, z + 0.2, hexc('#d8d3c4'), hexc('#a9a597'), hexc('#8a8679'), hi=False)
    p = cv.px(0.105, 0.88, z + 0.2)
    cv.d.ellipse([p[0] - 5, p[1] - 8, p[0] + 5, p[1] - 1], fill=hexc('#f2eee3'), outline=OUTLINE)
    cv.d.rectangle([p[0] - 1, p[1] - 10, p[0] + 1, p[1] - 8], fill=hexc('#c9a15c'))
    cv.d.arc([p[0] + 3, p[1] - 7, p[0] + 8, p[1] - 2], 270, 90, fill=hexc('#f2eee3'))
    for (u, v) in [(0.075, 0.85), (0.135, 0.84), (0.14, 0.915)]:
        q = cv.px(u, v, z + 0.2)
        cv.d.rectangle([q[0] - 2, q[1] - 3, q[0] + 1, q[1]], fill=hexc('#f1ede4'), outline=OUTLINE)
    # toples biskuit
    box(cv, 0.05, 0.085, 0.945, 0.975, z, z + 2.8, hexc('#d9a441'), hexc('#a87d2e'), hexc('#876222'))
    box(cv, 0.052, 0.083, 0.947, 0.973, z + 2.8, z + 3.3, hexc('#8a5634'), hexc('#66401f'), hexc('#4d2f18'))
    return cv.save('coffee-station.png')


# --------------------------------------------------- meja samping + globe
def make_globe_table():
    U0, U1, V0, V1 = 0.255, 0.345, 0.895, 0.985
    cv = Canvas(U0, U1, V0, V1, 13.0)
    wood = hexc('#8a5634'); woodL = hexc('#66401f'); woodR = hexc('#4d2f18'); dark = hexc('#2b1a0e')
    floor_shadow(cv, U0, U1, V0, V1, 70)
    for (u, v) in [(U0 + 0.006, V0 + 0.006), (U1 - 0.02, V0 + 0.006), (U0 + 0.006, V1 - 0.02), (U1 - 0.02, V1 - 0.02)]:
        box(cv, u, u + 0.014, v, v + 0.014, 0, 3.9, dark, shade(dark, 1.25), dark, hi=False)
    box(cv, U0, U1, V0, V1, 3.9, 4.6, wood, woodL, woodR)
    # laci kecil dengan gagang
    face_u(cv, U1, V0 + 0.012, V1 - 0.012, 2.8, 3.8, shade(wood, 1.05), outline=OUTLINE)
    m = cv.px(U1, (V0 + V1) / 2, 3.3)
    cv.d.rectangle([m[0] - 1, m[1], m[0] + 1, m[1] + 1], fill=hexc('#c9a15c'))
    # globe di dudukan
    c = cv.px((U0 + U1) / 2, (V0 + V1) / 2, 4.6)
    cv.d.ellipse([c[0] - 5, c[1] - 2, c[0] + 5, c[1] + 1], fill=hexc('#2a2d33'), outline=OUTLINE)
    cv.d.rectangle([c[0] - 1, c[1] - 6, c[0], c[1] - 2], fill=hexc('#c9a15c'))
    cx, cy, r = c[0], c[1] - 14, 8
    cv.d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=hexc('#2f78b8'), outline=hexc('#16324d'))
    for (dx, dy, w, h) in [(-5, -5, 5, 4), (0, -1, 6, 5), (-4, 2, 4, 3), (3, -6, 3, 3), (2, 4, 3, 2)]:
        cv.d.ellipse([cx + dx, cy + dy, cx + dx + w, cy + dy + h], fill=hexc('#4aa35f'))
    cv.d.arc([cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1], 200, 340, fill=hexc('#c9a15c'))
    cv.d.arc([cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1], 20, 160, fill=hexc('#c9a15c'))
    cv.dot((cx - 4, cy - 4), hexc('#a8d4ff')); cv.dot((cx - 3, cy - 5), hexc('#a8d4ff'))
    return cv.save('globe-table.png')


# ---------------------------------------------------- vas bunga di sudut
def make_vase():
    import math
    rnd = random.Random(7)
    cu, cvv = 0.075, 0.075
    cv = Canvas(cu - 0.05, cu + 0.05, cvv - 0.05, cvv + 0.05, 20.0, pad=2.0)
    c = cv.px(cu, cvv, 0)
    d = cv.d
    X, Y = int(c[0]), int(c[1])
    d.ellipse([X - 13, Y - 4, X + 13, Y + 4], fill=(0, 0, 0, 80))
    # pedestal kayu bulat
    d.ellipse([X - 11, Y - 5, X + 11, Y + 2], fill=hexc('#4d2f18'), outline=OUTLINE)
    d.rectangle([X - 10, Y - 11, X + 10, Y - 3], fill=hexc('#66401f'), outline=OUTLINE)
    d.line([(X - 9, Y - 7), (X + 9, Y - 7)], fill=hexc('#8a5634'))
    d.ellipse([X - 11, Y - 14, X + 11, Y - 7], fill=hexc('#8a5634'), outline=OUTLINE)
    base = Y - 11
    H = 30
    def wid(h):  # profil vas: perut bulat, leher ramping, bibir melebar
        t = h / H
        if t < 0.08: return 6 + t * 30
        return 4 + 8.5 * math.sin(min(1, t * 1.25) * math.pi * 0.95) ** 0.8 * (1 - t * 0.45) + (2.5 if t > 0.94 else 0)
    blue = hexc('#3d6fb5'); blueD = hexc('#2b4f85')
    for h in range(H):
        w = int(round(wid(h)))
        y = base - h
        d.line([(X - w, y), (X + w, y)], fill=hexc('#eef3f9'))
        d.line([(X + w // 3, y), (X + w, y)], fill=hexc('#c1cfe0'))
        d.point((X - w, y), fill=blueD); d.point((X + w, y), fill=blueD)
        if h in (4, 5, 22, 23):
            d.line([(X - w + 1, y), (X + w - 1, y)], fill=blue)
        if 9 <= h <= 17:      # motif daun/bunga biru di perut
            if (h + (X)) % 4 == 0:
                for dx in (-5, -1, 3):
                    d.point((X + dx, y), fill=blue); d.point((X + dx + 1, y - 1), fill=blue)
    for h in range(H - 1, H + 1):
        pass
    d.line([(X - 6, base - H), (X + 6, base - H)], fill=blueD)
    d.ellipse([X - 6, base - H - 2, X + 6, base - H + 1], fill=hexc('#2a1d12'), outline=blueD)
    for h in (10, 11, 12):
        d.point((X - 6, base - h), fill=hexc('#ffffff'))
    mouth = (X, base - H)
    # tangkai hijau keluar dari mulut vas, kemudian bunga tepat di ujungnya
    tips = [(-14, -20, '#e8566b'), (-9, -30, '#f2b84a'), (-3, -38, '#ffffff'), (4, -34, '#e8566b'),
            (10, -27, '#c77dd9'), (15, -18, '#f2b84a'), (-6, -24, '#c77dd9'), (1, -28, '#f2b84a'), (8, -20, '#ffffff'), (-12, -10, '#ffffff'), (13, -9, '#e8566b')]
    green = hexc('#2f8f4e'); greenL = hexc('#4fbf74')
    for dx, dy, col in tips:
        d.line([mouth, (mouth[0] + dx, mouth[1] + dy)], fill=green)
    # daun
    for dx, dy in [(-7, -9), (6, -11), (-10, -17), (11, -15), (-2, -15), (3, -23), (-5, -29)]:
        ex, ey = mouth[0] + dx, mouth[1] + dy
        d.ellipse([ex - 2, ey - 1, ex + 2, ey + 1], fill=greenL if dx > 0 else green)
    for dx, dy, col in tips:
        ex, ey = mouth[0] + dx, mouth[1] + dy
        pc = hexc(col)
        for ox, oy in [(-2, 0), (2, 0), (0, -2), (0, 2), (-1, -1), (1, 1), (-1, 1), (1, -1)]:
            d.point((ex + ox, ey + oy), fill=pc)
        d.rectangle([ex - 1, ey - 1, ex, ey], fill=hexc('#7a4a14'))
        cv.dot((ex - 2, ey - 2), shade(pc, 0.8))
    return cv.save('flower-vase.png')


def main():
    manifest = {
        'sofa': make_sofa(),
        'coffeeTable': make_coffee_table(),
        'bookcase': make_bookcase(),
        'floorLamp': make_floor_lamp(),
        'desk': make_desk(),
        'coffeeStation': make_coffee_station(),
        'globeTable': make_globe_table(),
        'flowerVase': make_vase(),
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
