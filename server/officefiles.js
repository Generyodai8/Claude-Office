/**
 * officefiles.js — mengubah teks Markdown buatan agen (Alfin) menjadi berkas Office sungguhan:
 * Word (.docx), Excel (.xlsx), dan PowerPoint (.pptx).
 */

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType,
} from 'docx'
import ExcelJS from 'exceljs'
import PptxGenJS from 'pptxgenjs'

export const OFFICE_TYPES = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

/** Nama berkas aman untuk Windows/macOS/Linux (tanpa ekstensi). */
export function safeBaseName(name, fallback = 'dokumen') {
  const base = String(name ?? '')
    .replace(/\.(docx|xlsx|pptx)$/i, '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 60)
  return base || fallback
}

// ---------------------------------------------------------------------------
// Parser Markdown ringan → blok
// ---------------------------------------------------------------------------

const isTableLine = l => /^\s*\|.*\|\s*$/.test(l)
const isSeparator = l => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l)

function splitRow(line) {
  let t = line.trim()
  if (t.startsWith('|')) t = t.slice(1)
  if (t.endsWith('|')) t = t.slice(0, -1)
  return t.split('|').map(c => c.trim())
}

/** Hasil: [{type:'heading',level,text} | {type:'bullet',text} | {type:'number',n,text} | {type:'para',text} | {type:'table',rows} | {type:'quote',text}] */
export function parseMarkdown(md) {
  const lines = String(md ?? '').replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }

    if (isTableLine(line)) {
      const rows = []
      while (i < lines.length && isTableLine(lines[i])) {
        if (!isSeparator(lines[i])) rows.push(splitRow(lines[i]))
        i++
      }
      if (rows.length) blocks.push({ type: 'table', rows })
      continue
    }
    let m
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      blocks.push({ type: 'heading', level: m[1].length, text: m[2].trim() })
    } else if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) {
      blocks.push({ type: 'bullet', text: m[1].trim() })
    } else if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
      blocks.push({ type: 'number', n: Number(m[1]), text: m[2].trim() })
    } else if ((m = line.match(/^\s*>\s?(.*)$/))) {
      blocks.push({ type: 'quote', text: m[1].trim() })
    } else if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      // garis pemisah: abaikan
    } else {
      blocks.push({ type: 'para', text: line.trim() })
    }
    i++
  }
  return blocks
}

/** Pecah teks dengan **tebal** dan *miring* menjadi potongan bergaya. */
function inlineRuns(text) {
  const parts = []
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) })
    if (m[1] !== undefined) parts.push({ text: m[1], bold: true })
    else if (m[2] !== undefined) parts.push({ text: m[2], italics: true })
    else parts.push({ text: m[3] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts.length ? parts : [{ text }]
}

const plain = text => inlineRuns(text).map(p => p.text).join('')

// ---------------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------------

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6]

const runs = (text, extra = {}) => inlineRuns(text).map(p => new TextRun({ ...p, ...extra }))

export async function buildDocx(md) {
  const children = []
  for (const b of parseMarkdown(md)) {
    switch (b.type) {
      case 'heading':
        children.push(new Paragraph({ heading: HEADINGS[Math.min(b.level, 6) - 1], children: runs(b.text), spacing: { before: 240, after: 120 } }))
        break
      case 'bullet':
        children.push(new Paragraph({ bullet: { level: 0 }, children: runs(b.text), spacing: { after: 60 } }))
        break
      case 'number':
        children.push(new Paragraph({
          children: runs(`${b.n}. ${b.text}`),
          indent: { left: 540, hanging: 300 },
          spacing: { after: 60 },
        }))
        break
      case 'quote':
        children.push(new Paragraph({ children: runs(b.text, { italics: true }), indent: { left: 540 }, spacing: { after: 80 } }))
        break
      case 'table': {
        const width = Math.max(...b.rows.map(r => r.length))
        const rows = b.rows.map((r, ri) => new TableRow({
          tableHeader: ri === 0,
          children: Array.from({ length: width }, (_, ci) => new TableCell({
            width: { size: Math.floor(100 / width), type: WidthType.PERCENTAGE },
            shading: ri === 0 ? { fill: 'D9E2F3' } : undefined,
            children: [new Paragraph({ children: runs(r[ci] ?? '', ri === 0 ? { bold: true } : {}) })],
          })),
        }))
        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }))
        children.push(new Paragraph({ children: [] }))
        break
      }
      default:
        children.push(new Paragraph({ children: runs(b.text), spacing: { after: 120 }, alignment: AlignmentType.LEFT }))
    }
  }
  if (!children.length) children.push(new Paragraph({ children: [new TextRun('')] }))
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{ children }],
  })
  return Buffer.from(await Packer.toBuffer(doc))
}

// ---------------------------------------------------------------------------
// XLSX
// ---------------------------------------------------------------------------

function sheetName(raw, used) {
  let name = String(raw || 'Sheet').replace(/[\[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Sheet'
  let candidate = name
  let n = 2
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` ${n++}`
    candidate = name.slice(0, 31 - suffix.length) + suffix
  }
  used.add(candidate.toLowerCase())
  return candidate
}

function cellValue(raw) {
  const text = plain(String(raw ?? '')).trim()
  if (text.startsWith('=') && text.length > 1) return { formula: text.slice(1) }
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text)
  return text
}

export async function buildXlsx(md) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Agent Office'
  wb.created = new Date()
  const used = new Set()
  const blocks = parseMarkdown(md)

  let pendingTitle = ''
  let tables = 0
  const looseLines = []
  for (const b of blocks) {
    if (b.type === 'heading') { pendingTitle = plain(b.text); continue }
    if (b.type !== 'table') {
      const t = b.type === 'bullet' ? `• ${plain(b.text)}` : plain(b.text)
      looseLines.push(t)
      continue
    }
    tables++
    const ws = wb.addWorksheet(sheetName(pendingTitle || `Sheet${tables}`, used))
    pendingTitle = ''
    const width = Math.max(...b.rows.map(r => r.length))
    b.rows.forEach((r, ri) => {
      const row = ws.addRow(Array.from({ length: width }, (_, ci) => cellValue(r[ci])))
      if (ri === 0) {
        row.font = { bold: true }
        row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } } })
      }
    })
    ws.views = [{ state: 'frozen', ySplit: 1 }]
    for (let c = 1; c <= width; c++) {
      let max = 8
      ws.getColumn(c).eachCell({ includeEmpty: false }, cell => {
        const v = cell.value
        const len = typeof v === 'object' && v?.formula ? 10 : String(v ?? '').length
        if (len > max) max = len
      })
      ws.getColumn(c).width = Math.min(max + 2, 50)
    }
  }
  if (tables === 0) {
    const ws = wb.addWorksheet(sheetName(pendingTitle || 'Catatan', used))
    for (const l of looseLines.length ? looseLines : ['']) ws.addRow([l])
    ws.getColumn(1).width = 80
  }
  return Buffer.from(await wb.xlsx.writeBuffer())
}

// ---------------------------------------------------------------------------
// PPTX
// ---------------------------------------------------------------------------

export async function buildPptx(md) {
  const pres = new PptxGenJS()
  pres.layout = 'LAYOUT_16x9'
  pres.author = 'Agent Office'

  const slides = []   // { title, bullets, notes, table }
  let titleSlide = null
  let cur = null
  for (const b of parseMarkdown(md)) {
    if (b.type === 'heading' && b.level === 1 && !titleSlide && !cur) {
      titleSlide = { title: plain(b.text), subtitle: [] }
    } else if (b.type === 'heading' && b.level <= 2) {
      cur = { title: plain(b.text), bullets: [], notes: [], table: null }
      slides.push(cur)
    } else {
      if (!cur) {
        if (titleSlide && (b.type === 'para' || b.type === 'bullet')) { titleSlide.subtitle.push(plain(b.text)); continue }
        cur = { title: titleSlide?.title || 'Ringkasan', bullets: [], notes: [], table: null }
        slides.push(cur)
      }
      if (b.type === 'quote') cur.notes.push(plain(b.text))
      else if (b.type === 'table') cur.table = b.rows.map(r => r.map(plain))
      else if (b.type === 'heading') cur.bullets.push({ text: plain(b.text), bold: true })
      else cur.bullets.push({ text: plain(b.text), number: b.type === 'number' ? b.n : null, plain: b.type === 'para' })
    }
  }

  if (titleSlide) {
    const s = pres.addSlide()
    s.background = { color: '1F3864' }
    s.addText(titleSlide.title, { x: 0.7, y: 1.8, w: 8.6, h: 1.4, fontSize: 36, bold: true, color: 'FFFFFF', fontFace: 'Calibri' })
    if (titleSlide.subtitle.length) {
      s.addText(titleSlide.subtitle.join('\n'), { x: 0.7, y: 3.3, w: 8.6, h: 1.2, fontSize: 18, color: 'D9E2F3', fontFace: 'Calibri' })
    }
  }
  for (const sl of slides) {
    const s = pres.addSlide()
    s.addText(sl.title, { x: 0.6, y: 0.35, w: 8.8, h: 0.8, fontSize: 28, bold: true, color: '1F3864', fontFace: 'Calibri' })
    if (sl.table && sl.table.length) {
      const rows = sl.table.map((r, ri) => r.map(c => ({ text: c, options: ri === 0 ? { bold: true, fill: { color: 'D9E2F3' } } : {} })))
      s.addTable(rows, { x: 0.6, y: 1.4, w: 8.8, fontSize: 14, border: { type: 'solid', color: 'BBBBBB', pt: 0.5 } })
    } else if (sl.bullets.length) {
      const items = sl.bullets.slice(0, 12).map(b => ({
        text: b.number ? `${b.number}. ${b.text}` : b.text,
        options: b.plain || b.number ? { bold: !!b.bold, breakLine: true } : { bullet: true, bold: !!b.bold, breakLine: true },
      }))
      s.addText(items, { x: 0.7, y: 1.4, w: 8.6, h: 3.8, fontSize: 20, color: '333333', fontFace: 'Calibri', valign: 'top' })
    }
    if (sl.notes.length) s.addNotes(sl.notes.join('\n'))
  }
  if (!titleSlide && !slides.length) pres.addSlide().addText('(kosong)', { x: 1, y: 1, w: 8, h: 1, fontSize: 24 })
  const out = await pres.write({ outputType: 'nodebuffer' })
  return Buffer.from(out)
}

// ---------------------------------------------------------------------------

/** Bangun berkas. Mengembalikan { buffer, filename, mime } atau melempar Error berpesan Indonesia. */
export async function buildOfficeFile(type, markdown, nama) {
  const t = String(type ?? '').toLowerCase().replace(/^\./, '')
  const map = { word: 'docx', doc: 'docx', excel: 'xlsx', xls: 'xlsx', powerpoint: 'pptx', ppt: 'pptx' }
  const kind = map[t] ?? t
  const base = safeBaseName(nama, kind === 'xlsx' ? 'lembar-kerja' : kind === 'pptx' ? 'presentasi' : 'dokumen')
  let buffer
  if (kind === 'docx') buffer = await buildDocx(markdown)
  else if (kind === 'xlsx') buffer = await buildXlsx(markdown)
  else if (kind === 'pptx') buffer = await buildPptx(markdown)
  else throw new Error(`Jenis berkas "${type}" tidak dikenal (pilih docx, xlsx, atau pptx)`)
  return { buffer, filename: `${base}.${kind}`, mime: OFFICE_TYPES[kind] }
}
