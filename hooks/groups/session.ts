// The Claude session: context, plan windows, time, cost, model, tools.
import { formatClock, formatDuration } from '../format'
import { effortCells, modelName, toolSpark } from '../sections/stats'
import { compactUsageLines, paceNote, usageLines } from '../sections/usage'
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

/** How long the session has run, what it has cost (green) and, after three minutes, the cost per hour. */
const costRow = (ctx: GroupContext): Line | undefined => {
  const { usage } = ctx
  if (usage?.startedAt === undefined) return undefined

  const elapsed = ctx.now - usage.startedAt
  const cells: Cell[] = [{ text: formatDuration(elapsed) }]
  if (usage.costUsd !== undefined) {
    cells.push({ text: ' · ', dimColor: true }, { text: `$${usage.costUsd.toFixed(2)}`, color: COST_COLOR })
    if (elapsed >= 3 * 60_000) {
      cells.push({ text: ` · $${(usage.costUsd / (elapsed / 3_600_000)).toFixed(2)}/h`, dimColor: true })
    }
  }

  return row(cells, ctx.columns)
}

/** The tool calls of the last ten minutes as a chart, the total, and the tool running now. */
const toolsRow = (ctx: GroupContext): Line => {
  const { stats } = ctx
  const count = String(stats.toolCalls)
  const spark = toolSpark(
    stats.toolTimes ?? [],
    ctx.now,
    Math.min(SPARK_WIDTH, Math.max(0, ctx.columns - 7 - count.length)),
  )
  const room = ctx.columns - (6 + spark.length + 1 + count.length) - 3
  const running = stats.runningTool && room > 0 ? ` ▸ ${stats.runningTool.slice(0, room)}` : ''

  return row(
    [
      { text: 'tools ', dimColor: true },
      { text: spark, color: SPARK_COLOR },
      { text: ` ${count}` },
      ...(running ? [{ text: running, dimColor: true }] : []),
    ],
    ctx.columns,
  )
}

/** The current turn's time, or the last one's; nothing before the first turn. */
const turnText = (ctx: GroupContext): string => {
  const { stats } = ctx

  return stats.turnStartedAt !== undefined
    ? `turn ${formatClock(ctx.now - stats.turnStartedAt)}`
    : stats.lastTurnMs !== undefined
      ? `last ${formatClock(stats.lastTurnMs)}`
      : ''
}

/** The model by its short name and how hard it thinks, as pips; then the turn's time, dim, where it fits. */
const modelRow = (ctx: GroupContext): Line | undefined => {
  const { stats } = ctx
  const model = stats.model ?? stats.stepModel
  const turn = turnText(ctx)
  if (!model) return turn ? { text: turn.slice(0, ctx.columns), dimColor: true } : undefined

  const cells: Cell[] = [{ text: modelName(model) }, ...(stats.effort ? [{ text: ' ' }, ...effortCells(stats.effort)] : [])]
  const width = cells.reduce((sum, cell) => sum + cell.text.length, 0)
  if (turn && width + 3 + turn.length <= ctx.columns) cells.push({ text: ` · ${turn}`, dimColor: true })

  return row(cells, ctx.columns)
}

const present = (lines: (Line | undefined)[]): Line[] => lines.filter((line): line is Line => line !== undefined)

export const session: Group = {
  id: 'session',
  label: 'Claude',
  priority: 1,
  footnote: (ctx: GroupContext): Line[] => paceNote(ctx.usage, ctx.columns, ctx.now),
  // The context and plan bars, then the cost, the model and the tools: no rule between them, the bars set
  // themselves apart.
  lines: (ctx: GroupContext): Line[] => {
    const { usage, stats } = ctx

    return [
      ...usageLines(usage && { ...usage, categories: stats.categories }, ctx.columns, ctx.now),
      ...present([costRow(ctx), modelRow(ctx), toolsRow(ctx)]),
    ]
  },
  // In the strip the same facts in fewer rows, the ones that matter most first.
  strip: {
    min: 28,
    max: 40,
    lines: (ctx: GroupContext): Line[] => {
      const { usage, stats } = ctx
      const lines = compactUsageLines(usage && { ...usage, categories: stats.categories }, ctx.columns, ctx.now)

      return [...lines, ...(usage ? present([costRow(ctx), modelRow(ctx), toolsRow(ctx)]) : [])].slice(
        0,
        ctx.budget ?? Number.POSITIVE_INFINITY,
      )
    },
  },
}
