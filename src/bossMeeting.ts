import type { BossSprite } from './bossSprites'

// Gambar meja rapat dari gambar contoh Anda (tidak dibuat oleh scripts/gen-boss-sprites.py, jadi tidak ikut tertimpa saat generator dijalankan ulang).
// Meja rapat + 5 kursi, dipotong dari gambar contoh (scripts tidak dipakai; PNG sudah jadi). Posisi dalam persen panggung.
export const BOSS_MEETING_SET: BossSprite = {"src": "/sprites/boss/boss-meeting-set.png", "x": 29.812, "y": 56.044, "w": 35.32, "h": 33.591}
// Salinan bagian meja saja (lapisan depan) agar agen yang duduk di sisi jauh tertutup meja.
export const BOSS_MEETING_TABLE_FRONT: BossSprite = {"src": "/sprites/boss/boss-meeting-table-front.png", "x": 29.812, "y": 56.044, "w": 35.32, "h": 33.591}
// Meja rapat saja (dari gambar contoh, tanpa kursi bawaannya).
export const BOSS_MEETING_TABLE: BossSprite = {"src": "/sprites/boss/boss-meeting-table.png", "x": 29.812, "y": 56.044, "w": 35.32, "h": 33.591}
