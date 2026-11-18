// Time and agenda: the big time, date, weather, today's outlook and a timer.
import { formatClock } from '../format'
import { compose, maxRows } from '../layout'
import { FRAME_COLUMNS, frameLines } from '../sections/frame'
import type { Line } from '../sections/usage'
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
  const block = compose(chunks, Math.max(1, ctx.columns - FRAME_COLUMNS), blockRows, { stack: true })
  const lines: Line[] = frameLines(block, ctx.columns)

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
  const sky = [
    f.uv !== undefined ? `UV ${round(f.uv)}` : '',
    f.sunrise && f.sunset ? `${f.sunrise}–${f.sunset}` : '',
  ].filter(Boolean)
  const outlook = [today, sky].filter(parts => parts.length > 0).map(parts => parts.join(' · '))
  // One row when both fit side by side. When they do not (a tall, narrow
  // band) each keeps its own row, uncut, centered.
  const joined = outlook.join(' · ')
  // The icon leads the first row: one cell plus a space, cut around it.
  const lead = ctx.weather.icon ? `${ctx.weather.icon} ` : ''
  const leadCells = lead ? ICON_CELLS + 1 : 0
  const isSplit = outlook.length === 2 && leadCells + joined.length > ctx.columns
  const rows = outlook.length === 2 && !isSplit ? [joined] : outlook

  return rows.map((text, index): Line => {
    const head = index === 0 ? lead : ''
    const room = ctx.columns - (index === 0 ? leadCells : 0)

    return { text: head + text.slice(0, Math.max(0, room)), dimColor: true, align: 'center' }
  })
}

/** The countdown, while one runs. */
const timerLine = (ctx: GroupContext): Line[] => {
  if (ctx.timerEndsAt === undefined) return []
  const left = ctx.timerEndsAt - ctx.now

  return [left > 0 ? { text: `Timer ${formatClock(left)}` } : { text: 'Timer done', color: 'green' }]
}

export const time: Group = {
  id: 'time',
  priority: 0,
  lines: timeLines,
  strip: { min: 22, max: 34, lines: timeLines },
}
