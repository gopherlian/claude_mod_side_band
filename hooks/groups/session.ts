// The Claude session: context, plan windows, time, cost, tools, turn, model.
import { formatClock, formatDuration } from '../format'
import { effortCells, modelName, toolSpark } from '../sections/stats'
import { paceNote, softRule, usageLines } from '../sections/usage'
import type { Cell, Line } from '../sections/usage'
import type { Group, GroupContext } from './types'

/** The cost stands out in green, the lighter shade of the CPU bar. */
const COST_COLOR = '#68d391'
/** The tools chart borrows the violet of the RAM bar. */
const SPARK_COLOR = '#c084fc'
const SPARK_WIDTH = 10

/** A row drawn from cells; where it would pass `columns` it is cut and drawn plain and dim. */
const row = (cells: Cell[], columns: number): Line => {
  const text = cells.map(cell => cell.text).join('')

  return text.length <= columns ? { text, cells } : { text: text.slice(0, columns), dimColor: true }
}

export const session: Group = {
  id: 'session',
  label: 'Claude',
  priority: 1,
  footnote: (ctx: GroupContext): Line[] => paceNote(ctx.usage, ctx.columns, ctx.now),
  lines: (ctx: GroupContext): Line[] => {
    const { usage, stats } = ctx
    const lines = usageLines(usage && { ...usage, categories: stats.categories }, ctx.columns, ctx.now, ctx.noted)

    if (usage?.startedAt !== undefined) {
      const elapsed = ctx.now - usage.startedAt
      const cells: Cell[] = [{ text: formatDuration(elapsed) }]
      if (usage.costUsd !== undefined) {
        cells.push({ text: ' · ', dimColor: true }, { text: `$${usage.costUsd.toFixed(2)}`, color: COST_COLOR })
        if (elapsed >= 3 * 60_000) {
          cells.push({ text: ` · $${(usage.costUsd / (elapsed / 3_600_000)).toFixed(2)}/h`, dimColor: true })
        }
      }
      lines.push(row(cells, ctx.columns))
    }

    // The tool calls of the last ten minutes as a chart, the total, and the tool running now.
    const count = String(stats.toolCalls)
    const spark = toolSpark(
      stats.toolTimes ?? [],
      ctx.now,
      Math.min(SPARK_WIDTH, Math.max(0, ctx.columns - 7 - count.length)),
    )
    const room = ctx.columns - (6 + spark.length + 1 + count.length) - 3
    const running = stats.runningTool && room > 0 ? ` ▸ ${stats.runningTool.slice(0, room)}` : ''
    lines.push(
      row(
        [
          { text: 'tools ', dimColor: true },
          { text: spark, color: SPARK_COLOR },
          { text: ` ${count}` },
          ...(running ? [{ text: running, dimColor: true }] : []),
        ],
        ctx.columns,
      ),
    )

    const turn =
      stats.turnStartedAt !== undefined
        ? `turn ${formatClock(ctx.now - stats.turnStartedAt)}`
        : stats.lastTurnMs !== undefined
          ? `last ${formatClock(stats.lastTurnMs)}`
          : ''
    if (turn) lines.push({ text: turn.slice(0, ctx.columns), dimColor: true })

    // The model and how hard it thinks, apart from the rest.
    const model = stats.model ?? stats.stepModel
    if (model) {
      lines.push(softRule(ctx.columns))
      lines.push(
        row([{ text: modelName(model) }, ...(stats.effort ? [{ text: ' ' }, ...effortCells(stats.effort)] : [])], ctx.columns),
      )
    }

    return lines
  },
}
