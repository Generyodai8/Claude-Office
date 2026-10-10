#!/usr/bin/env node
/**
 * setup-brain.js — pengaturan "otak" agen secara interaktif (Windows / macOS / Linux).
 *
 *   npm run setup:brain
 *
 * Kunci API diketik langsung di jendela terminal ini (tidak tampil di layar) dan disimpan
 * hanya di ~/.agent-office/brain.json di komputer Anda. Jangan kirim kunci API ke siapa pun.
 */

import readline from 'readline'
import { BRAIN_FILE, loadBrainConfig, think, findClaudeCli } from '../server/brain.js'
import { readLenient, writeJsonAtomic } from '../server/jsonfile.js'

let muted = false
const rl = readline.createInterface({
  input: process.stdin,
  output: new (await import('stream')).Writable({
    write(chunk, _enc, cb) { if (!muted) process.stdout.write(chunk); cb() },
  }),
  terminal: Boolean(process.stdin.isTTY),
})

// Antrean baris: jawaban dibaca satu per satu, baik diketik langsung maupun dialirkan dari berkas.
const lines = []
let waiter = null
let closed = false
rl.on('line', l => { if (waiter) { const w = waiter; waiter = null; w(l) } else lines.push(l) })
rl.on('close', () => { closed = true; if (waiter) { const w = waiter; waiter = null; w('') } })

const ask = (q, { secret = false } = {}) => new Promise(resolve => {
  process.stdout.write(q)
  muted = secret
  const done = answer => {
    muted = false
    if (secret || !process.stdin.isTTY) process.stdout.write('\n')
    resolve(answer.trim())
  }
  if (lines.length) done(lines.shift())
  else if (closed) done('')
  else waiter = done
})

const PRESETS = {
  '1': { label: 'Groq (ada paket gratis)', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  '2': { label: 'OpenRouter (ada model gratis)', baseUrl: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  '3': { label: 'Google Gemini (ada paket gratis)', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash' },
  '4': { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  '5': { label: 'Ollama di komputer sendiri (tanpa kunci)', baseUrl: 'http://localhost:11434/v1', model: 'llama3.1' },
}

console.log('\n=== Pengaturan otak agen kantor ===\n')
console.log('Pilih sumber kecerdasan agen:')
console.log('  1) API key Anthropic (Claude) — dari console.anthropic.com, berbayar')
console.log('  2) Layanan lain yang kompatibel OpenAI (Groq, OpenRouter, Gemini, OpenAI, Ollama) — beberapa punya paket gratis')
console.log(`  3) Claude Code di komputer ini (perintah "claude")${findClaudeCli() ? '' : ' — belum terpasang'}`)
const choice = await ask('\nPilihan (1/2/3): ')

const existing = readLenient(BRAIN_FILE).data
const config = { ...existing }
delete config.useCli

if (choice === '1') {
  config.provider = 'anthropic'
  const key = await ask('Tempel API key Anthropic (tidak akan tampil di layar): ', { secret: true })
  if (!key) { console.log('Dibatalkan: kunci kosong.'); process.exit(1) }
  config.apiKey = key
  const model = await ask('Nama model [Enter = claude-sonnet-5-5]: ')
  config.model = model || 'claude-sonnet-5-5'
  delete config.baseUrl
} else if (choice === '2') {
  console.log('\nPilih layanan:')
  for (const [k, v] of Object.entries(PRESETS)) console.log(`  ${k}) ${v.label}`)
  console.log('  6) Lainnya (isi sendiri alamat API)')
  const p = await ask('\nPilihan (1-6): ')
  let preset = PRESETS[p]
  if (!preset) {
    const baseUrl = await ask('Alamat API (contoh https://api.example.com/v1): ')
    preset = { baseUrl: baseUrl.replace(/\/+$/, ''), model: '' }
  }
  config.provider = 'openai'
  config.baseUrl = preset.baseUrl
  const model = await ask(`Nama model [Enter = ${preset.model || 'wajib diisi'}]: `)
  config.model = model || preset.model
  if (!config.model) { console.log('Dibatalkan: nama model wajib diisi.'); process.exit(1) }
  if (p === '5') {
    delete config.apiKey
  } else {
    const key = await ask('Tempel API key (tidak akan tampil di layar): ', { secret: true })
    if (!key) { console.log('Dibatalkan: kunci kosong.'); process.exit(1) }
    config.apiKey = key
  }
} else if (choice === '3') {
  if (!findClaudeCli()) {
    console.log('\nPerintah "claude" tidak ditemukan. Pasang Claude Code dulu atau pilih opsi lain.')
    process.exit(1)
  }
  config.provider = 'cli'
  delete config.apiKey
  delete config.model
  delete config.baseUrl
} else {
  console.log('Pilihan tidak dikenal.')
  process.exit(1)
}

console.log('\nAgen foto (Amar) bisa membuat gambar sungguhan bila Anda punya API key generator gambar (OpenAI, model gpt-image-1).')
const wantImg = (await ask('Hubungkan generator gambar sekarang? (y/N): ')).toLowerCase()
if (wantImg === 'y' || wantImg === 'ya') {
  const key = await ask('Tempel API key OpenAI untuk gambar (tidak akan tampil di layar): ', { secret: true })
  if (key) config.image = { ...(existing.image || {}), apiKey: key, baseUrl: 'https://api.openai.com/v1', model: 'gpt-image-1', size: '1024x1024' }
}
rl.close()

writeJsonAtomic(BRAIN_FILE, config, 0o600)
console.log(`\nTersimpan di ${BRAIN_FILE}`)

console.log('Mencoba menghubungi model...')
try {
  const cfg = loadBrainConfig()
  const r = await think({ system: 'Balas hanya dengan satu kata: siap', user: 'tes koneksi', maxTokens: 20 }, cfg)
  console.log(`✅ Berhasil! ${r.provider}${r.model ? ` / ${r.model}` : ''} menjawab: ${r.text.slice(0, 60)}`)
  console.log('\nSelanjutnya: restart server (Ctrl+C lalu npm run dev:all) dan buka http://localhost:3333/ (tanpa ?sim).')
} catch (err) {
  console.log(`❌ Gagal: ${err.message}`)
  console.log('Periksa kunci/nama model lalu jalankan lagi: npm run setup:brain')
  process.exit(1)
}
