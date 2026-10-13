import React from 'react'
import { bossIso } from '../rooms'
import { BOSS_CHAIRS, BOSS_MEETING_TABLE, BossSprite } from '../bossSprites'

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

type Back = 'u-' | 'u+' | 'v-' | 'v+'

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

const CHAIR_KEY: Record<Back, string> = { 'v-': 'chairVMinus', 'u-': 'chairUMinus', 'v+': 'chairVPlus', 'u+': 'chairUPlus' }

/**
 * Kursi putar pixel-art. (u, v) = titik duduk agen; sandaran di sisi `back` (menjauhi meja).
 * part 'rear' = kaki + sandaran sisi jauh (di belakang agen), 'seat' = dudukan (menutupi paha),
 * 'all' = seluruh kursi (untuk kursi di sisi dekat penonton). leather = kursi kulit Bos.
 */
const Chair: React.FC<{ u: number; v: number; back: Back; part?: 'all' | 'rear' | 'seat'; leather?: boolean }> = ({
  u, v, back, part = 'all', leather = false,
}) => {
  const sprite = BOSS_CHAIRS[leather ? 'deskChair' : CHAIR_KEY[back]]?.[part]
  if (!sprite) return null
  const o = pt(u, v), z = pt(0, 0)
  return <SpriteImg s={sprite} dx={o.x - z.x} dy={o.y - z.y} />
}

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
  const rug = [pt(0.30, 0.34), pt(0.98, 0.34), pt(0.98, 0.98), pt(0.30, 0.98)]
  const rugIn = [pt(0.33, 0.37), pt(0.95, 0.37), pt(0.95, 0.95), pt(0.33, 0.95)]
  const rugIn2 = [pt(0.36, 0.40), pt(0.92, 0.40), pt(0.92, 0.92), pt(0.36, 0.92)]

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

      {/* ===== pojok kopi di atas kredensa (sisi dinding pintu) ===== */}
      <g>
        {/* mesin espresso */}
        <Box u0={0.04} u1={0.10} v0={0.66} v1={0.74} z={4.1} h={8.8} top="#c9ccd1" left="#8e939b" right="#6d727a" />
        <Box u0={0.04} u1={0.10} v0={0.66} v1={0.74} z={4.1} h={5.2} top="#2a2d33" left="#2a2d33" right="#1d2025" />
        <Flat u={0.075} v={0.70} du={0.02} dv={0.02} z={5.2} fill="#1b1d21" />
        <Cup u={0.075} v={0.70} z={4.1} />
        {/* nampan teko + cangkir */}
        <Flat u={0.08} v={0.84} du={0.045} dv={0.055} z={4.1} fill="#d8d3c4" />
        <g>
          {(() => {
            const k = up(pt(0.08, 0.84), 4.1)
            return (
              <>
                <ellipse cx={k.x} cy={k.y - 1.6} rx={1.5} ry={1.15} fill="#f2eee3" stroke={EDGE} strokeWidth={0.08} />
                <circle cx={k.x} cy={k.y - 2.9} r={0.35} fill="#c9a15c" />
              </>
            )
          })()}
          <Cup u={0.095} v={0.80} z={4.1} />
          <Cup u={0.07} v={0.885} z={4.1} />
        </g>
      </g>

      {/* ===== meja samping + globe (pojok kanan) ===== */}
      <Box u0={0.20} u1={0.30} v0={0.90} v1={0.99} z={3.6} h={4.4} top="#8a5634" left="#5f3a24" right="#4b2d1b" />
      <Box u0={0.205} u1={0.215} v0={0.905} v1={0.915} h={3.6} top="#4b2d1b" left="#4b2d1b" right="#3a2315" />
      <Box u0={0.285} u1={0.295} v0={0.905} v1={0.915} h={3.6} top="#4b2d1b" left="#4b2d1b" right="#3a2315" />
      <Box u0={0.285} u1={0.295} v0={0.965} v1={0.975} h={3.6} top="#4b2d1b" left="#4b2d1b" right="#3a2315" />
      <Box u0={0.205} u1={0.215} v0={0.965} v1={0.975} h={3.6} top="#4b2d1b" left="#4b2d1b" right="#3a2315" />
      {(() => {
        const g = up(pt(0.25, 0.945), 4.4)
        return (
          <g>
            <ellipse cx={g.x} cy={g.y} rx={1.8} ry={0.55} fill="#2a2d33" />
            <circle cx={g.x} cy={g.y - 3.4} r={3.0} fill="#2f78b8" stroke="#16324d" strokeWidth={0.12} />
            <path d={`M ${g.x - 1.6} ${g.y - 4.4} q 1.2 -1.2 2.4 0 q 0.4 1.4 -1 2 q -1.4 0 -1.4 -2 z`} fill="#4aa35f" />
            <path d={`M ${g.x + 0.4} ${g.y - 2.0} q 1.2 -0.4 1.8 0.8 q -0.6 1.2 -1.6 0.6 z`} fill="#4aa35f" />
            <path d={`M ${g.x - 3.2} ${g.y - 3.4} A 3.2 3.2 0 0 0 ${g.x + 3.2} ${g.y - 3.4}`} fill="none" stroke="#c9a15c" strokeWidth={0.28} />
          </g>
        )
      })()}

      {/* kursi abu-abu sisi jauh: kaki + sandaran di belakang agen (dudukannya di lapisan depan) */}
      <Chair u={0.805} v={0.57} back="v-" part="rear" />   {/* meet-1 */}
      <Chair u={0.626} v={0.57} back="v-" part="rear" />   {/* meet-2 */}

      {/* tanaman */}
      <Plant u={0.94} v={0.06} />
    </svg>
  )
}

/** Lapisan depan: meja kerja Bos + kursi sisi dekat (menutupi bagian bawah tubuh agen yang duduk). */
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
      {/* kursi kulit Bos (sandaran di belakang Bos, sisi jauh) */}
      {/* — digambar di lapisan belakang melalui desk-chair di bawah — */}

      {/* dudukan kursi sisi jauh, lalu meja (menutupi paha agen yang duduk di sisi jauh) */}
      <Chair u={0.805} v={0.57} back="v-" part="seat" />
      <Chair u={0.626} v={0.57} back="v-" part="seat" />
      <SpriteImg s={BOSS_MEETING_TABLE} />
      <Chair u={0.135} v={0.26} back="u-" part="seat" leather />

      {/* meja kerja Bos: papan atas + laci + panel samping */}
      <Box u0={0.19} u1={0.30} v0={0.34} v1={0.42} h={dz} top="#3d281a" left="#2f1f14" right="#26180f" />
      <Box u0={0.19} u1={0.30} v0={0.10} v1={0.125} h={dz} top="#3d281a" left="#2f1f14" right="#26180f" />
      <Box u0={0.17} u1={0.32} v0={0.095} v1={0.435} z={dz} h={topZ} top="#6b4630" left="#4d3220" right="#3d281a" />
      {/* gagang laci */}
      {(() => {
        const a = m(0.30, 0.355, 1.7), b = m(0.30, 0.405, 1.7)
        const c = m(0.30, 0.355, 0.9), d = m(0.30, 0.405, 0.9)
        return (
          <g stroke="#c9a15c" strokeWidth={0.22} strokeLinecap="round">
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <line x1={c.x} y1={c.y} x2={d.x} y2={d.y} />
          </g>
        )
      })()}

      {/* monitor lengkung */}
      {(() => {
        const s = sc
        const face = [s.top[0], s.top[1], s.top[2], s.top[3], s.bot[3], s.bot[2], s.bot[1], s.bot[0]]
        const inner = (k: number) => ({ x: s.top[0].x + (s.top[3].x - s.top[0].x) * k, y: s.top[0].y })
        void inner
        return (
          <g>
            {/* kaki */}
            <polygon points={poly([m(0.205, 0.236, topZ), m(0.225, 0.236, topZ), m(0.225, 0.254, topZ + 1.5), m(0.205, 0.254, topZ + 1.5)])} fill="#20242b" />
            <polygon points={poly(face)} fill="#141922" stroke="#05070a" strokeWidth={0.12} strokeLinejoin="round" />
            {[0, 1, 2].map(i => {
              const { a, b, c, d } = bar(i)
              const pad = (p: P, q: P, k: number): P => ({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k })
              // layar menyusut sedikit agar ada bingkai
              const A = pad(pad(a, d, 0.12), pad(b, c, 0.12), 0.04)
              const B = pad(pad(b, c, 0.12), pad(a, d, 0.12), 0.04)
              const C = pad(pad(b, c, 0.88), pad(a, d, 0.88), 0.04)
              const D = pad(pad(a, d, 0.88), pad(b, c, 0.88), 0.04)
              return <polygon key={i} points={poly([A, B, C, D])} fill={['#1d3a5c', '#1c4d58', '#27415f'][i]} />
            })}
            {/* grafik pada layar */}
            {[0.0, 0.2, 0.4, 0.6].map((k, i) => {
              const p = m(0.2275, 0.14 + k * 0.52 * 0.5 + 0.0, topZ + 2.3)
              const q = m(0.2275, 0.14 + k * 0.52 * 0.5, topZ + 2.3 + 1.2 + (i % 3) * 0.9)
              return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={['#44d19a', '#f2b84a', '#5ab0ff', '#44d19a'][i]} strokeWidth={0.5} strokeLinecap="round" />
            })}
            {(() => {
              const pts = [0.19, 0.24, 0.29, 0.34].map((v, i) => m(0.2275, v, topZ + 5.4 + [0.6, 1.4, 0.4, 1.9][i]))
              return <polyline points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#5ab0ff" strokeWidth={0.4} />
            })()}
          </g>
        )
      })()}

      {/* laptop terbuka, tumpukan kertas, piala, cangkir */}
      <Flat u={0.265} v={0.355} du={0.028} dv={0.036} z={topZ} fill="#7f858f" />
      <Box u0={0.285} u1={0.292} v0={0.325} v1={0.385} z={topZ} h={topZ + 3.4} top="#1d2230" left="#2b3b5e" right="#2b3b5e" />
      <Flat u={0.255} v={0.155} du={0.026} dv={0.03} z={topZ + 0.1} fill="#eceae1" />
      <Box u0={0.235} u1={0.28} v0={0.135} v1={0.18} z={topZ} h={topZ + 1.9} top="#f2efe5" left="#c9c2b0" right="#aaa392" />
      {(() => {
        const t = m(0.255, 0.115, topZ)
        return (
          <g>
            <rect x={t.x - 0.7} y={t.y - 1.6} width={1.4} height={1.6} fill="#c9a15c" stroke="#7a5c24" strokeWidth={0.1} />
            <path d={`M ${t.x - 1.1} ${t.y - 3.4} h 2.2 q 0 1.6 -1.1 1.8 q -1.1 -0.2 -1.1 -1.8 z`} fill="#e3b94f" stroke="#7a5c24" strokeWidth={0.1} />
            <circle cx={t.x} cy={t.y - 3.9} r={0.5} fill="#e3b94f" />
          </g>
        )
      })()}
      <Cup u={0.30} v={0.31} z={topZ} />
      <Flat u={0.285} v={0.24} du={0.014} dv={0.07} z={topZ + 0.05} fill="#20242b" />
    </svg>
  )
}

/** Kursi kulit di belakang meja Bos (lapisan belakang karakter, di bawah Bos yang duduk). */
export const BossRoomDeskChair: React.FC = () => (
  <svg className="boss-decor boss-decor-back" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 6 }}>
    <Chair u={0.135} v={0.26} back="u-" part="rear" leather />
  </svg>
)

/** Kursi sisi dekat penonton (sandaran menutupi punggung bawah agen yang duduk). */
export const BossRoomFrontChairs: React.FC = () => (
  <svg className="boss-decor boss-decor-front" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 41 }}>
    <Chair u={0.97} v={0.564} back="u+" />     {/* meet-boss (ujung meja) */}
    <Chair u={0.973} v={0.901} back="v+" />    {/* meet-3 */}
    <Chair u={0.725} v={0.883} back="v+" />    {/* meet-4 */}
  
  </svg>
)

/** Papan nama di pintu (menutupi tulisan "CLAUDE" pada gambar ruangan). */
export const BossRoomSign: React.FC = () => (
  <div className="boss-door-sign">RUANG BOS</div>
)
