#!/usr/bin/env python3
"""
Membuat sprite pixel-art untuk Ruang Bos (meja rapat + kursi) dengan geometri isometrik yang sama
dengan bossIso() di src/rooms.ts, lalu menulis PNG ke public/sprites/boss/ dan manifest ke
src/bossSprites.ts.

Jalankan ulang jika ingin mengubah desain:   python3 scripts/gen-boss-sprites.py
"""
import json, os, random, zlib
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'sprites', 'boss')
os.makedirs(OUT, exist_ok=True)

# --- geometri lantai (harus sama dengan rooms.ts) ---
BX, BY = 43.3, 35.2
LX, LY = -40.0, 28.4
RX, RY = 52.1, 29.0
ASPECT = 4800 / 3584        # lebar/tinggi panggung
C = 5.0                     # piksel sprite per 1% lebar panggung


def proj(u, v, z=0.0):
    """(u, v, z) -> koordinat panggung dalam persen."""
    return (BX + u * LX + v * RX, BY + u * LY + v * RY - z)


class Canvas:
    def __init__(self, ulo, uhi, vlo, vhi, zmax, pad=1.2):
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
        # posisi/ukuran dalam persen panggung
        return {
            'src': f'/sprites/boss/{name}',
            'x': round(self.x0, 3),
            'y': round(self.y0, 3),
            'w': round(self.w / C, 3),
            'h': round(self.h / C * ASPECT, 3),
        }


def hexc(s, a=255):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


def shade(c, f):
    return (max(0, min(255, int(c[0] * f))), max(0, min(255, int(c[1] * f))), max(0, min(255, int(c[2] * f))), c[3])


OUTLINE = hexc('#17100c')


def box(cv, u0, u1, v0, v1, z0, z1, top, left, right, outline=OUTLINE, hi=True):
    """Balok: sisi atas (terang), sisi +u (sedang), sisi +v (gelap), outline 1px, sorotan tepi atas."""
    A = cv.px(u0, v0, z1); B = cv.px(u1, v0, z1); Cc = cv.px(u1, v1, z1); D = cv.px(u0, v1, z1)
    B0 = cv.px(u1, v0, z0); C0 = cv.px(u1, v1, z0); D0 = cv.px(u0, v1, z0)
    cv.poly([B, Cc, C0, B0], left, outline)
    cv.poly([Cc, D, D0, C0], right, outline)
    cv.poly([A, B, Cc, D], top, outline)
    if hi:
        light = shade(top, 1.28)
        cv.line(A, B, light)
        cv.line(A, D, light)


def grain_top(cv, u0, u1, v0, v1, z, base, rnd, along='v', step=0.018):
    """Serat kayu di permukaan: garis tipis gelap/terang + beberapa noda."""
    dark = shade(base, 0.82); light = shade(base, 1.14)
    if along == 'v':
        n = int((u1 - u0) / step)
        for i in range(1, n):
            u = u0 + i * step
            a, b = cv.px(u, v0 + 0.004, z), cv.px(u, v1 - 0.004, z)
            cv.line(a, b, dark if i % 2 else light)
    else:
        n = int((v1 - v0) / step)
        for i in range(1, n):
            v = v0 + i * step
            a, b = cv.px(u0 + 0.004, v, z), cv.px(u1 - 0.004, v, z)
            cv.line(a, b, dark if i % 2 else light)
    for _ in range(26):
        u = rnd.uniform(u0 + 0.01, u1 - 0.01); v = rnd.uniform(v0 + 0.01, v1 - 0.01)
        cv.dot(cv.px(u, v, z), shade(base, rnd.choice([0.7, 0.78, 1.2])))


# ---------------------------------------------------------------- meja rapat
def make_table():
    rnd = random.Random(7)
    U0, U1, V0, V1 = 0.54, 0.79, 0.47, 0.85
    cv = Canvas(U0, U1, V0, V1, 8.0)
    wood = hexc('#9a6038'); woodL = hexc('#74462a'); woodR = hexc('#5a351f')
    dark = hexc('#2f1e14')
    # bayangan di lantai
    sh = [cv.px(U0 + 0.01, V0 + 0.015), cv.px(U1 + 0.02, V0 + 0.015), cv.px(U1 + 0.02, V1 + 0.02), cv.px(U0 + 0.01, V1 + 0.02)]
    cv.poly(sh, (0, 0, 0, 70))
    # dua kaki panel + balok bawah
    box(cv, 0.575, 0.60, 0.50, 0.82, 0, 2.2, dark, dark, shade(dark, 0.8), hi=False)
    box(cv, 0.725, 0.75, 0.50, 0.82, 0, 2.2, dark, shade(dark, 1.15), shade(dark, 0.75), hi=False)
    box(cv, 0.575, 0.75, 0.62, 0.70, 0.7, 1.5, shade(dark, 1.3), shade(dark, 1.1), dark, hi=False)
    # papan meja
    box(cv, U0, U1, V0, V1, 2.2, 3.4, wood, woodL, woodR)
    grain_top(cv, U0, U1, V0, V1, 3.4, wood, rnd)
    # lis emas tipis di tepi depan
    cv.line(cv.px(U1, V0, 3.05), cv.px(U1, V1, 3.05), hexc('#c9a15c'))
    z = 3.4
    # kertas / notulen
    for (u, v, du, dv, col) in [(0.60, 0.56, 0.026, 0.034, '#efece2'), (0.60, 0.755, 0.026, 0.034, '#efece2'),
                                (0.735, 0.56, 0.026, 0.034, '#efece2'), (0.735, 0.78, 0.028, 0.036, '#d4cbb4')]:
        box(cv, u - du, u + du, v - dv, v + dv, z, z + 0.12, hexc(col), shade(hexc(col), 0.85), shade(hexc(col), 0.7), outline=hexc('#6b5a45'), hi=False)
        for k in range(3):
            vv = v - dv * 0.6 + k * dv * 0.55
            cv.line(cv.px(u - du * 0.6, vv, z + 0.13), cv.px(u + du * 0.6, vv, z + 0.13), hexc('#9aa3b0'))
    # laptop tertutup
    box(cv, 0.645, 0.685, 0.60, 0.65, z, z + 0.5, hexc('#7f858f'), hexc('#5d626b'), hexc('#464a52'))
    cv.dot(cv.px(0.665, 0.625, z + 0.52), hexc('#d8dde6'))
    # tumpukan buku
    box(cv, 0.655, 0.695, 0.665, 0.74, z, z + 0.7, hexc('#b2453a'), hexc('#8a3329'), hexc('#6d281f'))
    box(cv, 0.658, 0.69, 0.67, 0.735, z + 0.7, z + 1.35, hexc('#2f6fa8'), hexc('#245585'), hexc('#1b4167'))
    box(cv, 0.662, 0.688, 0.675, 0.73, z + 1.35, z + 1.9, hexc('#d9a441'), hexc('#a87d2e'), hexc('#876222'))
    # tempat pena
    box(cv, 0.675, 0.70, 0.775, 0.80, z, z + 1.1, hexc('#3a3f48'), hexc('#2b2f36'), hexc('#1f2227'))
    for (dv, col) in [(-0.006, '#d24b3f'), (0.0, '#3a8ad6'), (0.007, '#e8c64a')]:
        a = cv.px(0.6875, 0.7875 + dv, z + 1.1); b = cv.px(0.6875, 0.7875 + dv * 2.2, z + 2.3)
        cv.line(a, b, hexc(col))
    # dua cangkir kopi
    for (u, v) in [(0.565, 0.66), (0.765, 0.64)]:
        p = cv.px(u, v, z)
        cv.d.rectangle([p[0] - 2, p[1] - 3, p[0] + 1, p[1]], fill=hexc('#f1ede4'), outline=OUTLINE)
        cv.d.rectangle([p[0] - 1, p[1] - 3, p[0], p[1] - 3], fill=hexc('#5b3a24'))
        cv.dot((p[0] + 2, p[1] - 2), hexc('#f1ede4'))
    return cv.save('boss-table.png')


# --------------------------------------------------------------------- kursi
def chair_parts(back, style, name_prefix, parts, tall_override=None):
    """
    Kursi putar pixel-art. back = sisi sandaran ('u-', 'u+', 'v-', 'v+').
    parts = daftar dari 'rear', 'seat', 'all'. Mengembalikan dict nama -> manifest.
    """
    palettes = {
        'grey':    dict(seat='#7d8391', side='#585d6a', dark='#2a2d35', metal='#9aa0ab'),
        'leather': dict(seat='#a1613a', side='#6e3f23', dark='#241812', metal='#c9a15c'),
    }
    pal = palettes[style]
    seat_c = hexc(pal['seat']); side_c = hexc(pal['side']); dark_c = hexc(pal['dark']); metal_c = hexc(pal['metal'])
    big = style == 'leather'
    su, sv = (0.040, 0.046) if big else (0.034, 0.040)
    zS = 2.4 if not big else 2.6
    tall = 8.2 if not big else 10.8
    if tall_override:
        tall = tall_override
    t = 0.014

    res = {}
    for part in parts:
        rnd = random.Random(zlib.crc32(f"{back}{style}{part}".encode()))
        cv = Canvas(-su - 0.05, su + 0.05, -sv - 0.05, sv + 0.05, tall + 1.0, pad=1.4)
        # kanvas dihitung di sekitar (0,0) lalu di-offset lewat u0/v0 saat disimpan
        res[part] = (cv, rnd)

    def draw(part, cv, rnd, cu, cvv):
        far = back in ('u-', 'v-')
        # --- komponen ---
        def legs():
            cx, cy = cv.px(cu, cvv, 0)
            cv.d.ellipse([cx - 7, cy - 2, cx + 7, cy + 2], fill=(0, 0, 0, 80))
            for dx, dy in [(-7, 1), (7, 0), (-4, -2), (4, 2), (0, 3)]:
                cv.line((cx, cy - 1), (cx + dx, cy + dy), dark_c)
                cv.d.rectangle([cx + dx - 1, cy + dy, cx + dx, cy + dy + 1], fill=hexc('#0e0f12'))
            # tiang gas
            cv.d.rectangle([cx - 1, cy - zS * C / ASPECT, cx, cy - 1], fill=metal_c, outline=None)
            cv.line((cx - 1, cy - 1), (cx - 1, cy - zS * C / ASPECT), shade(metal_c, 0.7))

        def seat():
            box(cv, cu - su, cu + su, cvv - sv, cvv + sv, zS - 1.3, zS, seat_c, side_c, shade(side_c, 0.72))
            # jahitan / kilau pada bantalan
            a = cv.px(cu - su * 0.4, cvv - sv * 0.6, zS); b = cv.px(cu - su * 0.4, cvv + sv * 0.6, zS)
            cv.line(a, b, shade(seat_c, 1.25))
            for _ in range(10):
                cv.dot(cv.px(rnd.uniform(cu - su, cu + su), rnd.uniform(cvv - sv, cvv + sv), zS),
                       shade(seat_c, rnd.choice([0.85, 1.15])))
            # sandaran tangan (dua sisi tegak lurus sandaran)
            if back in ('u-', 'u+'):
                for sgn in (-1, 1):
                    vv = cvv + sgn * (sv + 0.004)
                    box(cv, cu - su * 0.8, cu + su * 0.8, vv - 0.007, vv + 0.007, zS + 0.3, zS + 1.0, dark_c, shade(dark_c, 1.25), dark_c, hi=False)
            else:
                for sgn in (-1, 1):
                    uu = cu + sgn * (su + 0.004)
                    box(cv, uu - 0.007, uu + 0.007, cvv - sv * 0.8, cvv + sv * 0.8, zS + 0.3, zS + 1.0, dark_c, shade(dark_c, 1.25), dark_c, hi=False)

        def backrest():
            if back == 'u-':
                b = (cu - su - t, cu - su, cvv - sv, cvv + sv)
            elif back == 'u+':
                b = (cu + su, cu + su + t, cvv - sv, cvv + sv)
            elif back == 'v-':
                b = (cu - su, cu + su, cvv - sv - t, cvv - sv)
            else:
                b = (cu - su, cu + su, cvv + sv, cvv + sv + t)
            box(cv, b[0], b[1], b[2], b[3], zS + 0.2, tall, seat_c, side_c, shade(side_c, 0.8))
            # sandaran kepala (lebih terang) + lipatan
            hu0, hu1, hv0, hv1 = b
            box(cv, hu0, hu1, hv0, hv1, tall - 2.4, tall, shade(seat_c, 1.12), shade(side_c, 1.08), shade(side_c, 0.85), hi=True)
            mid = (cv.px((hu0 + hu1) / 2, hv0, tall - 3.0), cv.px((hu0 + hu1) / 2, hv1, tall - 3.0))
            cv.line(mid[0], mid[1], shade(seat_c, 0.7))

        if part == 'rear':
            legs()
            if far:
                backrest()
        elif part == 'seat':
            seat()
            if not far:
                backrest()
        else:
            legs()
            if far:
                backrest()
            seat()
            if not far:
                backrest()

    out = {}
    for part, (cv, rnd) in res.items():
        draw(part, cv, rnd, 0.0, 0.0)
        out[part] = cv.save(f'{name_prefix}-{part}.png')
    return out


def main():
    manifest = {}
    manifest['table'] = make_table()
    # kursi: (kunci, sisi sandaran, gaya, bagian)
    specs = [
        ('chairVMinus', 'v-', 'grey', ['rear', 'seat']),     # kepala meja (meet-boss)
        ('chairUMinus', 'u-', 'grey', ['rear', 'seat']),     # meet-1
        ('chairVPlus',  'v+', 'grey', ['all'], 4.6),         # sisi dekat: sandaran dipendekkan agar agen terlihat
        ('chairUPlus',  'u+', 'grey', ['all'], 4.6),         # ujung meja
        ('deskChair',   'u-', 'leather', ['rear', 'seat']),  # kursi kulit Bos
    ]
    for spec in specs:
        key, back, style, parts = spec[:4]
        tall = spec[4] if len(spec) > 4 else None
        prefix = f'chair-{key}'
        manifest[key] = chair_parts(back, style, prefix, parts, tall)

    # tulis manifest TypeScript. Posisi kursi relatif terhadap titik duduk (0,0) -> ditambahkan offset (u, v) saat dipakai.
    ts = [
        '// DIBUAT OTOMATIS oleh scripts/gen-boss-sprites.py — jangan diedit tangan.',
        '// Posisi (x, y) dan ukuran (w, h) dalam persen panggung. Kursi relatif terhadap titik duduk (0,0).',
        'export interface BossSprite { src: string; x: number; y: number; w: number; h: number }',
        f'export const BOSS_TABLE: BossSprite = {json.dumps(manifest["table"])}',
        'export const BOSS_CHAIRS: Record<string, Record<string, BossSprite>> = ' + json.dumps({k: v for k, v in manifest.items() if k != 'table'}, indent=2),
        '',
    ]
    with open(os.path.join(ROOT, 'src', 'bossSprites.ts'), 'w') as f:
        f.write('\n'.join(ts))
    print('ok', {k: (v if k == 'table' else list(v)) for k, v in manifest.items()})


if __name__ == '__main__':
    main()
