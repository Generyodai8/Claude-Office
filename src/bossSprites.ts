// DIBUAT OTOMATIS oleh scripts/gen-boss-sprites.py — jangan diedit tangan.
// Posisi (x, y) dan ukuran (w, h) dalam persen panggung. Kursi relatif terhadap titik duduk (0,0).
export interface BossSprite { src: string; x: number; y: number; w: number; h: number }
export const BOSS_TABLE: BossSprite = {"src": "/sprites/boss/boss-table.png", "x": 34.987, "y": 54.966, "w": 32.2, "h": 29.464}
export const BOSS_CHAIRS: Record<string, Record<string, BossSprite>> = {
  "chairVMinus": {
    "rear": {
      "src": "/sprites/boss/chair-chairVMinus-rear.png",
      "x": 33.851,
      "y": 19.604,
      "w": 18.8,
      "h": 23.036
    },
    "seat": {
      "src": "/sprites/boss/chair-chairVMinus-seat.png",
      "x": 33.851,
      "y": 19.604,
      "w": 18.8,
      "h": 23.036
    }
  },
  "chairUMinus": {
    "rear": {
      "src": "/sprites/boss/chair-chairUMinus-rear.png",
      "x": 33.851,
      "y": 19.604,
      "w": 18.8,
      "h": 23.036
    },
    "seat": {
      "src": "/sprites/boss/chair-chairUMinus-seat.png",
      "x": 33.851,
      "y": 19.604,
      "w": 18.8,
      "h": 23.036
    }
  },
  "chairVPlus": {
    "all": {
      "src": "/sprites/boss/chair-chairVPlus-all.png",
      "x": 33.851,
      "y": 23.204,
      "w": 18.8,
      "h": 19.286
    }
  },
  "chairUPlus": {
    "all": {
      "src": "/sprites/boss/chair-chairUPlus-all.png",
      "x": 33.851,
      "y": 23.204,
      "w": 18.8,
      "h": 19.286
    }
  },
  "deskChair": {
    "rear": {
      "src": "/sprites/boss/chair-deskChair-rear.png",
      "x": 33.298,
      "y": 16.66,
      "w": 20.0,
      "h": 26.25
    },
    "seat": {
      "src": "/sprites/boss/chair-deskChair-seat.png",
      "x": 33.298,
      "y": 16.66,
      "w": 20.0,
      "h": 26.25
    }
  }
}
