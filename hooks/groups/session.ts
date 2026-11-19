// The Claude session: context, plan windows, time, cost, tools, turn, model.
import { formatClock, formatDuration } from '../format'
import { effortCells, modelName, toolSpark } from '../sections/stats'
import { compactUsageLines, softRule, usageLines } from '../sections/usage'
import type { Cell, Line } from '../sections/usage'
import { wrapCells, wrapParts } from '../sections/wrap'
import { versionLine } from '../update'
import type { Group, GroupContext } from './types'

/** The cost stands out in green, the lighter shade of the CPU bar. */
const COST_COLOR = '#68d391'
/** The tools chart borrows the violet of the RAM bar. */
const SPARK_COLOR = '#c084fc'
const SPARK_WIDTH = 10

/**
 * A row drawn from cells. Where it would pass `columns` it goes on further rows, at its spaces, each run keeping its
 * colour; in the strip (`budget`), where a column keeps its height, it is cut and drawn plain and dim instead.
 */
const rows = (cells: Cell[], columns: number, budget?: number): Line[] => {
  const text = cells.map(cell => cell.text).join('')
  if (text.length <= columns) return [{ text, cells }]
  if (budget !== undefined) return [{ text: text.slice(0, columns), dimColor: true }]

  return wrapCells(cells, columns).map(run => ({ text: run.map(cell => cell.text).join(''), cells: run }))
}

/** How long the session has run, what it has cost (green) and, after three minutes, the cost per hour. */
const costRow = (ctx: GroupContext): Line[] => {
  const { usage } = ctx
  if (usage?.startedAt === undefined) return []

  const elapsed = ctx.now - usage.startedAt
  const cells: Cell[] = [{ text: formatDuration(elapsed) }]
  if (usage.costUsd !== undefined) {
    cells.push({ text: ' · ', dimColor: true }, { text: `$${usage.costUsd.toFixed(2)}`, color: COST_COLOR })
    if (elapsed >= 3 * 60_000) {
      cells.push({ text: ` · $${(usage.costUsd / (elapsed / 3_600_000)).toFixed(2)}/h`, dimColor: true })
    }
  }

  return rows(cells, ctx.columns, ctx.budget)
}

/** The tool calls of the last ten minutes as a chart, the total, and the tool running now. */
const toolsRow = (ctx: GroupContext): Line[] => {
  const { stats } = ctx
  const count = String(stats.toolCalls)
  const spark = toolSpark(
    stats.toolTimes ?? [],
    ctx.now,
    Math.min(SPARK_WIDTH, Math.max(0, ctx.columns - 7 - count.length)),
  )
  const room = ctx.columns - (6 + spark.length + 1 + count.length) - 3
  const running = stats.runningTool && room > 0 ? ` ▸ ${stats.runningTool.slice(0, room)}` : ''

  return rows(
    [
      { text: 'tools ', dimColor: true },
      { text: spark, color: SPARK_COLOR },
      { text: ` ${count}` },
      ...(running ? [{ text: running, dimColor: true }] : []),
    ],
    ctx.columns,
    ctx.budget,
  )
}

/** The current turn's time, or the last one's; nothing before the first turn. */
const turnRow = (ctx: GroupContext): Line[] => {
  const { stats } = ctx
  const turn =
    stats.turnStartedAt !== undefined
      ? `turn ${formatClock(ctx.now - stats.turnStartedAt)}`
      : stats.lastTurnMs !== undefined
        ? `last ${formatClock(stats.lastTurnMs)}`
        : ''

  return turn ? wrapParts([turn], ctx.columns).map(text => ({ text, dimColor: true })) : []
}

/** The model by its short name and how hard it thinks, as pips. */
const modelRow = (ctx: GroupContext): Line[] => {
  const { stats } = ctx
  const model = stats.model ?? stats.stepModel
  if (!model) return []

  return rows(
    [{ text: modelName(model) }, ...(stats.effort ? [{ text: ' ' }, ...effortCells(stats.effort)] : [])],
    ctx.columns,
    ctx.budget,
  )
}

export const session: Group = {
  id: 'session',
  label: 'Claude',
  priority: 1,
  heading: (ctx: GroupContext): Line | undefined => (ctx.update ? versionLine(ctx.update, ctx.columns) : undefined),
  lines: (ctx: GroupContext): Line[] => {
    const { usage, stats } = ctx
    const model = modelRow(ctx)
    const facts = [...costRow(ctx), ...toolsRow(ctx), ...turnRow(ctx)]

    return [
      ...usageLines(usage && { ...usage, categories: stats.categories }, ctx.columns, ctx.now),
      // A faint rule sets the bars apart from the session's facts.
      ...(usage && facts.length > 0 ? [softRule(ctx.columns)] : []),
      ...facts,
      ...(model.length > 0 ? [softRule(ctx.columns), ...model] : []),
    ]
  },
  // In the strip the same facts in fewer rows, the ones that matter most first.
  strip: {
    min: 28,
    max: 40,
    lines: (ctx: GroupContext): Line[] => {
      const { usage, stats } = ctx
      const lines = compactUsageLines(usage && { ...usage, categories: stats.categories }, ctx.columns, ctx.now)

      return [...lines, ...(usage ? [...costRow(ctx), ...modelRow(ctx), ...toolsRow(ctx)] : [])].slice(
        0,
        ctx.budget ?? Number.POSITIVE_INFINITY,
      )
    },
  },
}
