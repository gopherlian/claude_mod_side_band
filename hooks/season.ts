// Small decorations for a few days of the year: a very dark background behind the time frame and a slanted tag on its
// top border that names the day. The date alone decides; nothing is read or written, and nothing moves.
import type { Cell, Line } from './sections/usage'

export type SeasonId = 'valentine' | 'summer' | 'donis' | 'halloween' | 'nochebuena' | 'navidad' | 'reyes'

export type Season = {
  id: SeasonId
  /** First and last day, as `[month, day]` (month 1 to 12), both inside the range; a range may cross New Year. */
  from: [number, number]
  to: [number, number]
  /** What the tag says. */
  name: string
  /** The colour of the tag. */
  accent: string
  /** The background of the cell at `column` of the `row`th row inside the frame: always a very dark colour. */
  background: (row: number, column: number) => string
}

/** The text of the tag: dark, so it reads on any accent. */
const TAG_TEXT = '#111111'

const flat = (colour: string) => () => colour

// The Royal Senyera in very dark tones: a blue band at the pole, then red bars on gold, a bar to a row.
const BAND_COLUMNS = 3
const senyera = (row: number, column: number): string =>
  column < BAND_COLUMNS ? '#0e2236' : row % 2 === 0 ? '#2e2408' : '#2e0e10'

/** In the order of the year from February; the demonstration walks through them in this order. */
export const SEASONS: Season[] = [
  { id: 'valentine', from: [2, 12], to: [2, 14], name: 'San Valentín', accent: '#ec7ab0', background: flat('#2a1224') },
  { id: 'summer', from: [6, 21], to: [9, 22], name: 'Verano', accent: '#e6b422', background: flat('#0c2430') },
  { id: 'donis', from: [10, 7], to: [10, 9], name: 'Sant Donís', accent: '#d69e2e', background: senyera },
  { id: 'halloween', from: [10, 24], to: [11, 1], name: 'Halloween', accent: '#a78bfa', background: flat('#1b1030') },
  { id: 'nochebuena', from: [12, 24], to: [12, 24], name: 'Nochebuena', accent: '#68d391', background: flat('#0f2417') },
  { id: 'navidad', from: [12, 25], to: [1, 4], name: 'Navidad', accent: '#e57373', background: flat('#2a1012') },
  { id: 'reyes', from: [1, 5], to: [1, 6], name: 'Reyes Magos', accent: '#e6b422', background: flat('#2a2208') },
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

/** How long the demonstration keeps a season. */
export const DEMO_STEP_MS = 5000

/** The season the demonstration shows at `now`: each in turn, every few seconds. */
export const demoSeason = (now: number): Season => SEASONS[Math.floor(now / DEMO_STEP_MS) % SEASONS.length]!

export const seasonById = (id: SeasonId): Season => SEASONS.find(season => season.id === id)!

/** Cells to the right of the tag on the border: the border goes on a little past it. */
const TAG_MARGIN = 2
/** The triangles and the spaces around the name. */
const TAG_EXTRA = 4

const sameStyle = (a: Cell, b: Cell): boolean =>
  a.color === b.color && a.dimColor === b.dimColor && a.backgroundColor === b.backgroundColor

/** Runs of equal style merged, so a row stays a few cells long. */
const merged = (cells: Cell[]): Cell[] => {
  const out: Cell[] = []
  for (const cell of cells) {
    const last = out[out.length - 1]
    if (last && sameStyle(last, cell)) last.text += cell.text
    else out.push({ ...cell })
  }

  return out
}

/** One cell per character, each keeping the style of the run it came from. */
const perChar = (line: Line): Cell[] =>
  (line.cells ?? [{ text: line.text, color: line.color, dimColor: line.dimColor }]).flatMap(cell =>
    [...cell.text].map(char => ({ ...cell, text: char })),
  )

/** The top border with the slanted tag set near its right corner; as it was where the tag does not fit. */
const withTag = (top: Line, season: Season): Line => {
  const border = perChar(top)
  const tag = [
    { text: '◢', color: season.accent },
    { text: ` ${season.name} `, color: TAG_TEXT, backgroundColor: season.accent },
    { text: '◤', color: season.accent },
  ]
  const width = [...season.name].length + TAG_EXTRA
  const start = border.length - 1 - TAG_MARGIN - width
  if (start < 3) return top

  const cells = [...border.slice(0, start), ...tag.flatMap(cell => (cell.text.length === 1 ? [cell] : [...cell.text].map(char => ({ ...cell, text: char })))), ...border.slice(start + width)]

  return { text: cells.map(cell => cell.text).join(''), color: top.color, cells: merged(cells) }
}

/**
 * The frame's lines dressed for `season`: the very dark background of the day behind every row inside the frame, over
 * the text's own colours, and the tag on the top border. Text, width and rows stay what they were.
 */
export const dress = (lines: Line[], season: Season): Line[] =>
  lines.map((line, index) => {
    if (index === 0) return withTag(line, season)
    if (index === lines.length - 1) return line

    const cells = perChar(line).map((cell, column) => ({ ...cell, backgroundColor: season.background(index - 1, column) }))

    return { ...line, cells: merged(cells) }
  })
