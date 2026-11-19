// Small decorations for a few days of the year: a very dark background behind the time frame and a slanted tag on its
// top border that names the day. The date alone decides; nothing is read or written, and nothing moves.
import type { Cell, Line } from './sections/usage'

export type SeasonId = 'valentine' | 'summer' | 'donis' | 'halloween' | 'nochebuena' | 'navidad' | 'reyes'

export type Season = {
  id: SeasonId
  /** First and last day, as `[month, day]` (month 1 to 12), both inside the range; a range may cross New Year. */
  from: [number, number]
  to: [number, number]
  /** What the tag says, and the symbol of the day that leads it. */
  name: string
  icon: string
  /** Symbols drawn in turn, in light grey, on the blank cells of the square; none where the background says it all. */
  motif?: string[]
  /** The colour of the tag. */
  accent: string
  /** The background of the cell at `column` of the `row`th row inside the frame: always a very dark colour. */
  background: (row: number, column: number) => string
}

/** The text of the tag: dark, so it reads on any accent. */
const TAG_TEXT = '#111111'

const flat = (colour: string) => () => colour

// The Royal Senyera: a strong blue band at the pole, then red bars on gold in very dark tones, a bar to a row.
const BAND_COLUMNS = 9
const senyera = (row: number, column: number): string =>
  column < BAND_COLUMNS ? '#1b4f8a' : row % 2 === 0 ? '#2e2408' : '#2e0e10'

/** The motifs are light grey, drawn over the background where nothing is written. */
const MOTIF_COLOR = '#8f8f8f'
/** A motif glyph every this many cells along a row, each row a little further on. */
const MOTIF_SPACING = 4

/** In the order of the year from February; the demonstration walks through them in this order. */
export const SEASONS: Season[] = [
  { id: 'valentine', from: [2, 12], to: [2, 14], name: 'San Valentín', icon: '♥', motif: ['♥'], accent: '#ec7ab0', background: flat('#2a1224') },
  { id: 'summer', from: [6, 21], to: [9, 22], name: 'Verano', icon: '☀', motif: ['≈', '≈', '☀'], accent: '#e6b422', background: flat('#0c2430') },
  { id: 'donis', from: [10, 7], to: [10, 9], name: 'Sant Donís', icon: '⚑', accent: '#d69e2e', background: senyera },
  { id: 'halloween', from: [10, 24], to: [11, 1], name: 'Halloween', icon: '☾', motif: ['☾', '▲', '✶'], accent: '#a78bfa', background: flat('#1b1030') },
  { id: 'nochebuena', from: [12, 24], to: [12, 24], name: 'Nochebuena', icon: '✦', motif: ['✦', '✧'], accent: '#68d391', background: flat('#0f2417') },
  { id: 'navidad', from: [12, 25], to: [1, 4], name: 'Navidad', icon: '❄', motif: ['❄', '✦'], accent: '#e57373', background: flat('#2a1012') },
  { id: 'reyes', from: [1, 5], to: [1, 6], name: 'Reyes Magos', icon: '♚', motif: ['♚', '★'], accent: '#e6b422', background: flat('#2a2208') },
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

/** The top border with the slanted tag right after its left corner; as it was where the tag does not fit. */
const withTag = (top: Line, season: Season): Line => {
  const border = perChar(top)
  const text = `${season.icon} ${season.name}`
  const width = [...text].length + 4
  if (width + 2 > border.length - 2) return top

  const tag: Cell[] = [
    { text: '◢', color: season.accent },
    ...[...` ${text} `].map(char => ({ text: char, color: TAG_TEXT, backgroundColor: season.accent })),
    { text: '◤', color: season.accent },
  ]
  const cells = [border[0]!, ...tag, ...border.slice(1 + width)]

  return { text: cells.map(cell => cell.text).join(''), color: top.color, cells: merged(cells) }
}

/**
 * The motif on a row: its glyphs set on blank cells that have a blank on each side, in the margins of the row, a few cells apart, each row
 * further along than the one above. Anything written stays where it is.
 */
const withMotif = (cells: Cell[], row: number, motif: string[]): Cell[] => {
  const blank = (at: number) => cells[at]?.text === ' '
  // The motif keeps to the margins: what is written, the clock included, is never between two glyphs.
  const written = cells.map((cell, at) => (at >= 2 && at <= cells.length - 3 && cell.text !== ' ' ? at : -1)).filter(at => at >= 0)
  const first = written.length > 0 ? Math.min(...written) : cells.length
  const last = written.length > 0 ? Math.max(...written) : -1

  return cells.map((cell, column) => {
    if (column >= first && column <= last) return cell
    const turn = column + 2 * row
    if (column < 2 || column > cells.length - 3 || turn % MOTIF_SPACING !== 0) return cell
    if (!blank(column - 1) || !blank(column) || !blank(column + 1)) return cell

    return { text: motif[(Math.floor(turn / MOTIF_SPACING) + row) % motif.length]!, color: MOTIF_COLOR, backgroundColor: cell.backgroundColor }
  })
}

/**
 * The frame's lines dressed for `season`: the very dark background of the day behind every row inside the frame, over
 * the text's own colours, and the tag on the top border. Text, width and rows stay what they were.
 */
export const dress = (lines: Line[], season: Season): Line[] =>
  lines.map((line, index) => {
    if (index === 0) return withTag(line, season)
    if (index === lines.length - 1) return line

    const painted = perChar(line).map((cell, column) => ({ ...cell, backgroundColor: season.background(index - 1, column) }))
    const cells = season.motif ? withMotif(painted, index - 1, season.motif) : painted

    return { ...line, text: cells.map(cell => cell.text).join(''), cells: merged(cells) }
  })
