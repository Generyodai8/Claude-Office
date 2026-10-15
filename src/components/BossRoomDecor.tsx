import React from 'react'
import { bossIso } from '../rooms'
import { BOSS_FURNITURE, BossSprite } from '../bossSprites'

/**
 * Dekorasi Ruang Bos Naufal: meja Bos dengan monitor lengkung, kursi kulit, meja rapat panjang
 * dengan kursi, pojok kopi, rak buku, globe, foto, lampu rel, karpet, dan tanaman.
 * Digambar sebagai SVG di atas cangkang ruangan yang sama dengan kantor utama.
 * Semua titik dihitung dari bossIso(u, v) agar cocok dengan posisi duduk/berdiri agen
 * (lihat BOSS_ROOM_SPOTS di rooms.ts: kursi digambar tepat di titik duduk).
 *   u: ke kiri-depan (sepanjang dinding jendela), v: ke kanan-depan (sepanjang dinding pintu).
 */

type P = { x: number; y: number }
const pt = (u: number, v: number): P => bossIso(u, v)
const poly = (pts: P[]) => pts.map(p => `${p.x},${p.y}`).join(' ')
const up = (p: P, h: number): P => ({ x: p.x, y: p.y - h })

const EDGE = 'rgba(0,0,0,0.38)'

interface BoxProps {
  u0: number; u1: number; v0: number; v1: number
  h: number            // tinggi puncak dari lantai
  z?: number           // tinggi dasar dari lantai (default 0)
  top: string; left: string; right: string
  stroke?: string
}

/** Balok isometrik: sisi atas + dua sisi depan. Dasar bisa diangkat (z) agar bisa berupa papan melayang. */
const Box: React.FC<BoxProps> = ({ u0, u1, v0, v1, h, z = 0, top, left, right, stroke = EDGE }) => {
  const A = up(pt(u0, v0), z)
  const B = up(pt(u1, v0), z)
  const C = up(pt(u1, v1), z)
  const D = up(pt(u0, v1), z)
  const t = h - z
  return (
    <g strokeWidth={0.1} stroke={stroke} strokeLinejoin="round">
      <polygon points={poly([B, C, up(C, t), up(B, t)])} fill={left} />
      <polygon points={poly([C, D, up(D, t), up(C, t)])} fill={right} />
      <polygon points={poly([up(A, t), up(B, t), up(C, t), up(D, t)])} fill={top} />
    </g>
  )
}

/** Bidang datar di atas permukaan (kertas, laptop, nampan) pada ketinggian z. */
const Flat: React.FC<{ u: number; v: number; du: number; dv: number; z: number; fill: string; stroke?: string }> = ({ u, v, du, dv, z, fill, stroke = EDGE }) => (
  <polygon
    points={poly([up(pt(u - du, v - dv), z), up(pt(u + du, v - dv), z), up(pt(u + du, v + dv), z), up(pt(u - du, v + dv), z)])}
    fill={fill} stroke={stroke} strokeWidth={0.08} strokeLinejoin="round"
  />
)

const Plant: React.FC<{ u: number; v: number; size?: number }> = ({ u, v, size = 5.2 }) => {
  const p = pt(u, v)
  return (
    <g>
      <ellipse cx={p.x} cy={p.y} rx={size * 0.45} ry={size * 0.16} fill="rgba(0,0,0,0.25)" />
      <polygon points={`${p.x - size * 0.28},${p.y - size * 0.05} ${p.x + size * 0.28},${p.y - size * 0.05} ${p.x + size * 0.22},${p.y - size * 0.5} ${p.x - size * 0.22},${p.y - size * 0.5}`} fill="#a8553a" />
      {[-0.32, -0.12, 0.1, 0.3].map((dx, i) => (
        <ellipse key={i} cx={p.x + dx * size} cy={p.y - size * (0.85 + (i % 2) * 0.25)} rx={size * 0.2} ry={size * 0.42}
          fill={i % 2 ? '#2f8f4e' : '#3aa65d'} transform={`rotate(${(i - 1.5) * 16} ${p.x + dx * size} ${p.y - size * 0.6})`} />
      ))}
    </g>
  )
}

/** Sprite pixel-art (dibuat oleh scripts/gen-boss-sprites.py) — diperbesar tanpa blur. */
const SpriteImg: React.FC<{ s: BossSprite; dx?: number; dy?: number }> = ({ s, dx = 0, dy = 0 }) => (
  <image
    href={s.src}
    x={s.x + dx}
    y={s.y + dy}
    width={s.w}
    height={s.h}
    preserveAspectRatio="none"
    style={{ imageRendering: 'pixelated' }}
  />
)

/** Papan datar menempel di dinding pintu (u = 0), dari v0..v1, ketinggian h0..h1. */
const WallR: React.FC<{ v0: number; v1: number; h0: number; h1: number; fill: string; stroke?: string; d?: number }> = ({ v0, v1, h0, h1, fill, stroke = EDGE, d = 0.004 }) => (
  <polygon
    points={poly([up(pt(d, v0), h0), up(pt(d, v1), h0), up(pt(d, v1), h1), up(pt(d, v0), h1)])}
    fill={fill} stroke={stroke} strokeWidth={0.1}
  />
)

const Books: React.FC = () => {
  // deretan buku di rak dinding kanan
  const colors = ['#b2453a', '#2f6fa8', '#d9a441', '#3c8f5a', '#7a4fa0', '#c9c2b0', '#a4553a', '#2f6fa8']
  return (
    <g>
      {colors.map((c, i) => {
        const v0 = 0.835 + i * 0.0165
        return <WallR key={i} v0={v0} v1={v0 + 0.0145} h0={17.2} h1={20.4 + (i % 3) * 0.7} fill={c} d={0.012} />
      })}
    </g>
  )
}

const Cup: React.FC<{ u: number; v: number; z: number }> = ({ u, v, z }) => {
  const p = up(pt(u, v), z)
  return (
    <g>
      <ellipse cx={p.x} cy={p.y} rx={0.7} ry={0.3} fill="#f1ede4" stroke={EDGE} strokeWidth={0.08} />
      <rect x={p.x - 0.6} y={p.y - 0.9} width={1.2} height={0.9} fill="#f1ede4" stroke={EDGE} strokeWidth={0.08} />
      <ellipse cx={p.x} cy={p.y - 0.9} rx={0.6} ry={0.22} fill="#5b3a24" />
    </g>
  )
}

/** Lapisan belakang: lampu rel, rak, pojok kopi, karpet, meja rapat, kursi, tanaman (di bawah karakter). */
export const BossRoomBack: React.FC = () => {
  // karpet besar di tengah ruangan (area berdiri saat rapat), dengan bingkai emas dan medali di tengah
  const rug = [pt(0.38, 0.19), pt(0.98, 0.19), pt(0.98, 0.97), pt(0.38, 0.97)]
  const rugIn = [pt(0.405, 0.215), pt(0.955, 0.215), pt(0.955, 0.945), pt(0.405, 0.945)]
  const rugIn2 = [pt(0.43, 0.24), pt(0.93, 0.24), pt(0.93, 0.92), pt(0.43, 0.92)]
  const cu = 0.68, cv = 0.58
  const medal = [pt(cu - 0.17, cv), pt(cu, cv - 0.20), pt(cu + 0.17, cv), pt(cu, cv + 0.20)]
  const medalIn = [pt(cu - 0.11, cv), pt(cu, cv - 0.13), pt(cu + 0.11, cv), pt(cu, cv + 0.13)]

  // lampu rel di dinding pintu (u kecil, tinggi dekat langit-langit)
  const railH = 31
  const spots = [0.40, 0.55, 0.70, 0.85]

  return (
    <svg className="boss-decor boss-decor-back" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="bossCone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe2a8" stopOpacity="0.34" />
          <stop offset="1" stopColor="#ffe2a8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* karpet merah dengan bingkai emas */}
      <polygon points={poly(rug)} fill="#6e2430" />
      <polygon points={poly(rugIn)} fill="#8f3441" stroke="#d9b36c" strokeWidth={0.18} />
      <polygon points={poly(rugIn2)} fill="#7d2a35" stroke="#c9a15c" strokeWidth={0.08} />
      <polygon points={poly(medal)} fill="#6e2430" stroke="#d9b36c" strokeWidth={0.16} />
      <polygon points={poly(medalIn)} fill="#8f3441" stroke="#c9a15c" strokeWidth={0.08} />
      <polygon points={poly(rugIn2)} fill="#7d2a35" stroke="#c9a15c" strokeWidth={0.08} />

      {/* ===== dinding pintu: rak buku, foto, lampu rel ===== */}
      {/* rak dinding */}
      <WallR v0={0.82} v1={0.985} h0={16.2} h1={17.2} fill="#6a4328" d={0.012} />
      <Books />
      {/* foto berbingkai */}
      <WallR v0={0.83} v1={0.885} h0={9.5} h1={14.2} fill="#3a2a1d" />
      <WallR v0={0.836} v1={0.879} h0={10.1} h1={13.6} fill="#8aa0b8" d={0.006} />
      <WallR v0={0.91} v1={0.97} h0={9.0} h1={13.6} fill="#3a2a1d" />
      <WallR v0={0.916} v1={0.964} h0={9.6} h1={13.0} fill="#c2a98a" d={0.006} />

      {/* rel lampu + sorot */}
      <polygon
        points={poly([up(pt(0.04, 0.34), railH), up(pt(0.04, 0.98), railH), up(pt(0.04, 0.98), railH - 0.7), up(pt(0.04, 0.34), railH - 0.7)])}
        fill="#16181c"
      />
      {spots.map(v => {
        const s = up(pt(0.05, v), railH - 0.7)
        const f0 = pt(0.34, v + 0.05), f1 = pt(0.34, v + 0.17)
        return (
          <g key={v}>
            <polygon points={`${s.x},${s.y} ${f0.x},${f0.y} ${f1.x},${f1.y}`} fill="url(#bossCone)" />
            <rect x={s.x - 0.5} y={s.y} width={1} height={1.6} rx={0.3} fill="#0f1114" stroke="#000" strokeWidth={0.06} />
            <ellipse cx={s.x} cy={s.y + 1.7} rx={0.55} ry={0.22} fill="#ffeab8" />
          </g>
        )
      })}

      {/* ===== pojok kopi (lemari marmer + mesin espresso) dan meja globe ===== */}
      <SpriteImg s={BOSS_FURNITURE.coffeeStation} />
      <SpriteImg s={BOSS_FURNITURE.globeTable} />

      {/* ===== sudut santai di dinding jendela: rak buku, sofa, meja kopi, lampu lantai ===== */}
      <SpriteImg s={BOSS_FURNITURE.bookcase} />
      <SpriteImg s={BOSS_FURNITURE.sofa} />
      <SpriteImg s={BOSS_FURNITURE.coffeeTable} />
      <SpriteImg s={BOSS_FURNITURE.floorLamp} dx={pt(0.945, 0.075).x - pt(0, 0).x} dy={pt(0.945, 0.075).y - pt(0, 0).y} />

      {/* tanaman */}
      <Plant u={0.985} v={0.32} size={5.6} />
    </svg>
  )
}

/** Lapisan depan: meja kerja Bos (menutupi kaki Bos saat berdiri di belakangnya). */
export const BossRoomFront: React.FC = () => {
  const dz = 2.4        // tinggi dudukan meja
  const topZ = 3.1      // permukaan meja
  const m = (u: number, v: number, z: number) => up(pt(u, v), z)
  const screen = (v0: number, v1: number, u: number, bulge: number, z0: number, z1: number) => {
    // layar lengkung: tiga ruas sepanjang v dengan lengkungan ke arah +u
    const vs = [v0, v0 + (v1 - v0) / 3, v0 + 2 * (v1 - v0) / 3, v1]
    const us = [u + bulge, u, u, u + bulge]
    const top = vs.map((v, i) => m(us[i], v, z1))
    const bot = vs.map((v, i) => m(us[i], v, z0))
    return { top, bot }
  }
  const sc = screen(0.115, 0.375, 0.215, 0.012, topZ + 1.4, topZ + 8.4)
  const bar = (i: number) => {
    // dua baris grafik batang mini pada layar
    const a = sc.top[i], b = sc.top[i + 1], c = sc.bot[i + 1], d = sc.bot[i]
    return { a, b, c, d }
  }

  return (
    <svg className="boss-decor boss-decor-front" viewBox="0 0 100 100" preserveAspectRatio="none">
      {/* meja kerja Bos lengkap: monitor lengkung, keyboard, laptop, piala, lampu */}
      <SpriteImg s={BOSS_FURNITURE.desk} />
    </svg>
  )
}

/** Papan nama di pintu (menutupi tulisan "CLAUDE" pada gambar ruangan). */
export const BossRoomSign: React.FC = () => (
  <div className="boss-door-sign">RUANG BOS</div>
)
