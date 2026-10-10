/**
 * outputs.js — menyimpan hasil kerja agen ke ~/.agent-office/outputs/<tanggal>/
 */

import { homedir } from 'os'
import { join, extname, basename } from 'path'
import { mkdirSync, writeFileSync, existsSync } from 'fs'

export const OUTPUT_DIR = join(homedir(), '.agent-office', 'outputs')

function today() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Simpan data (Buffer/string); nama dibuat unik. Mengembalikan path lengkap. */
export function saveOutput(filename, data) {
  const dir = join(OUTPUT_DIR, today())
  mkdirSync(dir, { recursive: true })
  const ext = extname(filename)
  const stem = basename(filename, ext)
  let target = join(dir, filename)
  for (let n = 2; existsSync(target); n++) target = join(dir, `${stem}-${n}${ext}`)
  writeFileSync(target, data)
  return target
}
