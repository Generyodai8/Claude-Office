import React from 'react'
import { bossIso } from '../rooms'

/**
 * Dekorasi Ruang Bos Naufal: karpet, meja rapat, meja kerja Bos, tanaman, papan tulis.
 * Digambar sebagai SVG di atas cangkang ruangan yang sama dengan kantor utama.
 * Semua titik dihitung dari bossIso(u, v) agar cocok dengan posisi duduk/berdiri agen.
 */

type P = { x: number; y: number }
const pt = (u: number, v: number): P => bossIso(u, v)
const poly = (pts: P[]) => pts.map(p => `${p.x},${p.y}`).join(' ')
const up = (p: P, h: number): P => ({ x: p.x, y: p.y - h })

interface BoxProps {
  u0: number; u1: number; v0: number; v1: number
  h: number
  top: string; left: string; right: string
  stroke?: string
}

/** Balok isometrik: sisi atas + dua sisi depan (kiri-depan dan kanan-depan). */
const Box: React.FC<BoxProps> = ({ u0, u1, v0, v1, h, top, left, right, stroke = 'rgba(0,0,0,0.35)' }) => {
  const A = pt(u0, v0)   // belakang
  const B = pt(u1, v0)   // kiri
  const C = pt(u1, v1)   // depan
  const D = pt(u0, v1)   // kanan
  return (
    <g strokeWidth={0.12} stroke={stroke} strokeLinejoin="round">
      <polygon points={poly([B, C, up(C, h), up(B, h)])} fill={left} />
      <polygon points={poly([C, D, up(D, h), up(C, h)])} fill={right} />
      <polygon points={poly([up(A, h), up(B, h), up(C, h), up(D, h)])} fill={top} />
    </g>
  )
}

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

/** Lapisan belakang: karpet, meja rapat, tanaman (di bawah karakter). */
export const BossRoomBack: React.FC = () => {
  const rug = [pt(0.34, 0.34), pt(0.96, 0.34), pt(0.96, 0.96), pt(0.34, 0.96)]
  const rugIn = [pt(0.37, 0.37), pt(0.93, 0.37), pt(0.93, 0.93), pt(0.37, 0.93)]
  return (
    <svg className="boss-decor boss-decor-back" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polygon points={poly(rug)} fill="#7d2a35" />
      <polygon points={poly(rugIn)} fill="#8f3441" stroke="#d9b36c" strokeWidth={0.15} />
      {/* meja rapat */}
      <Box u0={0.52} u1={0.80} v0={0.52} v1={0.80} h={2.4} top="#9a6340" left="#74482d" right="#5f3a24" />
      {/* tanaman di sudut */}
      <Plant u={0.10} v={0.90} />
      <Plant u={0.95} v={0.12} size={4.6} />
    </svg>
  )
}

/** Lapisan depan: meja kerja Bos (menutupi kaki Bos saat berdiri di belakangnya). */
export const BossRoomFront: React.FC = () => {
  const m = pt(0.19, 0.22)
  return (
    <svg className="boss-decor boss-decor-front" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Box u0={0.18} u1={0.31} v0={0.10} v1={0.42} h={2.6} top="#6b4630" left="#4d3220" right="#3d281a" />
      {/* monitor & papan nama di atas meja */}
      <g>
        <polygon points={`${m.x - 2.2},${m.y - 6.7} ${m.x + 1.4},${m.y - 5.1} ${m.x + 1.4},${m.y - 2.7} ${m.x - 2.2},${m.y - 4.3}`} fill="#1f2630" stroke="#0b0e12" strokeWidth={0.12} />
        <polygon points={`${m.x - 1.8},${m.y - 6.1} ${m.x + 1.0},${m.y - 4.9} ${m.x + 1.0},${m.y - 3.3} ${m.x - 1.8},${m.y - 4.5}`} fill="#6fb7ff" opacity={0.9} />
      </g>
    </svg>
  )
}

/** Papan nama di pintu (menutupi tulisan "CLAUDE" pada gambar ruangan). */
export const BossRoomSign: React.FC = () => (
  <div className="boss-door-sign">RUANG BOS</div>
)
