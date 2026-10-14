// Şeridin saf parçaları: biçimlendirme ve hapların SVG metni. `$`'a dokunmaz,
// böylece önizleme sayfası da aynı kodla basılabilir.
import type { UsageLimit } from '../types'

export const WINDOW_MS: Record<string, number> = {
  five_hour: 5 * 60 * 60 * 1000,
  seven_day: 7 * 24 * 60 * 60 * 1000,
}

export function fmtRemaining(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000))
  const d = Math.floor(minutes / 1440)
  const h = Math.floor((minutes % 1440) / 60)
  const m = minutes % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function fmtCost(usd: number): string {
  return `$${usd.toFixed(2)}`
}

export type Level = 'ok' | 'warn' | 'bad'

export function level(percent: number): Level {
  if (percent >= 90) return 'bad'
  if (percent >= 70) return 'warn'
  return 'ok'
}

export type LimitView = {
  kind: string
  label: string
  percent: number
  remainingMs: number | null
  elapsed: number | null
}

export function limitView(limit: UsageLimit, now: number): LimitView {
  const label = limit.kind === 'five_hour' ? '5h' : limit.kind === 'seven_day' ? '7d' : limit.kind
  const resetsAt = limit.resetsAt ? Date.parse(limit.resetsAt) : NaN
  const windowMs = WINDOW_MS[limit.kind]
  const remainingMs = Number.isFinite(resetsAt) ? Math.max(0, resetsAt - now) : null
  const elapsed =
    remainingMs !== null && windowMs ? Math.min(1, Math.max(0, 1 - remainingMs / windowMs)) : null

  return { kind: limit.kind, label, percent: limit.percentUsed, remainingMs, elapsed }
}

// --- İpuçları ---------------------------------------------------------------

export function limitTitle(view: LimitView): string {
  const name = view.kind === 'five_hour' ? '5 saatlik pencere' : view.kind === 'seven_day' ? '7 günlük pencere' : view.kind
  const lines = [`${name}: %${view.percent} kullanıldı`]
  if (view.remainingMs !== null) lines.push(`Sıfırlanmaya: ${fmtRemaining(view.remainingMs)}`)
  if (view.elapsed !== null) lines.push(`Pencerenin %${Math.round(view.elapsed * 100)}'i geçti`)
  return lines.join('\n')
}

export function costTitle(usd: number): string {
  return `Oturum maliyeti: ${fmtCost(usd)}\nAPI liste fiyatıyla hesaplanır; aboneliğinizde ayrıca ödenmez.`
}

// --- SVG hapları --------------------------------------------------------------

type Theme = { bg: string; fg: string; bgDark: string; fgDark: string }

export const THEMES = {
  five_hour: { bg: '#d3f3ec', fg: '#0b5a50', bgDark: '#12352f', fgDark: '#8fe3d3' },
  seven_day: { bg: '#ebe2fb', fg: '#4a2a86', bgDark: '#2a1f44', fgDark: '#cdb6f5' },
  cost: { bg: '#f7ebc5', fg: '#6b4f00', bgDark: '#3b3117', fgDark: '#f0d27a' },
} satisfies Record<string, Theme>

const ICONS = {
  gauge: '<path d="M1.5 9.5a4.5 4.5 0 1 1 9 0"/><path d="M6 9.5l2.3-3.1"/>',
  calendar: '<rect x="1.5" y="2.5" width="9" height="8.5" rx="1.6"/><path d="M1.5 5.5h9M4 1v3M8 1v3"/>',
  timer: '<circle cx="6" cy="6.8" r="4.4"/><path d="M6 4.6v2.3l1.5 1.1M4.6 1.2h2.8"/>',
  dollar:
    '<path d="M8.6 3.1C8.1 2.3 7.2 1.9 6 1.9c-1.5 0-2.5.8-2.5 1.9 0 2.6 5.1 1.4 5.1 4.3 0 1.1-1.1 1.9-2.6 1.9-1.2 0-2.2-.5-2.7-1.3M6 .6v10.8"/>',
} as const

type IconName = keyof typeof ICONS

type Part =
  | { kind: 'icon'; icon: IconName }
  | { kind: 'text'; text: string; bold?: boolean; dim?: boolean }
  | { kind: 'bar'; percent: number; elapsed: number | null }
  | { kind: 'sep' }

const H = 22
const CHAR = 7.05
const FONT = 11.5
const PAD_L = 8
const PAD_R = 9
const GAP = 5
const BAR_W = 34

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function partWidth(part: Part): number {
  switch (part.kind) {
    case 'icon':
      return 12
    case 'text':
      return part.text.length * CHAR
    case 'bar':
      return BAR_W
    case 'sep':
      return 1
  }
}

function pillSvg(theme: Theme, parts: Part[], title: string): { source: string; width: number } {
  let x = PAD_L
  const body: string[] = []
  parts.forEach((part, i) => {
    if (i > 0) x += part.kind === 'sep' || parts[i - 1]?.kind === 'sep' ? GAP + 1 : GAP
    const w = partWidth(part)
    switch (part.kind) {
      case 'icon':
        body.push(`<g class="ic" transform="translate(${x.toFixed(1)} 5)">${ICONS[part.icon]}</g>`)
        break
      case 'text':
        body.push(
          `<text x="${x.toFixed(1)}" y="15"${part.bold ? ' font-weight="700"' : ''}${part.dim ? ' class="dim"' : ''}>${esc(part.text)}</text>`,
        )
        break
      case 'bar': {
        const fill = Math.max(0, Math.min(1, part.percent / 100)) * BAR_W
        body.push(`<rect class="track" x="${x.toFixed(1)}" y="8.5" width="${BAR_W}" height="5" rx="2.5"/>`)
        if (fill > 0) {
          body.push(
            `<rect class="${level(part.percent)}" x="${x.toFixed(1)}" y="8.5" width="${Math.max(2.5, fill).toFixed(1)}" height="5" rx="2.5"/>`,
          )
        }
        if (part.elapsed !== null) {
          const mx = x + part.elapsed * BAR_W
          body.push(`<line class="mark" x1="${mx.toFixed(1)}" y1="5.5" x2="${mx.toFixed(1)}" y2="16.5"/>`)
        }
        break
      }
      case 'sep':
        body.push(`<line class="sep" x1="${x + 0.5}" y1="6" x2="${x + 0.5}" y2="16"/>`)
        break
    }
    x += w
  })
  const width = Math.ceil(x + PAD_R)

  const style = [
    ':root{color-scheme:light dark}',
    `svg{--bg:${theme.bg};--fg:${theme.fg};--ok:#1f9d55;--warn:#c98f00;--bad:#d23f36}`,
    `@media (prefers-color-scheme: dark){svg{--bg:${theme.bgDark};--fg:${theme.fgDark};--ok:#3fd07c;--warn:#f2bd2c;--bad:#ff6b61}}`,
    `text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:${FONT}px;fill:var(--fg)}`,
    '.dim{opacity:.78}',
    '.bg{fill:var(--bg)}',
    '.ic{fill:none;stroke:var(--fg);stroke-width:1.35;stroke-linecap:round;stroke-linejoin:round}',
    '.track{fill:var(--fg);opacity:.17}',
    '.ok{fill:var(--ok)}.warn{fill:var(--warn)}.bad{fill:var(--bad)}',
    '.mark{stroke:var(--fg);stroke-width:1.3;stroke-linecap:round}',
    '.sep{stroke:var(--fg);stroke-width:1;opacity:.35}',
  ].join('')

  const source =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}">` +
    `<title>${esc(title)}</title><style>${style}</style>` +
    `<rect class="bg" x="0" y="0" width="${width}" height="${H}" rx="${H / 2}"/>` +
    body.join('') +
    '</svg>'

  return { source, width }
}

export type Pill = { id: string; group: 'limits' | 'cost'; source: string; width: number; alt: string }

export function limitPill(view: LimitView): Pill {
  const theme = view.kind === 'seven_day' ? THEMES.seven_day : THEMES.five_hour
  const parts: Part[] = [
    { kind: 'icon', icon: view.kind === 'seven_day' ? 'calendar' : 'gauge' },
    { kind: 'text', text: view.label },
    { kind: 'bar', percent: view.percent, elapsed: view.elapsed },
    { kind: 'text', text: `${Math.round(view.percent)}%`, bold: true },
  ]
  if (view.remainingMs !== null) {
    parts.push({ kind: 'sep' }, { kind: 'icon', icon: 'timer' }, {
      kind: 'text',
      text: fmtRemaining(view.remainingMs),
      dim: true,
    })
  }
  const title = limitTitle(view)
  const alt = `${view.label} ${Math.round(view.percent)}%${view.remainingMs !== null ? `, ${fmtRemaining(view.remainingMs)}` : ''}`

  return { id: view.kind, group: 'limits', ...pillSvg(theme, parts, title), alt }
}

export function costPill(usd: number): Pill {
  const svg = pillSvg(THEMES.cost, [{ kind: 'icon', icon: 'dollar' }, { kind: 'text', text: fmtCost(usd).slice(1) }], costTitle(usd))

  return { id: 'cost', group: 'cost', ...svg, alt: `maliyet ${fmtCost(usd)}` }
}

// --- Terminal ---------------------------------------------------------------

export function terminalBar(percent: number, elapsed: number | null, cells = 10): string {
  const filled = Math.round(Math.max(0, Math.min(100, percent)) / (100 / cells))
  const chars = Array.from({ length: cells }, (_, i) => (i < filled ? '█' : '░'))
  if (elapsed !== null) chars[Math.min(cells - 1, Math.floor(elapsed * cells))] = '│'

  return chars.join('')
}
