// Time and agenda: the big time, date, weather, today's outlook and a timer.
import { formatClock } from '../format'
import { compose, maxRows } from '../layout'
import { decorateTop, seasonAt, seasonById } from '../season'
import { FRAME_COLUMNS, frameLines } from '../sections/frame'
import type { Line } from '../sections/usage'
import { wrapParts } from '../sections/wrap'
import { widgets } from '../widgets'
import { ICON_CELLS } from '../widgets/weather'
import type { Group, GroupContext } from './types'

const round = (n: number) => Math.round(n)

/** Rows the big clock and the text beside or below it take at most in the strip: three tall and a row of text. */
const MAX_BLOCK_ROWS = 4

/**
 * The time group. Stacked, the block takes the rows `maxRows` gives it. In the
 * strip (`ctx.budget`) the group is shaped to the rows it has: the outlook and
 * the timer take theirs first, the clock gets what is left (a one-row clock is
 * text, with the time first), and what does not fit below the frame is left out.
 */
const timeLines = (ctx: GroupContext): Line[] => {
  const outlook = outlookLines(ctx)
  const timer = timerLine(ctx)
  const extra = [...outlook, ...timer]
  const isStrip = ctx.budget !== undefined
  const blockRows = isStrip
    ? Math.max(1, Math.min(MAX_BLOCK_ROWS, (ctx.budget ?? 0) - 2 - extra.length))
    : maxRows(ctx.rows)

  // The frame is drawn around the block and costs it width, not rows: the
  // rows the block may take are the same as before. The time sits in the
  // middle of the frame, the weather text below it.
  const chunks = widgets
    .flatMap(widget => widget.chunks({ now: ctx.now, weather: ctx.weather }))
    .map(chunk => (isStrip && blockRows < 2 && chunk.big ? { ...chunk, rank: -1 } : chunk))
  const block = compose(chunks, Math.max(1, ctx.columns - FRAME_COLUMNS), blockRows, { stack: true, keepAll: !isStrip })
  const lines: Line[] = frameLines(block, ctx.columns)
  const season = ctx.season ? seasonById(ctx.season) : seasonAt(ctx.now)
  if (season && lines.length > 0) lines[0] = decorateTop(lines[0]!, season, ctx.now)

  // A greeting takes a row of its own, so only where rows are not counted: in the stacked band.
  if (season?.greeting && !isStrip) {
    lines.push({ text: season.greeting.text, color: season.greeting.color, align: 'center' })
  }

  for (const line of extra) {
    if (ctx.budget === undefined || lines.length < ctx.budget) lines.push(line)
  }

  return lines
}

/** Today's outlook under the frame: one row where it fits, two where it does not, centred. */
const outlookLines = (ctx: GroupContext): Line[] => {
  const f = ctx.weather.forecast
  if (!f) return []

  const today = [
    f.max !== undefined && f.min !== undefined ? `↑${round(f.max)}° ↓${round(f.min)}°` : '',
    f.rainPercent !== undefined ? `rain ${round(f.rainPercent)}%` : '',
  ].filter(Boolean)
  // Sunrise and sunset are left out, so the row is short enough to sit centred.
  const sky = [f.uv !== undefined ? `UV ${round(f.uv)}` : ''].filter(Boolean)
  const outlook = [today, sky].filter(parts => parts.length > 0).map(parts => parts.join(' · '))
  // One row when both fit side by side. When they do not (a tall, narrow
  // band) each keeps its own row, uncut, centered.
  const joined = outlook.join(' · ')
  // The icon leads the first row, set apart by ` · ` like the rest. Terminals often draw the icon two cells wide
  // over the one it is given, so a second space keeps the dot clear of it. The row is cut around it.
  const lead = ctx.weather.icon ? `${ctx.weather.icon}  · ` : ''
  const leadCells = lead ? ICON_CELLS + 4 : 0
  const isSplit = outlook.length === 2 && leadCells + joined.length > ctx.columns
  const rows = outlook.length === 2 && !isSplit ? [joined] : outlook

  // A row that is still too wide goes on further rows, whole parts first; the icon leads the first of them.
  const lines = rows.flatMap((text, index) => {
    const head = index === 0 ? lead : ''
    const room = ctx.columns - (index === 0 ? leadCells : 0)
    // In the strip the rows are few and fixed: there a row is cut, as the column keeps its height.
    const parts = text.length <= room ? [text] : ctx.budget === undefined ? wrapParts(text.split(' · '), Math.max(1, room)) : [text.slice(0, Math.max(0, room))]

    return parts.map((part, at): Line => ({ text: (at === 0 ? head : '') + part, dimColor: true, align: 'center' }))
  })

  return lines
}

/** The icon of the countdown: an hourglass Unicode does not count as an emoji, so it takes one cell on any terminal. */
const TIMER_ICON = '⧗'

/** The countdown, while one runs: centred, led by its icon. */
const timerLine = (ctx: GroupContext): Line[] => {
  if (ctx.timerEndsAt === undefined) return []
  const left = ctx.timerEndsAt - ctx.now

  return [
    left > 0
      ? { text: `${TIMER_ICON} Timer ${formatClock(left)}`, align: 'center' }
      : { text: `${TIMER_ICON} Timer done`, color: 'green', align: 'center' },
  ]
}

export const time: Group = {
  id: 'time',
  priority: 0,
  lines: timeLines,
  strip: { min: 22, max: 34, lines: timeLines },
}
