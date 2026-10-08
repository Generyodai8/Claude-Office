/**
 * telegram.js — kirim hasil kerja agen ke Telegram lewat Bot API.
 *
 * Konfigurasi (urutan prioritas):
 *   1. Variabel lingkungan TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID
 *   2. File ~/.agent-office/telegram.json  (di Windows: C:\Users\<nama>\.agent-office\telegram.json)
 *        {
 *          "botToken": "123456789:AAAA...",   // dari @BotFather
 *          "chatId": "123456789",             // ID chat Anda (lihat: npm run telegram:chat-id)
 *          "enabled": true,                   // opsional, false = matikan sementara
 *          "sendStarted": false               // opsional, true = kabari juga saat agen mulai
 *        }
 *
 * Token TIDAK pernah ditulis ke log atau dikirim ke frontend. Konfigurasi dibaca
 * ulang setiap kali mengirim, jadi mengubah file tidak perlu restart server.
 */

import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export const CONFIG_FILE = join(homedir(), '.agent-office', 'telegram.json')

// Bisa diganti lewat env (dipakai untuk pengujian dengan server tiruan).
const API_BASE = (process.env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/+$/, '')

const MAX_CHUNK = 4000   // batas Telegram per pesan adalah 4096 karakter
const MAX_CHUNKS = 3     // hasil yang sangat panjang dipotong setelah 3 pesan
const REQUEST_TIMEOUT_MS = 10_000

export function loadTelegramConfig() {
  let file = {}
  try {
    file = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
  } catch {
    // file belum ada atau rusak — dianggap belum dikonfigurasi
  }
  const botToken = String(process.env.TELEGRAM_BOT_TOKEN || file.botToken || '').trim()
  const chatId = String(process.env.TELEGRAM_CHAT_ID || file.chatId || '').trim()
  const enabled = file.enabled !== false
  const sendStarted = file.sendStarted === true
  return { botToken, chatId, enabled, sendStarted, configured: Boolean(botToken && chatId && enabled) }
}

/** Pecah teks panjang jadi potongan ≤ size, sebisa mungkin di batas baris/spasi. */
export function splitMessage(text, size = MAX_CHUNK) {
  const chunks = []
  let rest = String(text ?? '')
  while (rest.length > size) {
    let cut = rest.lastIndexOf('\n', size)
    if (cut < size * 0.5) cut = rest.lastIndexOf(' ', size)
    if (cut < size * 0.5) cut = size
    // jangan memotong di tengah pasangan surrogate (emoji)
    const code = rest.charCodeAt(cut - 1)
    if (code >= 0xd800 && code <= 0xdbff) cut -= 1
    chunks.push(rest.slice(0, cut).trimEnd())
    rest = rest.slice(cut).trimStart()
  }
  if (rest) chunks.push(rest)
  return chunks
}

function scrub(message, token) {
  const text = String(message ?? '')
  return token ? text.split(token).join('***') : text
}

/**
 * Kirim teks ke chat yang dikonfigurasi. Tidak pernah melempar error;
 * hasilnya { ok: true } atau { ok: false, reason }.
 */
export async function sendTelegram(text, { config = loadTelegramConfig() } = {}) {
  if (!config.configured) return { ok: false, reason: 'not-configured' }

  const chunks = splitMessage(text)
  if (chunks.length === 0) return { ok: false, reason: 'empty' }
  const shown = chunks.slice(0, MAX_CHUNKS)
  if (chunks.length > MAX_CHUNKS) {
    shown[MAX_CHUNKS - 1] += '\n\n… (hasil terlalu panjang, sisanya dipotong)'
  }

  try {
    for (const part of shown) {
      const res = await fetch(`${API_BASE}/bot${config.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: part,
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (!res.ok) {
        let description = ''
        try { description = (await res.json()).description ?? '' } catch {}
        return { ok: false, reason: scrub(`HTTP ${res.status}${description ? ` — ${description}` : ''}`, config.botToken) }
      }
    }
    return { ok: true, parts: shown.length }
  } catch (err) {
    const code = err?.cause?.code || err?.cause?.errors?.[0]?.code || ''
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError'
    const reason = timedOut
      ? 'waktu habis saat menghubungi Telegram'
      : `tidak bisa terhubung ke Telegram${code ? ` (${code})` : ''} — cek koneksi internet`
    return { ok: false, reason: scrub(reason, config.botToken) }
  }
}

function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return m > 0 ? `${m} menit ${s} detik` : `${s} detik`
}

/** Pesan Telegram saat agen selesai. `agent` boleh null (server baru restart). */
export function formatAgentDone(agent, resultText) {
  const name = agent?.name || 'Agen'
  const lines = [`✅ ${name} selesai`]
  if (agent?.task) lines.push(`📋 Tugas: ${agent.task}`)
  if (agent?.spawnedAt) lines.push(`⏱️ Durasi: ${formatDuration(Date.now() - agent.spawnedAt)}`)

  const result = String(resultText ?? '').trim()
  lines.push('')
  lines.push(result && result !== 'selesai' ? result : '(agen tidak mengirim ringkasan hasil)')
  return lines.join('\n')
}

/** Pesan Telegram saat agen mulai (hanya jika sendStarted aktif). */
export function formatAgentStarted(agent) {
  const name = agent?.name || 'Agen'
  return `🚀 ${name} mulai bekerja${agent?.task ? `\n📋 ${agent.task}` : ''}`
}
