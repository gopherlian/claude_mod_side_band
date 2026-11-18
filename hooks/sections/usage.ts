// The usage section: context of this session, plus what the account allows.
import { formatLeft } from '../format'
import { compositionCells, compositionLegend } from './context'
import type { Category } from './context'
import { wrap } from './wrap'

export type UsageData = {
  contextTokens?: number
  contextWindow: number
  contextPercent?: number
  /** US dollars this session; present on API accounts and subscriptions alike. */
  costUsd?: number
  /** Rate-limit windows; empty off a subscription or before the first reading. */
  limits: { kind: string; percentUsed: number; resetsAt?: string }[]
  /** When the session began, in `$.clock.now()` milliseconds. */
  startedAt?: number
  /** What fills the context window; with it the context bar is drawn in runs. */
  categories?: Category[]
}

export type Line = {
  text: string
  color?: string
  dimColor?: boolean
  /** Drawn in the middle of the row instead of at the left; the text itself is not padded. */
  align?: 'center'
  /** Drawn instead of `text` when the row has more than one colour; `text` is the same row without colour. */
  cells?: Cell[]
}

/** A run of a coloured row. */
export type Cell = { text: string; color?: string; backgroundColor?: string; dimColor?: boolean }

/** Plan windows, in the order they are drawn. Unlisted kinds follow. */
const LIMITS: { kind: string; label: string }[] = [
  { kind: 'five_hour', label: 'Session' },
  { kind: 'seven_day', label: 'Weekly' },
]
const EXTRA_LABELS: Record<string, string> = { spend_limit: 'Spend' }

/** How long each plan window lasts; with it the bar can show how much of it has gone by. */
const WINDOW_MS: Record<string, number> = { five_hour: 5 * 3_600_000, seven_day: 7 * 86_400_000 }

const LABEL_WIDTH = 8
const PERCENT_WIDTH = 4
/** The tick on a bar: where the time of the window stands, against the fill of what is used. */
const MARK = '┃'
/** The tick is green so it stands apart from the white bar and from its orange and red warnings. */
const MARK_COLOR = 'green'

type Limit = UsageData['limits'][number]

/** The plan windows in the order they are drawn: the known ones always, the others after. */
const windows = (limits: Limit[]): { label: string; limit?: Limit }[] => {
  const byKind = new Map(limits.map(limit => [limit.kind, limit]))
  const known = new Set(LIMITS.map(window => window.kind))

  return [
    ...LIMITS.map(window => ({ label: window.label, limit: byKind.get(window.kind) })),
    ...limits
      .filter(limit => !known.has(limit.kind))
      .map(limit => ({ label: EXTRA_LABELS[limit.kind] ?? limit.kind, limit })),
  ]
}

/** When a window ends, in the clock of `now`; undefined if it does not say or says it badly. */
const endsAt = (limit: Limit | undefined): number | undefined => {
  const ends = limit?.resetsAt ? Date.parse(limit.resetsAt) : NaN

  return Number.isNaN(ends) ? undefined : ends
}

/** The share of a window already gone, 0 to 1; undefined where its length or end is not known. */
const elapsedShare = (limit: Limit | undefined, now: number | undefined): number | undefined => {
  const span = limit ? WINDOW_MS[limit.kind] : undefined
  const ends = endsAt(limit)
  if (span === undefined || ends === undefined || now === undefined) return undefined

  return Math.min(1, Math.max(0, 1 - (ends - now) / span))
}

/**
 * The separators are orange. `dimColor` would replace the colour with the theme's
 * dim one, so the faint rules take a darker orange instead of being dimmed.
 */
export const RULE_COLOR = '#a05800'
export const SOFT_RULE_COLOR = '#744000'
/** The separator inside a group: a very faint grey, seen only when looked for. */
export const INNER_RULE_COLOR = '#3a3a3a'

/** The heavy line that opens a group. Inside a group, `softRule` is used. */
export const rule = (columns: number): Line => ({
  text: '━'.repeat(columns),
  color: RULE_COLOR,
})

/**
 * A discreet line between blocks inside a group: a thin line across the band in
 * a very faint grey, far less ink than the orange `rule` that opens a group.
 */
export const softRule = (columns: number): Line => ({
  text: '─'.repeat(columns),
  color: INNER_RULE_COLOR,
})

/**
 * A row with nothing on it. It holds a space, so the row is drawn where an
 * empty text might take no height at all.
 */
export const blank = (): Line => ({ text: ' ' })

/**
 * A rule that names the section it opens (`━━ Claude ━━━━`), as wide as the
 * band. It takes the row a plain rule would, so naming costs nothing.
 */
export const titledRule = (label: string, columns: number): Line => {
  const head = `━━ ${label} `

  return {
    text: head.length >= columns ? head.slice(0, columns) : head + '━'.repeat(columns - head.length),
    color: RULE_COLOR,
  }
}

export const formatTokens = (n: number): string =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${Math.round(n / 1_000)}k`
      : String(n)

/** Warmer colors as a window fills: yellow from 70%, red from 85%. */
export const colorFor = (percent: number | undefined): string | undefined =>
  percent === undefined ? undefined : percent >= 85 ? 'red' : percent >= 70 ? 'yellow' : undefined

/** The empty part of a bar: a thin line, so the fill reads as a solid gauge over it. */
export const TRACK = '─'

/** The last cell of a fill, by eighths: the bar moves one eighth of a cell at a time. */
const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']

/** A bar `width` cells long: whole blocks, an eighth-step block where the fill ends, then the track. */
export const bar = (percent: number, width: number): string => {
  const eighths = Math.round((Math.min(100, Math.max(0, percent)) / 100) * width * 8)
  const full = Math.floor(eighths / 8)
  const part = full < width ? (EIGHTHS[eighths % 8] ?? '') : ''

  return '█'.repeat(full) + part + TRACK.repeat(width - full - (part ? 1 : 0))
}

/** What the tick means, longest wording first; the row takes the first that fits the band. */
const LEGEND = [`${MARK} time elapsed in the window`, `${MARK} time elapsed`]

/** The one-row legend of the tick, for the strip, which has no footnote; nothing where not even the short wording fits. */
const legendLines = (columns: number): Line[] => {
  const text = LEGEND.find(wording => wording.length <= columns)

  return text === undefined ? [] : [{ text, dimColor: true }]
}

/** A tick over the bar, at `share` (0 to 1) of its length; it replaces the cell it lands on. */
const withMark = (drawn: string, share: number): string => {
  const at = Math.min(drawn.length - 1, Math.floor(Math.min(1, Math.max(0, share)) * drawn.length))

  return drawn.slice(0, at) + MARK + drawn.slice(at + 1)
}

/**
 * A row that holds the tick, drawn in cells so the tick alone is green and the
 * rest keeps the row's own colour. `text` stays the plain row. Other rows come back as they are.
 */
const withMarks = (line: Line): Line => {
  const parts = line.text.split(/(┃)/).filter(part => part !== '')
  if (!parts.includes(MARK)) return line

  return {
    ...line,
    cells: parts.map(part =>
      part === MARK ? { text: part, color: MARK_COLOR } : { text: part, color: line.color, dimColor: line.dimColor },
    ),
  }
}

/**
 * One meter: an optional label, a bar and the number, filling `columns`.
 * Without a percent (no reading yet) the bar is empty and the number a dash.
 * With `mark`, the share of its window already gone, a tick shows where the
 * time stands: right of the fill you are under the pace, left of it over.
 */
export const meter = (
  label: string,
  percent: number | undefined,
  columns: number,
  mark?: number,
): string => {
  const head = label ? label.padEnd(LABEL_WIDTH) : ''
  const width = Math.max(4, columns - head.length - 1 - PERCENT_WIDTH)
  const number = (percent === undefined ? '—' : `${Math.round(percent)}%`).padStart(PERCENT_WIDTH)
  const drawn = percent === undefined ? TRACK.repeat(width) : bar(percent, width)

  return `${head}${mark === undefined ? drawn : withMark(drawn, mark)} ${number}`
}

const PACE_NOTE = `${MARK} inside the fill: over pace; beyond it: under pace.`

/**
 * How to read the tick, wrapped to the band, the tick green and the rest dim.
 * Nothing while no bar carries a tick. It is long, so it is drawn only where
 * the band has rows to spare.
 */
export const paceNote = (data: UsageData | undefined, columns: number, now?: number): Line[] => {
  if (!usageLines(data, columns, now).some(line => line.text.includes(MARK))) return []

  return wrap(PACE_NOTE, columns).map(text => withMarks({ text, dimColor: true }))
}

/** The time left at the end of a window's row, right-aligned in this many cells. */
const LEFT_WIDTH = 6
/** The time left is drawn only while the bar keeps this many cells. */
const MIN_BAR_WITH_LEFT = 8

/**
 * One plan window: its label, a bar with the tick of its time, the percent and,
 * where the bar keeps at least 8 cells, the time left, short and dim.
 */
const windowRow = (label: string, limit: Limit | undefined, columns: number, now: number | undefined): Line => {
  const percent = limit?.percentUsed
  const ends = endsAt(limit)
  const left = ends !== undefined && now !== undefined ? formatLeft(ends - now) : undefined
  const room = columns - LABEL_WIDTH - 1 - PERCENT_WIDTH
  const withLeft = left !== undefined && room - (LEFT_WIDTH + 1) >= MIN_BAR_WITH_LEFT
  const base: Line = {
    text: meter(label, percent, withLeft ? columns - LEFT_WIDTH - 1 : columns, elapsedShare(limit, now)),
    color: colorFor(percent),
    dimColor: percent === undefined,
  }
  const marked = withMarks(base)
  if (!withLeft) return marked

  const tail = ` ${left.padStart(LEFT_WIDTH)}`

  return {
    ...marked,
    text: marked.text + tail,
    cells: [...(marked.cells ?? [{ text: marked.text, color: base.color, dimColor: base.dimColor }]), { text: tail, dimColor: true }],
  }
}

/**
 * The context bar. With the breakdown it is drawn in runs, one colour per
 * consumer, and its number carries the warning colour; without it, the plain bar.
 */
const contextBar = (data: UsageData, columns: number): Line => {
  const runs = compositionCells(data.categories, Math.max(4, columns - 1 - PERCENT_WIDTH))
  if (!runs) {
    return {
      text: meter('', data.contextPercent, columns),
      color: colorFor(data.contextPercent),
      dimColor: data.contextPercent === undefined,
    }
  }
  const number = ` ${(data.contextPercent === undefined ? '—' : `${Math.round(data.contextPercent)}%`).padStart(PERCENT_WIDTH)}`
  const cells = [...runs, { text: number, color: colorFor(data.contextPercent) }]

  return { text: cells.map(cell => cell.text).join(''), cells }
}

/**
 * The lines of the section, each at most `columns` cells wide. Given `now`,
 * the plan meters carry a tick for how much of their window has gone by; the
 * footnote (`paceNote`) explains how to read it.
 */
export const usageLines = (data: UsageData | undefined, columns: number, now?: number): Line[] => {
  if (!data) return [{ text: 'Usage unavailable', dimColor: true }]

  const tokens = data.contextTokens === undefined ? '—' : formatTokens(data.contextTokens)
  const lines: Line[] = [
    {
      text: `Context ${tokens} / ${formatTokens(data.contextWindow)}`,
      color: colorFor(data.contextPercent),
    },
    contextBar(data, columns),
  ]
  // A faint rule sets the legend of the runs apart from the plan windows.
  const legend = compositionLegend(data.categories, columns).map(cells => ({ text: cells.map(cell => cell.text).join(''), cells }))
  lines.push(...legend)
  if (legend.length > 0) lines.push(softRule(columns))

  for (const { label, limit } of windows(data.limits)) lines.push(windowRow(label, limit, columns, now))

  // A row that passes the band is cut and drawn plain: its cells no longer add up to its text.
  return lines.map(line =>
    line.text.length <= columns && (line.cells || !line.text.includes(MARK))
      ? line
      : withMarks({ ...line, text: line.text.slice(0, columns), cells: undefined }),
  )
}

/**
 * The plan and the context in as few rows as they can take: `Context` and its
 * bar on one row, a row per plan window, and the legend of the tick.
 */
export const compactUsageLines = (data: UsageData | undefined, columns: number, now?: number): Line[] => {
  if (!data) return [{ text: 'Usage unavailable', dimColor: true }]

  const bar = contextBar(data, Math.max(1, columns - LABEL_WIDTH))
  const label: Cell = { text: 'Context'.padEnd(LABEL_WIDTH), color: colorFor(data.contextPercent) }
  const lines: Line[] = [
    {
      text: label.text + bar.text,
      cells: [label, ...(bar.cells ?? [{ text: bar.text, color: bar.color, dimColor: bar.dimColor }])],
    },
    ...windows(data.limits).map(({ label: name, limit }) => windowRow(name, limit, columns, now)),
  ]
  if (lines.some(line => line.text.includes(MARK))) lines.push(...legendLines(columns).map(withMarks))

  return lines
}
