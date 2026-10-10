/**
 * jsonfile.js — baca file konfigurasi JSON buatan tangan dengan toleran.
 *
 * Menerima kesalahan yang umum terjadi saat mengetik di Notepad:
 * BOM di awal file, koma berlebih sebelum "}" atau "]", dan kurung kurawal
 * luar yang terlupa (isi file hanya `"botToken": "..."`).
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'fs'
import { dirname } from 'path'

/** Kembalikan objek hasil parse, atau null jika isinya bukan JSON objek yang valid. */
export function parseLenient(raw) {
  const text = String(raw ?? '').replace(/^﻿/, '').trim().replace(/,\s*([}\]])/g, '$1').replace(/,\s*$/, '')
  for (const candidate of [text, `{${text}}`]) {
    try {
      const value = JSON.parse(candidate)
      if (value && typeof value === 'object' && !Array.isArray(value)) return value
    } catch {
      // coba bentuk berikutnya
    }
  }
  return null
}

/**
 * Baca file JSON. Hasil: { exists, valid, data }.
 *  - file tidak ada      -> { exists: false, valid: true,  data: {} }
 *  - file ada dan valid  -> { exists: true,  valid: true,  data }
 *  - file ada tapi rusak -> { exists: true,  valid: false, data: {} }
 */
export function readLenient(path) {
  let raw
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    return { exists: false, valid: true, data: {} }
  }
  if (!raw.trim()) return { exists: true, valid: true, data: {} }
  const data = parseLenient(raw)
  return data ? { exists: true, valid: true, data } : { exists: true, valid: false, data: {} }
}

/** Tulis JSON secara atomik (tulis ke file sementara lalu ganti nama). */
export function writeJsonAtomic(path, value, mode) {
  mkdirSync(dirname(path), { recursive: true })
  const tmp = `${path}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', mode ? { mode } : undefined)
  renameSync(tmp, path)
}
