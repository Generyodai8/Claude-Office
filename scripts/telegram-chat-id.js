/**
 * telegram-chat-id.js — cari chat ID Telegram Anda.
 *
 * Cara pakai:
 *   1. Buat bot lewat @BotFather di Telegram, salin token-nya ke
 *      ~/.agent-office/telegram.json  ->  { "botToken": "..." }
 *   2. Kirim pesan apa saja ke bot Anda (cari nama bot-nya, tekan Start).
 *   3. Jalankan:  npm run telegram:chat-id
 *   4. Salin angka chat ID yang muncul ke "chatId" di telegram.json.
 *
 * Token dibaca dari file/env dan tidak pernah dicetak.
 */

import { loadTelegramConfig, CONFIG_FILE } from '../server/telegram.js'

const API_BASE = (process.env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/+$/, '')
const { botToken } = loadTelegramConfig()

if (!botToken) {
  console.error(`Token bot belum diisi. Buat file ${CONFIG_FILE} berisi:`)
  console.error('  { "botToken": "TOKEN_DARI_BOTFATHER" }')
  process.exit(1)
}

let data
try {
  const res = await fetch(`${API_BASE}/bot${botToken}/getUpdates`, { signal: AbortSignal.timeout(10_000) })
  data = await res.json()
  if (!res.ok || !data.ok) {
    console.error(`Telegram menolak permintaan: ${data?.description ?? `HTTP ${res.status}`}`)
    console.error('Periksa kembali botToken di telegram.json.')
    process.exit(1)
  }
} catch (err) {
  const code = err?.cause?.code || err?.cause?.errors?.[0]?.code || err?.message
  console.error(`Tidak bisa terhubung ke Telegram (${code}) — cek koneksi internet.`)
  process.exit(1)
}

const chats = new Map()
for (const update of data.result ?? []) {
  const chat = update.message?.chat ?? update.edited_message?.chat ?? update.channel_post?.chat
  if (chat) chats.set(chat.id, chat)
}

if (chats.size === 0) {
  console.log('Belum ada pesan yang masuk ke bot.')
  console.log('Buka Telegram, cari bot Anda, tekan Start / kirim pesan apa saja, lalu jalankan perintah ini lagi.')
  process.exit(0)
}

console.log('Chat yang ditemukan:')
for (const [id, chat] of chats) {
  const who = chat.username ? `@${chat.username}` : [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.title || '(tanpa nama)'
  console.log(`  chatId: ${id}   (${chat.type}, ${who})`)
}
console.log(`\nSalin chatId milik Anda ke ${CONFIG_FILE}`)
