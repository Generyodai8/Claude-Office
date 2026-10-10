/**
 * memory.js — ingatan jangka panjang tiap agen.
 *
 * Setiap agen punya berkas catatan sendiri, dan ada satu berkas "shared" yang dibaca semua agen
 * (misalnya preferensi Bos). Disimpan di ~/.agent-office/memory/<agen>.json.
 * Catatan dibatasi jumlah dan panjangnya supaya prompt tidak membengkak.
 */

import { homedir } from 'os'
import { join } from 'path'
import { readLenient, writeJsonAtomic } from './jsonfile.js'

const MEMORY_DIR = join(homedir(), '.agent-office', 'memory')
const MAX_NOTES = 40
const MAX_NOTE_LEN = 300

function fileFor(key) {
  return join(MEMORY_DIR, `${String(key).replace(/[^a-z0-9_-]/gi, '')}.json`)
}

function normalise(text) {
  return String(text ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function loadNotes(key) {
  const { data } = readLenient(fileFor(key))
  const notes = Array.isArray(data.notes) ? data.notes : []
  return notes
    .filter(n => n && typeof n.text === 'string' && n.text.trim())
    .map(n => ({ text: n.text.slice(0, MAX_NOTE_LEN), at: Number(n.at) || 0 }))
}

/** Tambah catatan; mengabaikan duplikat. Mengembalikan true jika tersimpan. */
export function addNote(key, text) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE_LEN)
  if (clean.length < 3) return false
  const notes = loadNotes(key)
  if (notes.some(n => normalise(n.text) === normalise(clean))) return false
  notes.push({ text: clean, at: Date.now() })
  const kept = notes.slice(-MAX_NOTES)
  writeJsonAtomic(fileFor(key), { notes: kept })
  return true
}

/** Teks siap pakai untuk prompt: catatan bersama + catatan pribadi agen. */
export function memoryForPrompt(key) {
  const shared = loadNotes('shared')
  const own = loadNotes(key)
  const lines = []
  if (shared.length) lines.push('Yang diketahui seluruh tim:', ...shared.map(n => `- ${n.text}`))
  if (own.length) lines.push('Catatan pribadimu:', ...own.map(n => `- ${n.text}`))
  return lines.join('\n')
}
