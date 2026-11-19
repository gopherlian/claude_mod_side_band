// Small decorations for a few days of the year: glyphs and colour on the border of the time frame, nothing else.
// The date alone decides, nothing is read or written, and there is no timer: what moves is drawn from the clock.
import type { Cell, Line } from './sections/usage'

export type SeasonId = 'valentine' | 'summer' | 'donis' | 'halloween' | 'nochebuena' | 'navidad' | 'reyes'

export type Season = {
  id: SeasonId
  /** First and last day, as `[month, day]` (month 1 to 12), both inside the range; a range may cross New Year. */
  from: [number, number]
  to: [number, number]
  /** Drawn in turn along the border, one cell each, in the colour at the same place of `colors`. */
  glyphs: string[]
  colors: string[]
  /** How many glyphs: one every few cells where absent. */
  count?: number
  /** The border drawn in equal runs of these colours, instead of its own. */
  stripes?: string[]
  /** A centred row under the frame. */
  greeting?: { text: string; color: string }
}

const BLUE = '#2b6cb0'
const YELLOW = '#d69e2e'
const RED = '#c53030'

/** In the order of the year from February; the demonstration walks through them in this order. */
export const SEASONS: Season[] = [
  { id: 'valentine', from: [2, 12], to: [2, 14], glyphs: ['♥'], colors: ['#ec7ab0', '#d4577f'] },
  { id: 'summer', from: [6, 21], to: [9, 22], glyphs: ['☀', '≈'], colors: ['#e6b422', '#4aa3df'] },
  {
    id: 'donis',
    from: [10, 7],
    to: [10, 9],
    glyphs: [],
    colors: [],
    // The Royal Senyera: the blue band, then the four red bars on gold.
    stripes: [BLUE, YELLOW, RED, YELLOW, RED, YELLOW, RED, YELLOW, RED],
    greeting: { text: 'Sant Donís ✿', color: '#ec7ab0' },
  },
  { id: 'halloween', from: [10, 24], to: [11, 1], glyphs: ['▲', '☾', '✶'], colors: ['#8b5cf6', '#a78bfa'] },
  { id: 'nochebuena', from: [12, 24], to: [12, 24], glyphs: ['✦', '✧'], colors: ['#e6b422', '#68d391'] },
  { id: 'navidad', from: [12, 25], to: [1, 4], glyphs: ['❄', '✦'], colors: ['#9ecbff', '#e6b422'] },
  { id: 'reyes', from: [1, 5], to: [1, 6], glyphs: ['★'], colors: ['#e6b422'], count: 3 },
]

/** A day of the year as one number that grows through the year, so ranges compare and cross New Year. */
const ordinal = (month: number, date: number): number => month * 100 + date

const within = (season: Season, today: number): boolean => {
  const from = ordinal(...season.from)
  const to = ordinal(...season.to)

  return from <= to ? today >= from && today <= to : today >= from || today <= to
}

/** The season of the local day `now` falls on, if any. */
export const seasonAt = (now: number): Season | undefined => {
  const day = new Date(now)
  const today = ordinal(day.getMonth() + 1, day.getDate())

  return SEASONS.find(season => within(season, today))
}

/** How long the demonstration keeps a season, and how often the glyphs move on. */
export const DEMO_STEP_MS = 5000
const MOVE_MS = 2000

/** The season the demonstration shows at `now`: each in turn, every few seconds. */
export const demoSeason = (now: number): Season => SEASONS[Math.floor(now / DEMO_STEP_MS) % SEASONS.length]!

export const seasonById = (id: SeasonId): Season => SEASONS.find(season => season.id === id)!

/** A border cell run, merged with the one before when it has the same colour. */
const push = (cells: Cell[], text: string, color: string): void => {
  const last = cells[cells.length - 1]
  if (last && last.color === color) last.text += text
  else cells.push({ text, color })
}

/**
 * The top border of the frame with the season on it: glyphs set along it, or stripes. The width, the corners and the
 * plain text stay what they were; only the cells change. A border too narrow to carry it is returned as it is.
 */
export const decorateTop = (top: Line, season: Season, now: number): Line => {
  const inner = top.text.length - 2
  const own = top.color ?? '#a05800'
  if (inner < 8) return top

  const fill: Cell[] = Array.from({ length: inner }, (_, i) => ({
    text: '━',
    color: season.stripes ? season.stripes[Math.floor((i * season.stripes.length) / inner)]! : own,
  }))
  const count = season.glyphs.length === 0 ? 0 : (season.count ?? Math.floor(inner / 4))
  const phase = Math.floor(now / MOVE_MS)
  for (let k = 0; k < count; k++) {
    const at = Math.min(inner - 1, Math.round(((k + 0.5) * inner) / count))
    const turn = k + phase
    fill[at] = {
      text: season.glyphs[turn % season.glyphs.length]!,
      color: season.colors[turn % season.colors.length]!,
    }
  }

  const cells: Cell[] = []
  push(cells, top.text[0]!, own)
  for (const cell of fill) push(cells, cell.text, cell.color!)
  push(cells, top.text[top.text.length - 1]!, own)

  return { text: top.text.slice(0, 1) + fill.map(cell => cell.text).join('') + top.text.slice(-1), color: top.color, cells }
}
