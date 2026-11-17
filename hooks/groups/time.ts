// Time and agenda: the big time, date, weather, today's outlook and a timer.
import { formatClock } from '../format'
import { compose, maxRows } from '../layout'
import { FRAME_COLUMNS, frameLines } from '../sections/frame'
import type { Line } from '../sections/usage'
import { widgets } from '../widgets'
import { ICON_CELLS } from '../widgets/weather'
import type { Group, GroupContext } from './types'

const round = (n: number) => Math.round(n)

export const time: Group = {
  id: 'time',
  priority: 0,
  lines: (ctx: GroupContext): Line[] => {
    const chunks = widgets.flatMap(widget => widget.chunks({ now: ctx.now, weather: ctx.weather }))
    // The frame is drawn around the block and costs it width, not rows: the
    // rows the block may take are the same as before. The time sits in the
    // middle of the frame, the weather text below it.
    const block = compose(chunks, Math.max(1, ctx.columns - FRAME_COLUMNS), maxRows(ctx.rows), { stack: true })
    const lines: Line[] = frameLines(block, ctx.columns)

    const f = ctx.weather.forecast
    if (f) {
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
      rows.forEach((text, index) => {
        const head = index === 0 ? lead : ''
        const room = ctx.columns - (index === 0 ? leadCells : 0)
        const cut = head + text.slice(0, Math.max(0, room))
        lines.push({ text: cut, dimColor: true, align: 'center' })
      })
    }

    if (ctx.timerEndsAt !== undefined) {
      const left = ctx.timerEndsAt - ctx.now
      lines.push(
        left > 0
          ? { text: `Timer ${formatClock(left)}` }
          : { text: 'Timer done', color: 'green' },
      )
    }

    return lines
  },
}
