/**
 * images.js — membuat gambar lewat API gambar bergaya OpenAI (POST {baseUrl}/images/generations).
 * Dipakai oleh Amar. Konfigurasi ada di brain.json → "image" (lihat brain.js).
 */

const TIMEOUT_MS = 120_000

function scrub(text, secret) {
  const s = String(text ?? '')
  return secret ? s.split(secret).join('***') : s
}

function sniff(buf) {
  if (buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50) return { mime: 'image/png', ext: 'png' }
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) return { mime: 'image/jpeg', ext: 'jpg' }
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp' }
  return { mime: 'image/png', ext: 'png' }
}

/** Mengembalikan { buffer, mime, ext }; melempar Error berpesan Indonesia bila gagal. */
export async function generateImage(prompt, cfg) {
  if (!cfg?.configured) {
    throw new Error('Generator gambar belum terhubung — jalankan: npm run setup:brain (bagian gambar)')
  }
  const url = `${cfg.baseUrl}/images/generations`
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ model: cfg.model, prompt: String(prompt).slice(0, 3800), size: cfg.size, n: 1 }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') throw new Error('Generator gambar terlalu lama menjawab (waktu habis)')
    const code = err?.cause?.code || ''
    throw new Error(`Tidak bisa terhubung ke generator gambar${code ? ` (${code})` : ''} — cek koneksi internet`)
  }
  const text = await res.text()
  if (!res.ok) {
    let detail = ''
    try { const j = JSON.parse(text); detail = j?.error?.message || j?.message || '' } catch { detail = text.slice(0, 200) }
    detail = scrub(detail, cfg.apiKey).slice(0, 300)
    if (res.status === 401 || res.status === 403) throw new Error(`Generator gambar menolak (${res.status}) — API key gambar salah atau tidak punya akses${detail ? `: ${detail}` : ''}`)
    if (res.status === 429) throw new Error(`Kuota generator gambar habis atau terlalu banyak permintaan (429)${detail ? `: ${detail}` : ''}`)
    throw new Error(`Generator gambar gagal (${res.status})${detail ? `: ${detail}` : ''}`)
  }
  let data
  try { data = JSON.parse(text) } catch { throw new Error('Balasan generator gambar bukan JSON yang valid') }
  const item = data?.data?.[0]
  let buffer
  if (item?.b64_json) {
    buffer = Buffer.from(item.b64_json, 'base64')
  } else if (item?.url) {
    try {
      const img = await fetch(item.url, { signal: AbortSignal.timeout(60_000) })
      if (!img.ok) throw new Error(`HTTP ${img.status}`)
      buffer = Buffer.from(await img.arrayBuffer())
    } catch (err) {
      throw new Error(`Gambar sudah dibuat tetapi gagal diunduh: ${err.message}`)
    }
  }
  if (!buffer || buffer.length < 16) throw new Error('Generator gambar tidak mengirim gambar')
  return { buffer, ...sniff(buffer) }
}
