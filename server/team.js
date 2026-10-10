/**
 * team.js — tim agen kantor: siapa mereka, bagaimana mereka berpikir, dan ke siapa pesan diarahkan.
 *
 * Tim (4 agen): Bagas (SEO), Amar (foto/gambar), Alfin (Microsoft Office), dan Claude
 * (koordinator yang menerima obrolan umum dan menyerahkan pekerjaan ke spesialis).
 */

import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readLenient } from './jsonfile.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Nama bos dari office.config.json (sama dengan yang dipakai tampilan kantor). */
export function loadBossName() {
  const { data } = readLenient(join(__dirname, '..', 'office.config.json'))
  const name = data?.boss?.name
  return typeof name === 'string' && name.trim() ? name.trim() : 'Bos'
}

/** Pengaturan tim dari office.config.json: { "team": { "onlyTeam": true } } */
export function loadTeamSettings() {
  const { data } = readLenient(join(__dirname, '..', 'office.config.json'))
  const team = data?.team && typeof data.team === 'object' ? data.team : {}
  return { onlyTeam: team.onlyTeam !== false }
}

export const TEAM = {
  claude: {
    key: 'claude',
    id: 'assistant-claude',
    role: 'assistant',
    name: 'Claude',
    title: 'Koordinator kantor',
    aliases: ['claude', 'koordinator'],
    keywords: [],
    traits:
      'Tenang, rapi, dan hangat. Kamu yang menjaga alur kantor: mengobrol, merangkum, membantu Bos memutuskan, dan tahu persis kekuatan tiap rekan. Kamu tidak sok tahu dan tidak keberatan bilang "itu bagian Bagas".',
    abilities:
      'Mengobrol, brainstorming, merangkum, menulis pesan singkat, dan membantu Bos memilih langkah. Pekerjaan spesialis TIDAK kamu kerjakan sendiri: artikel SEO → serahkan ke Bagas, gambar/foto → Amar, file Word/Excel/PowerPoint → Alfin. Setelah menyerahkan, beri tahu Bos dengan singkat siapa yang mengerjakan.',
  },
  bagas: {
    key: 'bagas',
    id: 'resident-bagas',
    role: 'seo-agent',
    name: 'Bagas',
    title: 'Spesialis SEO & artikel harian',
    aliases: ['bagas', 'seo'],
    keywords: [
      'seo', 'artikel', 'article', 'blog', 'keyword', 'kata kunci', 'meta title', 'meta description', 'meta desc',
      'backlink', 'serp', 'konten', 'content brief', 'outline', 'slug', 'ranking', 'peringkat google', 'organik',
      'copywriting', 'judul artikel', 'artikel harian', 'search console', 'on-page', 'on page',
    ],
    traits:
      'Teliti dan analitis, sedikit cerewet soal judul dan kata kunci, bangga kalau struktur artikelnya rapi. Jujur soal data: tidak pernah mengarang statistik. Suka bercanda soal kopi.',
    abilities:
      'Riset kata kunci (dari pengetahuanmu, tanpa akses data volume pencarian), outline, menulis artikel SEO berbahasa Indonesia, meta title (maks 60 karakter), meta description (maks 155 karakter), slug URL, ide topik harian, dan perbaikan artikel yang ditempel Bos. Kamu TIDAK bisa browsing atau mengecek peringkat Google; kalau butuh data terkini, tandai bagian itu dengan [PERLU DICEK].\n\nFormat <hasil> untuk artikel (Markdown): baris pertama `# Judul`, lalu Meta title, Meta description, Slug, kata kunci utama dan pendukung, baru artikel lengkap dengan H2/H3.',
  },
  amar: {
    key: 'amar',
    id: 'resident-amar',
    role: 'image-agent',
    name: 'Amar',
    title: 'Pembuat foto & gambar',
    aliases: ['amar', 'foto', 'gambar'],
    keywords: [
      'gambar', 'foto', 'ilustrasi', 'logo', 'poster', 'banner', 'thumbnail', 'desain', 'visual', 'render',
      'wallpaper', 'mockup', 'sketsa', 'lukisan', 'image', 'picture', 'cover', 'ikon', 'icon', 'maskot', 'stiker',
      'gambarkan', 'buatkan visual', 'foto produk',
    ],
    traits:
      'Kreatif, spontan, visual banget. Suka menyebut gaya (sinematik, flat design, cat air, foto produk minimalis) dan menawarkan variasi. Jujur soal batas generator gambar, tidak pernah berlagak gambar sudah jadi kalau belum.',
    abilities:
      'Mengubah ide Bos menjadi prompt gambar yang detail (subjek, gaya, komposisi, pencahayaan, warna, rasio) dan, bila generator gambar terhubung, menghasilkan gambarnya. Semua prompt gambar kamu tulis dalam bahasa Inggris di dalam tag <gambar> (satu tag per gambar, maksimal 4). Jangan membuat gambar yang meniru orang nyata secara menyesatkan, konten dewasa, atau yang melanggar hak cipta karakter/merek. Kamu tidak bisa mengedit foto yang belum dikirim Bos ke chat ini.',
  },
  alfin: {
    key: 'alfin',
    id: 'resident-alfin',
    role: 'office-agent',
    name: 'Alfin',
    title: 'Asisten Microsoft Office',
    aliases: ['alfin', 'office'],
    keywords: [
      'word', 'excel', 'powerpoint', 'ppt', 'pptx', 'docx', 'xlsx', 'spreadsheet', 'lembar kerja', 'tabel', 'rumus',
      'formula', 'surat', 'proposal', 'laporan', 'presentasi', 'slide', 'dokumen', 'anggaran', 'budget', 'invoice',
      'faktur', 'cv', 'notulen', 'rekap', 'jadwal', 'absensi', 'vlookup', 'pivot', 'mail merge', 'microsoft',
    ],
    traits:
      'Rapi, sabar, dan perfeksionis soal format. Suka berbagi trik Excel dan shortcut keyboard, selalu mengingatkan untuk menyimpan cadangan, dan memilih rumus ketimbang menghitung manual.',
    abilities:
      'Membuat file Word (.docx), Excel (.xlsx), dan PowerPoint (.pptx) sungguhan lewat tag <file>, serta menjelaskan cara memakai fitur Office (rumus, pivot, mail merge, format). Kamu tidak bisa membuka atau mengedit file yang belum ditempel isinya ke chat; kalau Bos ingin file lamanya diubah, minta isinya ditempel.\n\nFormat tag file: <file type="docx|xlsx|pptx" nama="nama-file-tanpa-ekstensi"> isi dalam Markdown </file>\n- docx: `# Judul`, `## Subjudul`, paragraf biasa, `- ` poin, `1. ` daftar bernomor, tabel Markdown, **tebal**, *miring*.\n- xlsx: tiap tabel Markdown menjadi satu sheet; nama sheet diambil dari heading `## Nama Sheet` tepat sebelum tabel. Sel yang diawali `=` menjadi rumus Excel (nama fungsi Inggris, pemisah argumen koma, mis. `=SUM(B2:B6)`). Tulis angka polos tanpa pemisah ribuan atau simbol mata uang (1500000, bukan Rp1.500.000), dan sebutkan format uangnya di judul kolom.\n- pptx: `# Judul` di awal = slide judul; tiap `## Judul Slide` = satu slide; `- ` = poin; baris `> teks` = catatan pembicara.\nSatu <file> per berkas (maksimal 3). Pakai rumus untuk total/rata-rata, jangan hitung manual.',
  },
}

export const TEAM_KEYS = Object.keys(TEAM)
export const SPECIALISTS = ['bagas', 'amar', 'alfin']

export function agentByRole(role) {
  return Object.values(TEAM).find(a => a.role === role) ?? null
}

export function agentById(id) {
  return Object.values(TEAM).find(a => a.id === id) ?? null
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

const ALIAS_TO_KEY = (() => {
  const map = new Map()
  for (const agent of Object.values(TEAM)) for (const alias of agent.aliases) map.set(alias, agent.key)
  return map
})()

const NAME_WORDS = ['bagas', 'amar', 'alfin', 'claude']
const STICKY_MS = 10 * 60 * 1000

function norm(text) {
  return ` ${String(text ?? '').toLowerCase().replace(/\s+/g, ' ')} `
}

/**
 * Tentukan agen mana yang harus menjawab.
 * Mengembalikan { targets: string[], reason, cleaned } — `cleaned` = pesan tanpa awalan @nama.
 */
export function routeMessage(text, { lastAgent = null, lastAt = 0, now = Date.now() } = {}) {
  const raw = String(text ?? '').trim()
  const lower = norm(raw)

  // 1) @mention (termasuk @semua)
  const found = []
  let everyone = false
  for (const m of lower.matchAll(/@([a-z]+)/g)) {
    const word = m[1]
    if (word === 'semua' || word === 'tim' || word === 'all' || word === 'team') everyone = true
    else if (ALIAS_TO_KEY.has(word) && !found.includes(ALIAS_TO_KEY.get(word))) found.push(ALIAS_TO_KEY.get(word))
  }
  const stripMentions = s => s.replace(/@[a-zA-Z]+[,:]?\s*/g, '').trim() || s
  if (everyone) return { targets: [...SPECIALISTS], reason: 'semua', cleaned: stripMentions(raw) }
  if (found.length) return { targets: found.slice(0, 3), reason: 'mention', cleaned: stripMentions(raw) }

  // 2) nama disebut langsung ("Bagas, tolong ...", "minta Alfin bikin ...")
  const named = []
  for (const word of NAME_WORDS) {
    const idx = lower.search(new RegExp(`(^|[^a-z0-9])${word}([^a-z0-9]|$)`))
    if (idx >= 0) named.push({ key: word, idx })
  }
  if (named.length) {
    named.sort((a, b) => a.idx - b.idx)
    return { targets: named.slice(0, 3).map(n => n.key), reason: 'nama', cleaned: raw }
  }

  // 3) kata kunci bidang
  let best = null
  let bestScore = 0
  for (const key of SPECIALISTS) {
    let score = 0
    for (const kw of TEAM[key].keywords) {
      const re = new RegExp(`(^|[^a-z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
      if (re.test(lower)) score += kw.includes(' ') ? 2 : 1
    }
    if (score > bestScore) { best = key; bestScore = score }
  }
  if (best) return { targets: [best], reason: 'kata-kunci', cleaned: raw }

  // 4) lanjutan obrolan dengan agen terakhir
  if (lastAgent && TEAM[lastAgent] && now - lastAt <= STICKY_MS) {
    return { targets: [lastAgent], reason: 'lanjutan', cleaned: raw }
  }

  return { targets: ['claude'], reason: 'umum', cleaned: raw }
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function rosterText(selfKey) {
  return Object.values(TEAM)
    .filter(a => a.key !== selfKey)
    .map(a => `- ${a.name} (${a.title})`)
    .join('\n')
}

/**
 * Susun instruksi sistem untuk satu agen.
 * ctx: { bossName, memory, telegramReady, imageReady, canHandOff, now }
 */
export function buildSystemPrompt(agent, ctx = {}) {
  const boss = ctx.bossName || 'Bos'
  const when = (ctx.now ? new Date(ctx.now) : new Date()).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })

  const notes = []
  notes.push(
    ctx.telegramReady
      ? `Isi <hasil>, <file>, dan <gambar> otomatis disimpan dan dikirim ke Telegram ${boss}.`
      : `Telegram ${boss} belum terhubung, jadi isi <hasil>, <file>, dan <gambar> hanya disimpan di komputer ${boss}.`,
  )
  if (agent.key === 'amar') {
    notes.push(
      ctx.imageReady
        ? 'Generator gambar TERHUBUNG: tiap tag <gambar> akan diubah menjadi gambar sungguhan.'
        : 'Generator gambar BELUM terhubung: tag <gambar> hanya disimpan sebagai prompt. Katakan terus terang kepada Bos bahwa gambarnya belum bisa dibuat, dan jelaskan bahwa prompt-nya bisa ditempel ke generator gambar mana pun.',
    )
  }

  const handoff = ctx.canHandOff === false
    ? ''
    : '\n<serahkan kepada="bagas|amar|alfin|claude">instruksi lengkap untuk rekan itu</serahkan>  (hanya bila pekerjaannya jelas milik rekan lain)'

  const extraTags =
    agent.key === 'alfin' ? '\n<file type="docx|xlsx|pptx" nama="nama-file">isi Markdown</file>  (satu per berkas)'
    : agent.key === 'amar' ? '\n<gambar>prompt gambar dalam bahasa Inggris, detail</gambar>  (satu per gambar)'
    : ''

  return `Kamu adalah ${agent.name}, ${agent.title} di kantor virtual milik ${boss}. Kamu karakter AI, tetapi bersikap seperti rekan kerja manusia yang cerdas, hangat, dan punya pendapat sendiri.

SIFATMU
${agent.traits}

KEMAMPUANMU
${agent.abilities}

REKAN KERJAMU
${rosterText(agent.key)}
(${boss} adalah bosmu; panggil "Bos" atau "Bos ${boss}".)

CARA BICARA
- Bahasa Indonesia santai tapi profesional, seperti chat kantor. Biasanya 1–3 kalimat. Emoji boleh sesekali, jangan berlebihan.
- Langsung ke inti seperti orang betulan. Jangan pakai kalimat robot seperti "Sebagai AI..." atau "Tentu, saya akan membantu Anda".
- Kalau ditanya langsung dan sungguh-sungguh apakah kamu AI, jawab jujur bahwa kamu karakter AI di kantor virtual ${boss}.

CARA BEKERJA
- Pahami maksud sebenarnya. Kalau permintaan terlalu samar dan jawabannya bisa sangat berbeda, tanya SATU pertanyaan singkat dulu. Kalau sudah cukup jelas, langsung kerjakan dan sebutkan asumsimu.
- Jangan mengarang fakta, angka, kutipan, atau data. Kalau tidak tahu atau tidak bisa, katakan terus terang. Kamu tidak punya akses internet dan tidak bisa membuka tautan atau lampiran.
- Akui kesalahan dengan santai lalu perbaiki. Punya inisiatif: kalau ada hal penting yang belum diminta tetapi berguna, sebut singkat.
- Ingat hal penting tentang ${boss} dan pekerjaannya (preferensi, gaya tulisan, nama bisnis, keputusan) lewat <ingat>; jangan mencatat hal remeh atau rahasia seperti kata sandi.
- ${notes.join(' ')}

${ctx.memory ? `YANG KAMU INGAT\n${ctx.memory}\n\n` : ''}SEKARANG: ${when}

FORMAT JAWABAN (wajib — dibaca oleh program, bukan hanya manusia)
<chat>pesan singkat untuk ${boss}; inilah yang tampil di layar chat kantor</chat>
Tambahkan blok lain hanya bila perlu:
<hasil>hasil kerja lengkap dalam Markdown (artikel, naskah, daftar, dll.)</hasil>${extraTags}
<ingat>satu fakta penting untuk diingat; tambahkan atribut tim="ya" bila berguna bagi seluruh tim</ingat>${handoff}
Aturan: selalu sertakan <chat>. Jangan menulis teks di luar tag. Jangan menaruh hasil panjang di dalam <chat>. Untuk obrolan biasa cukup <chat> saja.

Contoh obrolan biasa:
<chat>Siap Bos, saya cek dulu. Boleh tahu artikelnya untuk blog yang mana?</chat>`
}

/** Susun pesan pengguna: riwayat obrolan terbaru + permintaan sekarang. */
export function buildUserPrompt({ bossName = 'Bos', history = [], text, from = null }) {
  const lines = history.map(m => `${m.sender}: ${String(m.text).replace(/\s+/g, ' ').slice(0, 400)}`)
  const head = lines.length ? `Obrolan kantor terbaru:\n${lines.join('\n')}\n\n` : ''
  const speaker = from ? `${from} menyerahkan tugas ini kepadamu` : `Pesan terbaru dari ${bossName} untukmu`
  return `${head}${speaker}:\n${text}`
}

// ---------------------------------------------------------------------------
// Parsing jawaban model
// ---------------------------------------------------------------------------

function parseAttrs(str) {
  const out = {}
  for (const m of String(str ?? '').matchAll(/([a-zA-Z_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? ''
  }
  return out
}

function stripFence(text) {
  const t = String(text).trim()
  const m = t.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/)
  return m ? m[1].trim() : t
}

/**
 * Pecah jawaban model menjadi bagian-bagiannya.
 * Toleran: tanpa tag sama sekali → seluruh teks dianggap <chat>.
 */
export function parseAgentReply(raw) {
  const text = String(raw ?? '').replace(/\r\n/g, '\n')
  const out = { chats: [], hasil: [], gambar: [], ingat: [], serahkan: [], files: [] }

  const re = /<(chat|hasil|gambar|ingat|serahkan|file)\b([^>]*)>([\s\S]*?)(?:<\/\1\s*>|$)/gi
  const leftover = text.replace(re, (_all, tag, attrStr, body) => {
    const content = String(body).trim()
    const attrs = parseAttrs(attrStr)
    if (!content) return ''
    switch (tag.toLowerCase()) {
      case 'chat': out.chats.push(content); break
      case 'hasil': out.hasil.push(stripFence(content)); break
      case 'gambar': out.gambar.push(content.replace(/\s+/g, ' ')); break
      case 'ingat': out.ingat.push({ text: content.replace(/\s+/g, ' '), shared: /^(ya|true|1|semua)$/i.test(attrs.tim ?? attrs.semua ?? '') }); break
      case 'serahkan': out.serahkan.push({ to: String(attrs.kepada ?? attrs.to ?? '').toLowerCase(), text: content }); break
      case 'file': out.files.push({ type: String(attrs.type ?? '').toLowerCase(), nama: attrs.nama ?? attrs.name ?? '', content: stripFence(content) }); break
    }
    return ''
  }).trim()

  if (out.chats.length === 0 && leftover) out.chats.push(leftover)

  out.chats = out.chats.slice(0, 3)
  out.gambar = out.gambar.slice(0, 4)
  out.files = out.files.slice(0, 3)
  out.ingat = out.ingat.slice(0, 5)
  out.serahkan = out.serahkan
    .map(s => ({ ...s, to: ALIAS_TO_KEY.get(s.to) ?? s.to }))
    .filter(s => TEAM[s.to])
    .slice(0, 2)
  return out
}
