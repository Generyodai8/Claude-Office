// Random office events that trigger periodically

export interface RandomOfficeEvent {
  id: string
  name: string
  slackAnnouncement: string
  duration: number // ms
  type: 'all-move' | 'single-agent' | 'visual-only' | 'slack-only'
  targetPosition?: { x: number; y: number }
  agentMessages?: string[]
  managerMessage?: string
  sound?: 'alarm' | 'celebration' | 'doorOpen' | 'error' | 'powerDown' | 'notification' | 'coffee'
}

export const RANDOM_EVENTS: RandomOfficeEvent[] = [
  {
    id: 'fire-drill',
    name: 'Latihan Kebakaran',
    slackAnnouncement: '🚨 LATIHAN KEBAKARAN! Semua menuju pintu keluar!',
    duration: 6000,
    type: 'all-move',
    targetPosition: { x: 114, y: 105 },
    managerMessage: 'Latihan kebakaran! Cepat bergerak!',
    agentMessages: ['yah, lagi...', 'padahal lagi fokus!', 'kopiku!', 'selamatkan codebase-nya!'],
    sound: 'alarm',
  },
  {
    id: 'pizza',
    name: 'Pizza Datang',
    slackAnnouncement: '🍕 Pizza sudah datang! Makan siang gratis!',
    duration: 5000,
    type: 'all-move',
    targetPosition: { x: 114, y: 105 },
    managerMessage: 'Pizza di lobi!',
    agentMessages: ['PIZZA!', 'akhirnya ada kabar baik', 'nanas di pizza?!', 'aku ambil yang pepperoni'],
    sound: 'celebration',
  },
  {
    id: 'standup',
    name: 'Standup Harian',
    slackAnnouncement: '📢 @here Standup harian dimulai sekarang',
    duration: 7000,
    type: 'all-move',
    targetPosition: { x: 411, y: 417 },
    managerMessage: 'Standup! Apa yang sudah dirilis?',
    agentMessages: ['ngerjain yang itu', 'masih debugging', 'nunggu review', 'sudah deploy ke staging', 'benerin 3 bug, nambah 5'],
    sound: 'notification',
  },
  {
    id: 'deploy',
    name: 'Deploy ke Produksi',
    slackAnnouncement: '🚀 DEPLOY KE PRODUKSI...',
    duration: 5000,
    type: 'slack-only',
    managerMessage: 'Tahan napas...',
    agentMessages: ['waduh', 'jangan sampai rusak', 'aku lupa jalanin tes', 'YOLO', 'cek rencana rollback'],
    sound: 'notification',
  },
  {
    id: 'deploy-success',
    name: 'Deploy Berhasil',
    slackAnnouncement: '✅ Deploy berhasil! Semua sistem hijau 🎉',
    duration: 3000,
    type: 'slack-only',
    managerMessage: 'Kita berhasil!',
    agentMessages: ['ayo!', 'rilis!', 'kerja bagus tim', 'waktunya makan enak'],
    sound: 'celebration',
  },
  {
    id: 'deploy-fail',
    name: 'Deploy Gagal',
    slackAnnouncement: '💥 DEPLOY GAGAL - ROLLBACK',
    duration: 4000,
    type: 'slack-only',
    managerMessage: 'SIAPA YANG PUSH ITU?!',
    agentMessages: ['bukan aku', 'waduh waduh waduh', 'cek log', 'selalu DNS masalahnya', 'rollback...'],
    sound: 'error',
  },
  {
    id: 'power-flicker',
    name: 'Listrik Berkedip',
    slackAnnouncement: '⚡ Listrik berkedip - simpan pekerjaanmu!',
    duration: 3000,
    type: 'visual-only',
    agentMessages: ['lampunya barusan...', 'CTRL+S CTRL+S', 'perubahanku belum disimpan!', 'git commit SEKARANG'],
    sound: 'powerDown',
  },
  {
    id: 'birthday',
    name: 'Ulang Tahun',
    slackAnnouncement: '🎂 Selamat ulang tahun! Kue ada di pantry!',
    duration: 4000,
    type: 'all-move',
    targetPosition: { x: 287, y: 129 },
    managerMessage: 'Selamat ulang tahun!',
    agentMessages: ['kue!', 'selamat ulang tahun!', '🎉🎉🎉', 'ini bebas gluten nggak?', 'ayo berdoa dulu'],
    sound: 'celebration',
  },
  {
    id: 'who-broke-build',
    name: 'Build Rusak',
    slackAnnouncement: '🔴 Pipeline CI/CD MERAH. Siapa yang merusak build?',
    duration: 5000,
    type: 'slack-only',
    managerMessage: 'Tidak ada yang pulang sebelum ini beres.',
    agentMessages: ['cek git blame...', 'bukan aku', 'gara-gara merge-nya?', 'mungkin tesnya flaky?', 'salahkan anak magang'],
    sound: 'error',
  },
  {
    id: 'friday',
    name: 'Suasana Jumat',
    slackAnnouncement: '🎉 Hari Jumat! Sedikit lagi, tim!',
    duration: 3000,
    type: 'slack-only',
    managerMessage: 'Jangan deploy hari Jumat.',
    agentMessages: ['TGIF', 'nongkrong?', 'satu PR lagi...', 'pulang tepat jam 5', 'akhir pekan!'],
    sound: 'celebration',
  },
  {
    id: 'printer-jam',
    name: 'Printer Macet',
    slackAnnouncement: '🖨️ Printernya macet lagi',
    duration: 4000,
    type: 'single-agent',
    targetPosition: { x: 424, y: 132 },
    agentMessages: ['kenapa kita masih punya printer', 'PC LOAD LETTER?!', 'siapa sih yang masih nge-print', 'ini sudah 2026...'],
    sound: 'error',
  },
  {
    id: 'slack-down',
    name: 'Slack Down',
    slackAnnouncement: '💀 Slack down... lho, kok bisa kita posting ini',
    duration: 3000,
    type: 'slack-only',
    agentMessages: ['ironis banget', 'saatnya pakai email', 'saatnya merpati pos', 'sebenarnya agak tenang'],
    sound: 'notification',
  },
]

// Obrolan drama di kantor
export const DRAMA_CONVERSATIONS = [
  {
    trigger: 'coffee-meet',
    messages: [
      { sender: 0, text: 'sudah lihat PR barunya?' },
      { sender: 1, text: 'yang 2000 baris itu? iya...' },
      { sender: 0, text: 'tanpa tes juga' },
      { sender: 1, text: '💀' },
    ],
  },
  {
    trigger: 'who-pushed',
    messages: [
      { sender: 0, text: 'siapa yang push langsung ke main?' },
      { sender: 1, text: 'bukan aku' },
      { sender: 0, text: 'git blame bilang lain' },
      { sender: 1, text: '...' },
    ],
  },
  {
    trigger: 'tabs-vs-spaces',
    messages: [
      { sender: 0, text: 'tab atau spasi?' },
      { sender: 1, text: 'spasi lah' },
      { sender: 0, text: 'diblokir dan dilaporkan' },
    ],
  },
  {
    trigger: 'meeting',
    messages: [
      { sender: 0, text: 'rapat ini harusnya cukup lewat pesan' },
      { sender: 1, text: 'pesan ini harusnya cukup diam saja' },
    ],
  },
  {
    trigger: 'framework',
    messages: [
      { sender: 0, text: 'kita harus tulis ulang pakai Rust' },
      { sender: 1, text: 'kamu bilang gitu tiap minggu' },
      { sender: 0, text: 'dan aku benar tiap minggu' },
    ],
  },
  {
    trigger: 'legacy',
    messages: [
      { sender: 0, text: 'nemu TODO dari 2019' },
      { sender: 1, text: 'isinya apa' },
      { sender: 0, text: '"perbaiki nanti"' },
      { sender: 1, text: 'nanti itu sekarang' },
      { sender: 0, text: 'bukan. nanti ya nanti.' },
    ],
  },
  {
    trigger: 'ai',
    messages: [
      { sender: 0, text: 'AI nulis kode lebih bagus dari aku hari ini' },
      { sender: 1, text: 'standarnya rendah sih' },
      { sender: 0, text: 'kasar tapi adil' },
    ],
  },
  {
    trigger: 'standup-excuse',
    messages: [
      { sender: 0, text: 'kemarin ngapain aja?' },
      { sender: 1, text: 'menyelidiki masalah yang rumit' },
      { sender: 0, text: 'maksudmu googling 6 jam' },
      { sender: 1, text: 'aku lebih suka bilang "riset"' },
    ],
  },
]

// Slack reactions that randomly appear on messages
export const SLACK_REACTIONS = ['👍', '🔥', '💀', '😂', '🚀', '❤️', '👀', '💯', '🎉', '😅', '🤔', '⚡']

// Dunder Mifflin themed events — used when Office theme is active
export const OFFICE_EVENTS: RandomOfficeEvent[] = [
  {
    id: 'fire-alarm-stress-relief',
    name: 'FIRE! FIRE! FIRE!',
    slackAnnouncement: '🔥 FIRE! FIRE! FIRE! (Dwight is teaching fire safety)',
    duration: 6000,
    type: 'all-move',
    targetPosition: { x: 114, y: 105 },
    managerMessage: 'The fire is shooting at us!',
    agentMessages: ['FIRE!', 'oh my god oh my god', 'save Bandit!', 'I declare BANKRUPTCY!', 'get the defibrillator!'],
    sound: 'alarm',
  },
  {
    id: 'cpr-training',
    name: "Stayin' Alive",
    slackAnnouncement: '🫀 CPR training — stay to the beat of Stayin\' Alive',
    duration: 5000,
    type: 'slack-only',
    managerMessage: 'ah ah ah ah, stayin\' alive, stayin\' alive',
    agentMessages: ['is he... dead?', 'Dwight is cutting the face off', 'I learned this from ER', 'ah ah ah ah'],
    sound: 'notification',
  },
  {
    id: 'golden-ticket',
    name: 'Golden Ticket',
    slackAnnouncement: '🎫 Five Golden Tickets hidden in reams of paper — 10% off!',
    duration: 4000,
    type: 'slack-only',
    managerMessage: 'It was my idea. It was all me.',
    agentMessages: ['I blame Kevin', 'Willy Wonka time', 'that was all Michael', 'who approved this'],
    sound: 'celebration',
  },
  {
    id: 'jim-prank',
    name: 'Jim Pranks Dwight',
    slackAnnouncement: '🥤 Someone put Dwight\'s stapler in jello again',
    duration: 3500,
    type: 'slack-only',
    managerMessage: 'JIM!',
    agentMessages: ['not again', 'it\'s always Jim', 'identity theft is not a joke', 'Pam, help'],
    sound: 'notification',
  },
  {
    id: 'parkour',
    name: 'Parkour!',
    slackAnnouncement: '🏃 PARKOUR! PARKOUR! PARKOUR!',
    duration: 4000,
    type: 'visual-only',
    managerMessage: 'PARKOUR!',
    agentMessages: ['parkour!', 'PAR-KOUR', 'Michael no', 'this is going to end badly'],
    sound: 'celebration',
  },
  {
    id: 'schrute-bucks',
    name: 'Schrute Bucks',
    slackAnnouncement: '💵 Dwight is issuing Schrute Bucks. 1/1000th of a cent.',
    duration: 3000,
    type: 'slack-only',
    agentMessages: ['what\'s the conversion rate?', 'do I look like I need extra incentive?', 'I\'ll take Stanley nickels instead', 'where\'s my raise?'],
    sound: 'notification',
  },
  {
    id: 'kevins-chili',
    name: "Kevin's Chili",
    slackAnnouncement: '🫘 Kevin dropped the chili. Again.',
    duration: 4000,
    type: 'slack-only',
    managerMessage: 'the only thing left to do is to scoop it up...',
    agentMessages: ['NOOO', 'it took him all morning', 'carpet is ruined', 'I told him to use two pans'],
    sound: 'error',
  },
  {
    id: 'printer-jam-dm',
    name: 'Sabre Printer Jam',
    slackAnnouncement: '🖨️ The printer is on fire again. Literal fire.',
    duration: 4000,
    type: 'single-agent',
    targetPosition: { x: 424, y: 132 },
    agentMessages: ['Sabre printers strike again', 'I TOLD them', 'time to call Nellie', 'warranty expired'],
    sound: 'error',
  },
  {
    id: 'dundies',
    name: 'The Dundies',
    slackAnnouncement: '🏆 The Dundies are tonight!',
    duration: 4000,
    type: 'slack-only',
    managerMessage: 'You\'re gonna laugh, you\'re gonna cry...',
    agentMessages: ['Bushiest Beaver award time', 'Please no again', 'dibs on Best Dad', 'I\'m taking Pam to Chili\'s'],
    sound: 'celebration',
  },
  {
    id: 'pretzel-day',
    name: 'Pretzel Day',
    slackAnnouncement: '🥨 IT\'S PRETZEL DAY',
    duration: 5000,
    type: 'all-move',
    targetPosition: { x: 287, y: 129 },
    managerMessage: 'You don\'t understand. It\'s pretzel day.',
    agentMessages: ['best day of the year', 'worth every calorie', 'Stanley\'s been waiting all year', 'all the toppings'],
    sound: 'celebration',
  },
  {
    id: 'bears-beets',
    name: 'Bears. Beets. Battlestar Galactica.',
    slackAnnouncement: '📋 Question: what kind of bear is best?',
    duration: 3000,
    type: 'slack-only',
    agentMessages: ['false. black bear.', 'Bears, beets, Battlestar Galactica', 'identity theft is not a joke, Jim', 'fact: bears eat beets'],
    sound: 'notification',
  },
]

import { getTheme } from './theme'

export function pickEvent(): RandomOfficeEvent {
  const isOffice = getTheme() === 'office'

  // Deploy events chain together (kept for both themes)
  if (Math.random() < 0.15) {
    return Math.random() < 0.7
      ? RANDOM_EVENTS.find(e => e.id === 'deploy-success')!
      : RANDOM_EVENTS.find(e => e.id === 'deploy-fail')!
  }

  if (isOffice) {
    // 70% Office-themed, 30% default — keeps things varied
    const useOffice = Math.random() < 0.7
    const pool = useOffice
      ? OFFICE_EVENTS
      : RANDOM_EVENTS.filter(e => e.id !== 'deploy-success' && e.id !== 'deploy-fail')
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const pool = RANDOM_EVENTS.filter(e => e.id !== 'deploy-success' && e.id !== 'deploy-fail')
  return pool[Math.floor(Math.random() * pool.length)]
}
