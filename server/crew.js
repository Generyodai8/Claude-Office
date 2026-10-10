/**
 * crew.js — "kru" kantor: menerima pesan Bos, memilih agen, meminta otak (LLM) berpikir,
 * menampilkan jawabannya di chat, lalu mengerjakan hasil (file Office, gambar, Telegram).
 *
 * Tidak menyentuh server HTTP secara langsung: semua dependensi disuntikkan lewat createCrew().
 */

import { think, loadBrainConfig, describeBrainProblem, BrainError } from './brain.js'
import { TEAM, TEAM_KEYS, routeMessage, buildSystemPrompt, buildUserPrompt, parseAgentReply, loadBossName } from './team.js'
import { memoryForPrompt, addNote, loadNotes } from './memory.js'
import { loadTelegramConfig, sendTelegram, sendTelegramFile, formatAgentDone } from './telegram.js'
import { buildOfficeFile } from './officefiles.js'
import { generateImage } from './images.js'
import { saveOutput } from './outputs.js'

const HISTORY_LIMIT = 12
const HANDOFF_MAX_DEPTH = 1
const HINT_COOLDOWN_MS = 60_000

function clip(text, n) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim()
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

export function createCrew({ broadcast, addMessage, getMessages, activeAgents }) {
  const queues = new Map()          // key -> Promise (antrean per agen)
  const busy = new Map()            // key -> jumlah tugas berjalan/menunggu
  const state = { lastAgent: null, lastAt: 0, lastHintAt: 0 }

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

  return { registerResidents, handleUserMessage, memorySummary, systemSay, setStatus }
}
