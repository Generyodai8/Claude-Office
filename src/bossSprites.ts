// DIBUAT OTOMATIS oleh scripts/gen-boss-sprites.py — jangan diedit tangan.
// Posisi (x, y) dan ukuran (w, h) dalam persen panggung (lampu lantai: relatif terhadap (u,v)=(0,0)).
export interface BossSprite { src: string; x: number; y: number; w: number; h: number }
export const BOSS_FURNITURE: Record<string, BossSprite> = {
  "sofa": {
    "src": "/sprites/boss/sofa.png",
    "x": 7.463,
    "y": 40.37,
    "w": 26.0,
    "h": 27.589
  },
  "coffeeTable": {
    "src": "/sprites/boss/coffee-table.png",
    "x": 21.101,
    "y": 50.575,
    "w": 16.0,
    "h": 18.75
  },
  "bookcase": {
    "src": "/sprites/boss/bookcase.png",
    "x": 22.525,
    "y": 29.23,
    "w": 11.8,
    "h": 24.643
  },
  "floorLamp": {
    "src": "/sprites/boss/floor-lamp.png",
    "x": 37.337,
    "y": 15.278,
    "w": 12.0,
    "h": 25.714
  }
}
