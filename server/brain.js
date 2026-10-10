/**
 * brain.js — "otak" para agen: menghubungkan Agent Office ke model AI.
 *
 * Konfigurasi di ~/.agent-office/brain.json (Windows: C:\Users\<nama>\.agent-office\brain.json),
 * paling mudah dibuat dengan:  npm run setup:brain
 *
 *   {
 *     "provider": "anthropic",            // anthropic | openai | cli | auto
 *     "apiKey": "sk-ant-...",
 *     "model": "claude-sonnet-5-5",       // wajib untuk provider "openai"
 *     "baseUrl": "https://api.anthropic.com",   // opsional
 *     "image": {                          // opsional — untuk agen foto (Amar)
 *       "apiKey": "...", "baseUrl": "https://api.openai.com/v1",
 *       "model": "gpt-image-1", "size": "1024x1024"
 *     }
 *   }
 *
 * Provider:
 *   anthropic — Anthropic Messages API (butuh API key dari console.anthropic.com)
 *   openai    — API kompatibel OpenAI (OpenAI, Groq, OpenRouter, Gemini via endpoint OpenAI,
 *               Ollama lokal, dll.). Isi baseUrl, apiKey, dan model.
 *   cli       — memakai perintah `claude -p` dari Claude Code yang sudah login di komputer ini
 *   auto      — (bawaan) anthropic jika ada API key Anthropic, kalau tidak, cli jika ada
 *
 * Variabel lingkungan (menimpa file): AGENT_OFFICE_PROVIDER, ANTHROPIC_API_KEY, OPENAI_API_KEY,
 * AGENT_OFFICE_MODEL, AGENT_OFFICE_BASE_URL, IMAGE_API_KEY.
 *
 * Kunci API tidak pernah ditulis ke log dan tidak pernah dikirim ke frontend.
 */

import { existsSync } from 'fs'
import { homedir } from 'os'
import { join, delimiter } from 'path'
import { spawn } from 'child_process'
import { readLenient } from './jsonfile.js'

export const BRAIN_FILE = join(homedir(), '.agent-office', 'brain.json')

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5-5'
const REQUEST_TIMEOUT_MS = 120_000
const CLI_TIMEOUT_MS = 180_000

export class BrainError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'BrainError'
    this.code = code
  }
}

function trimSlash(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

/** Cari perintah `claude` di PATH. */
export function findClaudeCli() {
  const names = process.platform === 'win32' ? ['claude.cmd', 'claude.exe', 'claude.bat'] : ['claude']
  for (const dir of String(process.env.PATH || '').split(delimiter)) {
    if (!dir) continue
    for (const name of names) {
      if (existsSync(join(dir, name))) return join(dir, name)
    }
  }
  return null
}

function loadImageConfig(file, env) {
  const img = file.image && typeof file.image === 'object' ? file.image : {}
  const baseUrl = trimSlash(img.baseUrl || 'https://api.openai.com/v1')
  // Kunci OPENAI_API_KEY hanya dipakai kalau tujuan gambarnya memang OpenAI.
  const fallbackKey = baseUrl.includes('api.openai.com') ? env.OPENAI_API_KEY : ''
  const apiKey = String(env.IMAGE_API_KEY || img.apiKey || fallbackKey || '').trim()
  return {
    configured: Boolean(apiKey),
    apiKey,
    baseUrl,
    model: String(img.model || 'gpt-image-1').trim(),
    size: String(img.size || '1024x1024').trim(),
  }
}

export function loadBrainConfig(env = process.env) {
  const read = readLenient(BRAIN_FILE)
  const file = read.data

  let provider = String(env.AGENT_OFFICE_PROVIDER || file.provider || 'auto').trim().toLowerCase()
  const anthropicKey = String(env.ANTHROPIC_API_KEY || (!file.provider || file.provider === 'anthropic' || file.provider === 'auto' ? file.apiKey : '') || '').trim()

  if (provider === 'auto') {
    if (anthropicKey) provider = 'anthropic'
    else if (file.useCli !== false && findClaudeCli()) provider = 'cli'
    else provider = 'none'
  }
  if (provider === 'claude' || provider === 'claude-cli') provider = 'cli'
  if (provider === 'openai-compatible' || provider === 'groq' || provider === 'openrouter' || provider === 'gemini' || provider === 'ollama') provider = 'openai'

  let apiKey = ''
  let baseUrl = ''
  let model = String(env.AGENT_OFFICE_MODEL || file.model || '').trim()

  if (provider === 'anthropic') {
    apiKey = anthropicKey
    baseUrl = trimSlash(env.AGENT_OFFICE_BASE_URL || file.baseUrl || 'https://api.anthropic.com')
    model ||= DEFAULT_ANTHROPIC_MODEL
  } else if (provider === 'openai') {
    apiKey = String(env.OPENAI_API_KEY || file.apiKey || '').trim()
    baseUrl = trimSlash(env.AGENT_OFFICE_BASE_URL || file.baseUrl || 'https://api.openai.com/v1')
  }

  let problem = ''
  if (read.exists && !read.valid) problem = 'file-invalid'
  else if (provider === 'none') problem = 'no-brain'
  else if (provider === 'anthropic' && !apiKey) problem = 'no-key'
  else if (provider === 'openai' && !model) problem = 'no-model'
  else if (provider === 'openai' && !apiKey && !/localhost|127\.0\.0\.1/.test(baseUrl)) problem = 'no-key'
  else if (provider === 'cli' && !findClaudeCli()) problem = 'no-cli'
  else if (!['anthropic', 'openai', 'cli'].includes(provider)) problem = 'bad-provider'

  const configured = !problem
  return {
    provider: configured || provider !== 'none' ? provider : 'none',
    apiKey,
    baseUrl,
    model,
    maxTokens: Number(file.maxTokens) > 0 ? Number(file.maxTokens) : 4096,
    configured,
    problem,
    image: loadImageConfig(file, env),
  }
}

/** Penjelasan konfigurasi otak yang belum beres, dalam bahasa Indonesia. */
export function describeBrainProblem(problem) {
  switch (problem) {
    case 'file-invalid':
      return `File ${BRAIN_FILE} tidak valid — pastikan diawali { dan diakhiri }, atau jalankan ulang: npm run setup:brain`
    case 'no-key':
      return 'API key belum diisi — jalankan: npm run setup:brain'
    case 'no-model':
      return 'Nama model belum diisi untuk provider "openai" — jalankan: npm run setup:brain'
    case 'no-cli':
      return 'Perintah "claude" tidak ditemukan di PATH — pasang Claude Code atau pakai API key lewat: npm run setup:brain'
    case 'bad-provider':
      return 'Nilai "provider" di brain.json tidak dikenal (pilih: anthropic, openai, cli, atau auto)'
    default:
      return 'Otak agen belum terhubung ke model AI — jalankan di folder proyek: npm run setup:brain'
  }
}

function scrub(text, secret) {
  const s = String(text ?? '')
  return secret ? s.split(secret).join('***') : s
}

function errorFromHttp(status, bodyText, cfg) {
  let detail = ''
  try {
    const j = JSON.parse(bodyText)
    detail = j?.error?.message || j?.error?.type || j?.message || (typeof j?.error === 'string' ? j.error : '')
  } catch {
    detail = String(bodyText || '').slice(0, 200)
  }
  detail = scrub(detail, cfg.apiKey).slice(0, 300)
  if (status === 401 || status === 403) return new BrainError('auth', `Ditolak (${status}) — API key salah atau tidak punya akses${detail ? `: ${detail}` : ''}`)
  if (status === 404) return new BrainError('not-found', `Tidak ditemukan (404) — periksa nama model dan baseUrl${detail ? `: ${detail}` : ''}`)
  if (status === 429) return new BrainError('rate', `Terlalu banyak permintaan atau kuota habis (429)${detail ? `: ${detail}` : ''}`)
  if (status >= 500) return new BrainError('server', `Server model sedang bermasalah (${status})${detail ? `: ${detail}` : ''}`)
  return new BrainError('bad-request', `Permintaan ditolak (${status})${detail ? `: ${detail}` : ''}`)
}

async function postJson(url, headers, body, cfg) {
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new BrainError('timeout', 'Model terlalu lama menjawab (waktu habis)')
    }
    const code = err?.cause?.code || err?.cause?.errors?.[0]?.code || ''
    throw new BrainError('network', `Tidak bisa terhubung ke ${scrub(new URL(url).host, cfg.apiKey)}${code ? ` (${code})` : ''} — cek koneksi internet`)
  }
  const text = await res.text()
  if (!res.ok) throw errorFromHttp(res.status, text, cfg)
  try {
    return JSON.parse(text)
  } catch {
    throw new BrainError('bad-response', 'Balasan model bukan JSON yang valid')
  }
}

async function thinkAnthropic(cfg, { system, user, maxTokens }) {
  const base = cfg.baseUrl.endsWith('/v1') ? cfg.baseUrl : `${cfg.baseUrl}/v1`
  const data = await postJson(
    `${base}/messages`,
    { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' },
    { model: cfg.model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] },
    cfg,
  )
  const text = (Array.isArray(data?.content) ? data.content : [])
    .filter(b => b?.type === 'text')
    .map(b => b.text)
    .join('')
  return text
}

async function thinkOpenAI(cfg, { system, user, maxTokens }) {
  const url = `${cfg.baseUrl}/chat/completions`
  const headers = cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}
  const messages = [{ role: 'system', content: system }, { role: 'user', content: user }]
  let data
  try {
    data = await postJson(url, headers, { model: cfg.model, messages, max_tokens: maxTokens }, cfg)
  } catch (err) {
    // Sebagian model OpenAI terbaru memakai max_completion_tokens, bukan max_tokens.
    if (err instanceof BrainError && err.code === 'bad-request' && /max_completion_tokens/.test(err.message)) {
      data = await postJson(url, headers, { model: cfg.model, messages, max_completion_tokens: maxTokens }, cfg)
    } else {
      throw err
    }
  }
  const content = data?.choices?.[0]?.message?.content
  if (Array.isArray(content)) return content.map(p => p?.text ?? '').join('')
  return typeof content === 'string' ? content : ''
}

function thinkCli({ system, user }) {
  return new Promise((resolve, reject) => {
    const prompt = `${system}\n\n---\n\n${user}`
    let child
    try {
      child = spawn('claude', ['-p', '--max-turns', '1'], { shell: process.platform === 'win32', windowsHide: true })
    } catch (err) {
      return reject(new BrainError('cli-failed', `Gagal menjalankan claude: ${err.message}`))
    }
    let out = ''
    let errText = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new BrainError('timeout', 'Claude CLI terlalu lama menjawab (waktu habis)'))
    }, CLI_TIMEOUT_MS)
    child.stdout.on('data', c => (out += c))
    child.stderr.on('data', c => (errText += c))
    child.on('error', err => {
      clearTimeout(timer)
      reject(new BrainError('cli-failed', `Gagal menjalankan claude: ${err.message}`))
    })
    child.on('close', code => {
      clearTimeout(timer)
      if (code !== 0) {
        return reject(new BrainError('cli-failed', `Claude CLI gagal (kode ${code})${errText ? `: ${errText.trim().slice(0, 200)}` : ''}`))
      }
      resolve(out)
    })
    child.stdin.on('error', () => {})
    child.stdin.end(prompt)
  })
}

/**
 * Minta model menjawab. `system` = instruksi/persona, `user` = isi pesan.
 * Mengembalikan { text, provider, model }. Melempar BrainError jika gagal.
 */
export async function think({ system, user, maxTokens } = {}, cfg = loadBrainConfig()) {
  if (!cfg.configured) throw new BrainError(cfg.problem || 'no-brain', describeBrainProblem(cfg.problem))
  const args = { system: String(system ?? ''), user: String(user ?? ''), maxTokens: maxTokens || cfg.maxTokens }

  const run = () => {
    if (cfg.provider === 'anthropic') return thinkAnthropic(cfg, args)
    if (cfg.provider === 'openai') return thinkOpenAI(cfg, args)
    return thinkCli(args)
  }

  let text
  try {
    text = await run()
  } catch (err) {
    // Satu kali coba ulang untuk gangguan sementara.
    if (err instanceof BrainError && ['rate', 'server', 'network'].includes(err.code)) {
      await new Promise(r => setTimeout(r, 1500))
      text = await run()
    } else {
      throw err
    }
  }
  text = String(text ?? '').trim()
  if (!text) throw new BrainError('empty', 'Model mengirim jawaban kosong')
  return { text, provider: cfg.provider, model: cfg.model }
}

/** Ringkasan status tanpa membocorkan kunci. */
export function brainStatus(cfg = loadBrainConfig()) {
  return {
    configured: cfg.configured,
    provider: cfg.provider,
    model: cfg.provider === 'cli' ? 'claude (CLI)' : cfg.model,
    problem: cfg.problem,
    image: { configured: cfg.image.configured, model: cfg.image.model },
  }
}
