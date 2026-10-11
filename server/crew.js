/**
 * crew.js — "kru" kantor: menerima pesan Bos, memilih agen, meminta otak (LLM) berpikir,
 * menampilkan jawabannya di chat, lalu mengerjakan hasil (file Office, gambar, Telegram).
 *
 * Tidak menyentuh server HTTP secara langsung: semua dependensi disuntikkan lewat createCrew().
 */

import { think, loadBrainConfig, describeBrainProblem, BrainError } from './brain.js'
import { TEAM, TEAM_KEYS, routeMessage, buildSystemPrompt, buildUserPrompt, parseAgentReply, loadBossName, parseOfficeCommand } from './team.js'
import { memoryForPrompt, addNote, loadNotes } from './memory.js'
import { loadTelegramConfig, sendTelegram, sendTelegramFile, formatAgentDone } from './telegram.js'
import { buildOfficeFile } from './officefiles.js'
import { generateImage } from './images.js'
import { saveOutput } from './outputs.js'

const HISTORY_LIMIT = 12
const HANDOFF_MAX_DEPTH = 1
const HINT_COOLDOWN_MS = 60_000
const WALK_TIMEOUT_MS = 60_000           // batas menunggu agen tiba di ruang Bos
const ROOM_IDLE_MS = 10 * 60_000         // agen kembali ke meja bila Bos diam selama ini
const MEETING_SEATS = { claude: 'meet-1', bagas: 'meet-2', amar: 'meet-3', alfin: 'meet-4' }
const sleep = ms => new Promise(r => setTimeout(r, ms))

function clip(text, n) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim()
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

export function createCrew({ broadcast, addMessage, getMessages, activeAgents, viewerCount = () => 1 }) {
  const queues = new Map()          // key -> Promise (antrean per agen)
  const busy = new Map()            // key -> jumlah tugas berjalan/menunggu
  const state = { lastAgent: null, lastAt: 0, lastHintAt: 0 }
  // Siapa yang sedang berada di ruang Bos
  const room = { members: new Set(), mode: null, topic: '', seats: {}, token: 0, timer: null }
  // Agen yang sudah tiba di ruang Bos (dikabari oleh tampilan lewat POST /office/arrived)
  const arrived = new Set()
  let arrivalWaiters = []

  function noteArrival(agentId) {
    const agent = Object.values(TEAM).find(a => a.id === agentId)
    if (!agent) return
    arrived.add(agent.key)
    arrivalWaiters = arrivalWaiters.filter(w => {
      if ([...w.keys].every(k => arrived.has(k) || !room.members.has(k))) { w.done(); return false }
      return true
    })
  }

  /** Tunggu sampai semua agen tiba (atau batas waktu). Tanpa tampilan yang terbuka, tidak menunggu. */
  function waitArrival(keys, timeoutMs) {
    if (viewerCount() === 0) return Promise.resolve()
    if (keys.every(k => arrived.has(k))) return Promise.resolve()
    return new Promise(resolve => {
      const w = { keys, done: () => { clearTimeout(t); resolve() } }
      const t = setTimeout(() => { arrivalWaiters = arrivalWaiters.filter(x => x !== w); resolve() }, timeoutMs)
      arrivalWaiters.push(w)
    })
  }

  // ---- penghuni tetap -------------------------------------------------------
  function registerResidents() {
    for (const a of Object.values(TEAM)) {
      activeAgents.set(a.id, { id: a.id, name: a.name, role: a.role, task: a.title, state: 'idle', resident: true, spawnedAt: Date.now() })
    }
  }

  function setStatus(key, status, text = '') {
    const a = TEAM[key]
    const rec = activeAgents.get(a.id)
    if (rec) rec.state = status === 'idle' ? 'idle' : 'working'
    broadcast({ type: 'agent_status', agentId: a.id, role: a.role, status, text: clip(text, 80), timestamp: Date.now() })
  }

  function typing(key) {
    broadcast({ type: 'chat_typing', sender: TEAM[key].name, agentId: TEAM[key].id, timestamp: Date.now() })
  }

  function say(key, text) {
    const a = TEAM[key]
    const msg = addMessage({ sender: a.name, role: a.role, text: String(text).slice(0, 2000) })
    broadcast({ type: 'chat_message', ...msg })
    return msg
  }

  function systemSay(text) {
    const msg = addMessage({ sender: 'system', text, isSystem: true })
    broadcast({ type: 'chat_message', ...msg, isSystem: true })
  }

  // ---- pengiriman hasil -----------------------------------------------------
  async function deliver(key, task, parsed, cfg, tg) {
    const agent = TEAM[key]
    const report = []   // ringkasan untuk chat
    const started = Date.now()

    // 1) hasil teks
    for (const [i, hasil] of parsed.hasil.entries()) {
      let path = ''
      try { path = saveOutput(`${agent.key}-hasil${parsed.hasil.length > 1 ? `-${i + 1}` : ''}.md`, hasil) } catch (e) { report.push(`gagal menyimpan hasil: ${e.message}`) }
      if (tg.configured) {
        const r = await sendTelegram(formatAgentDone({ name: `${agent.name} (${agent.title})`, task: clip(task, 120), spawnedAt: started }, hasil), { config: tg })
        report.push(r.ok ? 'hasil teks terkirim ke Telegram' : `Telegram gagal: ${r.reason}`)
      }
      if (path) report.push(`tersimpan: ${path}`)
    }

    // 2) berkas Office
    for (const f of parsed.files) {
      if (key !== 'alfin') continue
      try {
        const built = await buildOfficeFile(f.type, f.content, f.nama)
        const path = saveOutput(built.filename, built.buffer)
        report.push(`${built.filename} dibuat`)
        if (tg.configured) {
          const r = await sendTelegramFile(built.buffer, built.filename, { kind: 'document', mime: built.mime, caption: `📎 ${agent.name}: ${built.filename}`, config: tg })
          report.push(r.ok ? `${built.filename} terkirim ke Telegram` : `Telegram gagal: ${r.reason}`)
        }
        report.push(`tersimpan: ${path}`)
      } catch (e) {
        report.push(`gagal membuat ${f.nama || f.type}: ${e.message}`)
      }
    }

    // 3) gambar
    if (key === 'amar' && parsed.gambar.length) {
      if (!cfg.image.configured) {
        const text = parsed.gambar.map((p, i) => `${i + 1}. ${p}`).join('\n\n')
        try { report.push(`prompt tersimpan: ${saveOutput('amar-prompt-gambar.md', text)}`) } catch {}
        if (tg.configured) await sendTelegram(`🎨 Amar menyiapkan prompt gambar (generator gambar belum terhubung):\n\n${text}`, { config: tg })
        report.push('generator gambar belum terhubung, jadi baru prompt-nya yang dibuat')
      } else {
        for (const [i, prompt] of parsed.gambar.entries()) {
          try {
            const img = await generateImage(prompt, cfg.image)
            const path = saveOutput(`amar-gambar-${i + 1}.${img.ext}`, img.buffer)
            report.push(`gambar ${i + 1} dibuat`)
            if (tg.configured) {
              const r = await sendTelegramFile(img.buffer, `amar-gambar-${i + 1}.${img.ext}`, { kind: 'photo', mime: img.mime, caption: `🎨 ${clip(prompt, 200)}`, config: tg })
              report.push(r.ok ? `gambar ${i + 1} terkirim ke Telegram` : `Telegram gagal: ${r.reason}`)
            }
            report.push(`tersimpan: ${path}`)
          } catch (e) {
            report.push(`gambar ${i + 1} gagal: ${e.message}`)
          }
        }
      }
    }
    return report
  }

  // ---- satu giliran kerja agen ---------------------------------------------
  async function runAgent(key, text, { from = null, depth = 0 } = {}) {
    const agent = TEAM[key]
    const cfg = loadBrainConfig()
    const bossName = loadBossName()

    if (!cfg.configured) {
      setStatus(key, 'idle')
      if (Date.now() - state.lastHintAt > HINT_COOLDOWN_MS) {
        state.lastHintAt = Date.now()
        say(key, `Maaf Bos, otak saya belum tersambung ke model AI. ${describeBrainProblem(cfg.problem)}`)
      }
      return
    }

    setStatus(key, 'thinking', 'membaca pesan')
    typing(key)
    const typingTimer = setInterval(() => typing(key), 4000)
    try {
      const tg = loadTelegramConfig()
      const history = getMessages({ limit: HISTORY_LIMIT }).filter(m => !m.is_system && !m.isSystem)
      const system = buildSystemPrompt(agent, {
        bossName, memory: memoryForPrompt(key), telegramReady: tg.configured, imageReady: cfg.image.configured,
        canHandOff: depth < HANDOFF_MAX_DEPTH,
        situation: situationFor(key, bossName),
      })
      const user = buildUserPrompt({ bossName, history, text, from })
      const reply = await think({ system, user }, cfg)
      const parsed = parseAgentReply(reply.text)

      for (const note of parsed.ingat) addNote(note.shared ? 'shared' : key, note.text)

      for (const c of parsed.chats) say(key, c)

      const hasWork = parsed.hasil.length || parsed.files.length || parsed.gambar.length
      if (hasWork) {
        setStatus(key, 'working', key === 'amar' ? 'membuat gambar' : key === 'alfin' ? 'menyusun berkas' : 'menulis hasil')
        const report = await deliver(key, text, parsed, cfg, tg)
        const problems = report.filter(r => /gagal/.test(r))
        const sent = report.filter(r => /terkirim/.test(r)).length
        if (problems.length) say(key, `Ada kendala, Bos: ${problems.join('; ')}`)
        else if (sent) say(key, '✅ Sudah saya kirim ke Telegram Bos, salinannya juga tersimpan di komputer.')
        else if (!tg.configured) say(key, '✅ Selesai dan tersimpan di komputer Bos (folder .agent-office/outputs). Telegram belum terhubung, jadi belum terkirim.')
        else say(key, '✅ Selesai dan tersimpan di komputer Bos.')
      }

      for (const h of parsed.serahkan) {
        if (depth >= HANDOFF_MAX_DEPTH || h.to === key) continue
        enqueue(h.to, h.text, { from: agent.name, depth: depth + 1 })
      }
    } catch (err) {
      const msg = err instanceof BrainError ? err.message : `Terjadi kesalahan: ${err?.message ?? err}`
      console.warn(`[crew] ${agent.name} gagal: ${msg}`)
      say(key, `Maaf Bos, saya tidak bisa menjawab sekarang. ${msg}`)
    } finally {
      clearInterval(typingTimer)
      if ((busy.get(key) ?? 1) <= 1) setStatus(key, 'idle')
    }
  }


  // ---- ruang Bos: rapat, panggil, bubar --------------------------------------
  function situationFor(key, bossName) {
    if (!room.members.has(key)) return ''
    const others = [...room.members].filter(k => k !== key).map(k => TEAM[k].name)
    if (room.mode === 'meeting') {
      return `POSISIMU: kamu sedang rapat di ruang ${bossName} bersama ${others.join(', ') || 'tim'}${room.topic ? `; topik rapat: ${room.topic}` : ''}. Jawab seperti orang yang sedang duduk di ruang rapat.`
    }
    return `POSISIMU: kamu baru dipanggil ${bossName} ke ruangannya dan sedang berdiri di depan meja Bos. Jawab seperti sedang berhadapan langsung.`
  }

  function emitRoom(action, keys, extra = {}) {
    broadcast({ type: 'office_command', action, agentIds: keys.map(k => TEAM[k].id), ...extra, timestamp: Date.now() })
  }

  function touchRoom() {
    if (room.timer) clearTimeout(room.timer)
    room.timer = null
    if (room.members.size === 0) return
    room.timer = setTimeout(() => dismiss([], { auto: true }), ROOM_IDLE_MS)
    room.timer.unref?.()
  }

  function dismiss(keys = [], { auto = false } = {}) {
    const present = [...room.members]
    const leaving = keys.length ? keys.filter(k => room.members.has(k)) : present
    if (leaving.length === 0) return false
    for (const k of leaving) { room.members.delete(k); arrived.delete(k) }
    room.token++     // hentikan rapat yang masih berjalan
    const empty = room.members.size === 0
    emitRoom('dismiss', leaving, { includeBoss: empty })
    if (empty) { room.mode = null; room.topic = ''; room.seats = {} }
    else for (const k of leaving) delete room.seats[TEAM[k].id]
    const speaker = leaving.includes('claude') ? 'claude' : leaving[0]
    if (leaving.length > 1) say(speaker, auto ? 'Bos belum memberi arahan lagi, kami kembali ke meja dulu ya.' : 'Baik Bos, kami kembali ke meja masing-masing.')
    else say(speaker, auto ? 'Saya kembali ke meja dulu ya Bos.' : 'Siap Bos, saya kembali ke meja.')
    touchRoom()
    return true
  }

  function summonCall(keys) {
    const targets = keys.slice(0, 2)
    // "satu per satu": tamu sebelumnya dipersilakan kembali, kecuali sedang rapat
    if (room.mode !== 'meeting') {
      const leaving = [...room.members].filter(k => !targets.includes(k))
      if (leaving.length) {
        for (const k of leaving) { room.members.delete(k); arrived.delete(k); delete room.seats[TEAM[k].id] }
        emitRoom('dismiss', leaving, { includeBoss: false })
      }
      room.mode = 'call'
    }
    const fresh = targets.filter(k => !room.members.has(k))
    if (fresh.length === 0) { systemSay(`${targets.map(k => TEAM[k].name).join(', ')} sudah ada di ruangan Bos.`); touchRoom(); return }
    const used = new Set(Object.values(room.seats))
    for (const k of fresh) {
      arrived.delete(k)
      room.members.add(k)
      const seat = room.mode === 'meeting' ? MEETING_SEATS[k] : ['visitor-1', 'visitor-2'].find(s => !used.has(s)) ?? 'visitor-2'
      room.seats[TEAM[k].id] = seat
      used.add(seat)
    }
    emitRoom('summon', fresh, { mode: room.mode, seats: room.seats })
    touchRoom()
    // Setelah tiba, agen menyapa Bos (lewat otak, bukan teks tetap)
    waitArrival(fresh, WALK_TIMEOUT_MS).then(() => sleep(800)).then(() => {
      for (const k of fresh) {
        if (room.members.has(k)) enqueue(k, '[Bos baru saja memanggilmu ke ruangannya dan kamu sudah tiba di depan meja Bos. Sapa Bos dengan singkat dan tanyakan ada yang bisa kamu bantu.]', {})
      }
    })
  }

  /** Satu giliran bicara di rapat: tampil di chat dan jadi gelembung di atas kepala agen. */
  async function speak(key, instruction, bossName) {
    const agent = TEAM[key]
    const cfg = loadBrainConfig()
    if (!cfg.configured) throw new BrainError(cfg.problem || 'no-brain', describeBrainProblem(cfg.problem))
    setStatus(key, 'thinking', 'rapat')
    typing(key)
    try {
      const tg = loadTelegramConfig()
      const history = getMessages({ limit: HISTORY_LIMIT }).filter(m => !m.is_system && !m.isSystem)
      const system = buildSystemPrompt(agent, {
        bossName, memory: memoryForPrompt(key), telegramReady: tg.configured, imageReady: cfg.image.configured,
        canHandOff: false, situation: situationFor(key, bossName),
      })
      const reply = await think({ system, user: buildUserPrompt({ bossName, history, text: instruction }) }, cfg)
      const parsed = parseAgentReply(reply.text)
      for (const note of parsed.ingat) addNote(note.shared ? 'shared' : key, note.text)
      const chat = parsed.chats.join(' ').trim()
      if (chat) say(key, chat)
      return chat
    } finally {
      setStatus(key, 'idle')
    }
  }

  async function runMeeting(topic, token) {
    const bossName = loadBossName()
    await waitArrival([...room.members], WALK_TIMEOUT_MS)
    await sleep(1500)
    const alive = () => token === room.token && room.mode === 'meeting'
    const transcript = []
    const order = ['claude', 'bagas', 'amar', 'alfin'].filter(k => room.members.has(k))
    const topicLine = topic ? `Topik rapat: ${topic}.` : `${bossName} belum menyebut topik khusus.`
    try {
      for (const key of order) {
        if (!alive()) return
        const sofar = transcript.length ? `\nYang sudah dikatakan di rapat:\n${transcript.join('\n')}\n` : ''
        let instruction
        if (key === 'claude' && transcript.length === 0) {
          instruction = `[RAPAT TIM] ${bossName} baru saja mengumpulkan kalian di ruangannya. ${topicLine} Kamu koordinator: buka rapat dalam 1–2 kalimat, sebut topiknya${topic ? '' : ' (atau tanyakan topiknya kepada Bos dan minta rekan memberi laporan singkat dulu)'}, lalu persilakan rekan bicara. Hanya bicara sebagai dirimu sendiri.`
        } else {
          instruction = `[RAPAT TIM] ${topicLine}${sofar}Giliranmu bicara. ${topic ? 'Beri pendapat atau rencana kerja dari bidangmu untuk topik itu' : 'Beri laporan singkat: apa yang sudah/sedang kamu kerjakan (lihat obrolan kantor terbaru) dan apa yang bisa kamu bantu'}, 1–3 kalimat, spesifik, boleh menanggapi rekan. Jangan menulis hasil panjang di sini; cukup <chat>.`
        }
        const said = await speak(key, instruction, bossName)
        if (said) transcript.push(`${TEAM[key].name}: ${said}`)
        await sleep(1200)
      }
      if (!alive() || !room.members.has('claude')) return
      const closing = `[RAPAT TIM] ${topicLine}\nPercakapan rapat:\n${transcript.join('\n')}\n\nRangkum hasil rapat untuk ${bossName}: keputusan dan tindak lanjut tiap orang (maksimal 4 butir, ringkas), lalu tanyakan apakah ada arahan lain. Cukup <chat>.`
      const summary = await speak('claude', closing, bossName)
      if (summary) transcript.push(`${TEAM.claude.name} (kesimpulan): ${summary}`)

      // Notulen: simpan dan kirim ke Telegram
      const notulen = `# Notulen rapat\n\n**Topik:** ${topic || '(tanpa topik khusus)'}\n**Waktu:** ${new Date().toLocaleString('id-ID')}\n\n${transcript.map(l => `- ${l}`).join('\n')}\n`
      try { saveOutput('notulen-rapat.md', notulen) } catch {}
      const tg = loadTelegramConfig()
      if (tg.configured) {
        const r = await sendTelegram(`📋 Notulen rapat\n📌 Topik: ${topic || '(tanpa topik khusus)'}\n\n${transcript.join('\n\n')}`, { config: tg })
        if (!r.ok) systemSay(`Notulen tidak terkirim ke Telegram: ${r.reason}`)
      }
    } catch (err) {
      const msg = err instanceof BrainError ? err.message : `Terjadi kesalahan: ${err?.message ?? err}`
      console.warn(`[crew] rapat gagal: ${msg}`)
      if (alive()) say('claude', `Maaf Bos, rapatnya terhenti. ${msg}`)
    }
  }

  function summonMeeting(topic) {
    const keys = [...TEAM_KEYS]
    room.mode = 'meeting'
    room.topic = topic
    room.token++
    const token = room.token
    for (const k of keys) { arrived.delete(k); room.members.add(k); room.seats[TEAM[k].id] = MEETING_SEATS[k] }
    emitRoom('summon', keys, { mode: 'meeting', seats: room.seats, topic })
    touchRoom()
    runMeeting(topic, token)
  }

  /** Perintah kantor dari Bos. Mengembalikan true bila pesan sudah ditangani. */
  function handleOfficeCommand(text) {
    const cmd = parseOfficeCommand(text)
    if (!cmd) return false
    if (cmd.type === 'meeting') summonMeeting(cmd.topic)
    else if (cmd.type === 'call') summonCall(cmd.targets)
    else if (cmd.type === 'dismiss') {
      if (!dismiss(cmd.targets)) systemSay('Tidak ada yang sedang berada di ruangan Bos.')
    }
    return true
  }

  /** Kirim ulang posisi agen ke tampilan yang baru terhubung (mis. setelah halaman dimuat ulang). */
  function replayRoomState() {
    if (room.members.size === 0) return []
    return [{ type: 'office_command', action: 'summon', agentIds: [...room.members].map(k => TEAM[k].id), mode: room.mode, seats: room.seats, topic: room.topic, timestamp: Date.now() }]
  }

  function enqueue(key, text, opts) {
    busy.set(key, (busy.get(key) ?? 0) + 1)
    const prev = queues.get(key) ?? Promise.resolve()
    const next = prev
      .then(() => runAgent(key, text, opts))
      .catch(() => {})
      .finally(() => busy.set(key, Math.max(0, (busy.get(key) ?? 1) - 1)))
    queues.set(key, next)
    return next
  }

  /** Dipanggil saat Bos mengirim pesan biasa (bukan perintah /). Mengembalikan daftar agen tujuan. */
  function handleUserMessage(text) {
    touchRoom()
    if (handleOfficeCommand(text)) return []
    const route = routeMessage(text, { lastAgent: state.lastAgent, lastAt: state.lastAt })
    state.lastAgent = route.targets[0]
    state.lastAt = Date.now()
    for (const key of route.targets) enqueue(key, route.cleaned, {})
    return route.targets
  }

  function memorySummary() {
    const lines = []
    for (const key of ['shared', ...TEAM_KEYS]) {
      const notes = loadNotes(key)
      const label = key === 'shared' ? 'Tim' : TEAM[key].name
      lines.push(`${label}: ${notes.length ? notes.slice(-3).map(n => n.text).join(' | ') : '(belum ada catatan)'}`)
    }
    return `🧠 ${lines.join(' • ')}`
  }

  return { registerResidents, handleUserMessage, memorySummary, systemSay, setStatus, replayRoomState, noteArrival }
}
