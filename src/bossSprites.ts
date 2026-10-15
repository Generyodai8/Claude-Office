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
  },
  "desk": {
    "src": "/sprites/boss/boss-desk.png",
    "x": 33.589,
    "y": 25.238,
    "w": 27.2,
    "h": 34.286
  },
  "coffeeStation": {
    "src": "/sprites/boss/coffee-station.png",
    "x": 63.258,
    "y": 36.475,
    "w": 32.8,
    "h": 35.893
  },
  "globeTable": {
    "src": "/sprites/boss/globe-table.png",
    "x": 74.73,
    "y": 53.997,
    "w": 11.0,
    "h": 21.964
  },
  "flowerVase": {
    "src": "/sprites/boss/flower-vase.png",
    "x": 37.602,
    "y": 14.635,
    "w": 13.2,
    "h": 30.804
  }
}
