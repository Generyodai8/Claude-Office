/**
 * install-hooks.js — pasang hook Agent Office ke ~/.claude/settings.json
 * (lintas platform: Windows, macOS, Linux — tidak butuh Python).
 *
 *   npm run install-hooks            pasang hook + salin agen SEO Writer & Docs Writer
 *   npm run install-hooks -- --no-agents   hanya hook
 *
 * Aman dijalankan berulang kali: tidak membuat entri ganda, tidak menghapus hook
 * lain, dan membuat cadangan settings.json sebelum mengubahnya.
 *
 * Catatan Windows: hook dijalankan dengan `bash` dan `curl` (sudah ikut terpasang
 * bersama Git for Windows) serta Python 3 di PATH (python.org).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from 'fs'
import { homedir } from 'os'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TRACKER = join(ROOT, 'hooks', 'agent-tracker.sh').replace(/\\/g, '/')
const CLAUDE_DIR = join(homedir(), '.claude')
const SETTINGS = join(CLAUDE_DIR, 'settings.json')
const COMMAND = `bash "${TRACKER}"`
const EVENTS = ['PreToolUse', 'PostToolUse']
const withAgents = !process.argv.includes('--no-agents')

mkdirSync(CLAUDE_DIR, { recursive: true })

let settings = {}
if (existsSync(SETTINGS)) {
  const raw = readFileSync(SETTINGS, 'utf8').replace(/^﻿/, '')
  const stamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 17)
  const backup = `${SETTINGS}.backup.${stamp}`
  copyFileSync(SETTINGS, backup)
  console.log(`[ok] Cadangan: ${backup}`)
  if (raw.trim()) {
    try {
      settings = JSON.parse(raw)
    } catch {
      console.error(`[error] ${SETTINGS} bukan JSON yang valid — tidak diubah. Perbaiki dulu (cadangan sudah dibuat).`)
      process.exit(1)
    }
  }
}
if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
  console.error(`[error] Isi ${SETTINGS} bukan objek JSON — tidak diubah.`)
  process.exit(1)
}

settings.hooks ??= {}
let changed = false
for (const event of EVENTS) {
  const groups = (settings.hooks[event] ??= [])
  const present = groups.some(g => (g?.hooks ?? []).some(h => String(h?.command ?? '').includes('agent-tracker.sh')))
  if (present) {
    console.log(`[info] ${event}: sudah terpasang`)
    continue
  }
  groups.push({ matcher: '', hooks: [{ type: 'command', command: COMMAND }] })
  changed = true
  console.log(`[ok] ${event}: hook ditambahkan`)
}
if (changed) writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n')

if (withAgents) {
  const src = join(ROOT, 'agents')
  const dest = join(CLAUDE_DIR, 'agents')
  mkdirSync(dest, { recursive: true })
  for (const file of existsSync(src) ? readdirSync(src).filter(f => f.endsWith('.md')) : []) {
    const target = join(dest, file)
    if (existsSync(target)) {
      console.log(`[info] Agen ${file}: sudah ada, tidak ditimpa`)
    } else {
      copyFileSync(join(src, file), target)
      console.log(`[ok] Agen ${file}: disalin ke ${dest}`)
    }
  }
}

console.log('\nSelesai. Tutup lalu buka ulang Claude Code agar hook aktif.')
console.log('Pastikan server Agent Office berjalan (npm run dev:all) dan Python 3 ada di PATH.')
