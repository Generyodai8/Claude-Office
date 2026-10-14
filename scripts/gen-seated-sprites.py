#!/usr/bin/env python3
"""
Membuat versi "duduk" dari sprite karakter berdiri: bagian pinggang ke bawah dipendekkan
(paha menghadap ke depan terlihat memendek) sehingga karakter terlihat duduk di kursi.
Hasil: public/sprites/characters/<nama>-<arah>-seated.png
Jalankan ulang bila sprite karakter berubah:  python3 scripts/gen-seated-sprites.py
"""
import glob, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIRS = ('front-left', 'front-right', 'rear-left', 'rear-right')
HIP = 0.575      # pinggul pada ~57,5% tinggi karakter (dari atas)
LEG_SQUASH = 0.52  # tinggi kaki saat duduk dibanding berdiri


def seated(im):
    im = im.convert('RGBA')
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    h = y1 - y0
    hip = y0 + int(h * HIP)
    upper = im.crop((0, 0, im.width, hip))
    legs = im.crop((0, hip, im.width, y1))
    nh = max(1, int(legs.height * LEG_SQUASH))
    # bagian paha (separuh atas kaki) dipendekkan lebih kuat daripada betis agar terlihat menekuk
    thigh_h = legs.height // 2
    thigh = legs.crop((0, 0, im.width, thigh_h)).resize((im.width, max(1, int(nh * 0.38))), Image.NEAREST)
    shin = legs.crop((0, thigh_h, im.width, legs.height)).resize((im.width, max(1, nh - thigh.height)), Image.NEAREST)
    out = Image.new('RGBA', (im.width, hip + thigh.height + shin.height), (0, 0, 0, 0))
    out.paste(upper, (0, 0))
    out.paste(thigh, (0, hip))
    out.paste(shin, (0, hip + thigh.height))
    # sejajarkan dasar (kaki) ke dasar kanvas asli supaya titik pijak tidak berubah
    canvas = Image.new('RGBA', im.size, (0, 0, 0, 0))
    canvas.paste(out, (0, y1 - out.height + (im.height - y1) * 0 - 0 + 0))
    return canvas


def main():
    n = 0
    for path in sorted(glob.glob(os.path.join(ROOT, 'public', 'sprites', '**', '*.png'), recursive=True)):
        name = os.path.basename(path)
        if name.endswith('-seated.png') or not any(name.endswith(f'-{d}.png') for d in DIRS):
            continue
        seated(Image.open(path)).save(path[:-4] + '-seated.png')
        n += 1
    print('sprite duduk dibuat:', n)


if __name__ == '__main__':
    main()
