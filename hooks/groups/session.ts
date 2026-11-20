// The Claude session: context, plan windows, time, cost, tools, turn, model.
import { formatClock, formatDuration } from '../format'
import { effortCells, modelName, hasRecentCalls, shortToolName, thinBar, toolBraille, toolRanking, toolSpark } from '../sections/stats'
import { RESOURCE_COLORS } from '../sections/palette'
import { blank, compactUsageLines, softRule, usageLines } from '../sections/usage'
import type { Cell, Line } from '../sections/usage'
import { flushRight, wrapCells, wrapParts } from '../sections/wrap'
import { versionLine } from '../update'
import type { Group, GroupContext } from './types'

/** The cost stands out in green, the lighter shade of the CPU bar. */
const COST_COLOR = '#68d391'
/** The tools take the green of the CPU bar. */
const SPARK_COLOR = RESOURCE_COLORS.cpu
/** The unfilled part of a thin bar. */
const TRACK_COLOR = '#4a5568'
/** The braille chart of the tools is this many rows tall. */
const CHART_ROWS = 3
const SPARK_WIDTH = 10

const joined = (cells: Cell[]): Line => ({ text: cells.map(cell => cell.text).join(''), cells })

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

/** What the session has cost (green) and, after three minutes, the rate per hour, then how long it has run. */
const costRow = (ctx: GroupContext): Line[] => {
  const { usage } = ctx
  if (usage?.startedAt === undefined) return []

  const elapsed = ctx.now - usage.startedAt
  const time = rows([{ text: 'Time ', dimColor: true }, { text: formatDuration(elapsed) }], ctx.columns, ctx.budget)
  if (usage.costUsd === undefined) return time

  const cells: Cell[] = [
    { text: 'Cost ', dimColor: true },
    { text: `$${usage.costUsd.toFixed(2)}`, color: COST_COLOR },
  ]
  if (elapsed >= 3 * 60_000) {
    cells.push({ text: `  $${(usage.costUsd / (elapsed / 3_600_000)).toFixed(2)}/h`, dimColor: true })
  }

  return [...rows(cells, ctx.columns, ctx.budget), ...time]
}

/** At most this many tools get a row of their own; the rest are counted in one more. */
const TOOL_ROWS = 6
const NAME_WIDTH = 12

/**
 * One row per tool used, the most used first, like a process list: its name, a bar as long as its calls next to the
 * busiest tool's, and the count. The tool running now has a `▸` and its name lit; the others are dim.
 * `rowsLeft` caps the rows; what does not fit is counted in a last `+N more` row.
 */
const toolListRows = (ctx: GroupContext, rowsLeft: number): Line[] => {
  const ranking = toolRanking(ctx.stats.toolCounts ?? {})
  if (ranking.length === 0 || rowsLeft < 1) return []

  const cap = Math.min(TOOL_ROWS, rowsLeft)
  const more = ranking.length > cap && cap > 1
  const listed = more ? cap - 1 : Math.min(cap, ranking.length)
  const rest = ranking.length - listed
  const busiest = ranking[0]?.count ?? 1
  const name = Math.min(NAME_WIDTH, Math.max(...ranking.slice(0, listed).map(tool => tool.name.length)))
  const digits = String(busiest).length
  const barWidth = ctx.columns - 2 - name - 1 - 1 - digits
  if (barWidth < 4) return []
  const running = ctx.stats.runningTool && shortToolName(ctx.stats.runningTool)

  const lines = ranking.slice(0, listed).map(tool => {
    const { fill, track } = thinBar(tool.count / busiest, barWidth)

    return joined([
      { text: tool.name === running ? '▸ ' : '  ', color: SPARK_COLOR },
      { text: tool.name.slice(0, name).padEnd(name), dimColor: tool.name !== running },
      { text: ` ${fill}`, color: SPARK_COLOR },
      { text: track, color: TRACK_COLOR },
      { text: ` ${String(tool.count).padStart(digits)}` },
    ])
  })

  return more ? [...lines, { text: `  +${rest} more`, dimColor: true }] : lines
}

/** `tools`, the calls so far and the tool running now, over the chart; on a narrow band it goes on a second row. */
const toolsHeader = (ctx: GroupContext): Line[] => {
  const { stats } = ctx
  const running = stats.runningTool ? ` ▸ ${shortToolName(stats.runningTool)}` : ' · last 10 min'

  return rows(
    [{ text: 'tools ', dimColor: true }, { text: `${stats.toolCalls} calls` }, { text: running, dimColor: true }],
    ctx.columns,
    ctx.budget,
  )
}

/**
 * The tool calls of the last ten minutes as a braille chart across the whole width, `CHART_ROWS` rows tall, between
 * two blank rows; nothing where no call fell in those ten minutes.
 */
const toolsChart = (ctx: GroupContext): Line[] => {
  const times = ctx.stats.toolTimes ?? []
  if (!hasRecentCalls(times, ctx.now)) return []

  return [
    blank(),
    ...toolBraille(times, ctx.now, ctx.columns, CHART_ROWS).map(text => ({ text, cells: [{ text, color: SPARK_COLOR }] })),
    blank(),
  ]
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

/** The current turn's time, or the last one's, at the right edge; nothing before the first turn. */
const turnRow = (ctx: GroupContext): Line[] => {
  const { stats } = ctx
  const turn =
    stats.turnStartedAt !== undefined
      ? `turn ${formatClock(ctx.now - stats.turnStartedAt)}`
      : stats.lastTurnMs !== undefined
        ? `last ${formatClock(stats.lastTurnMs)}`
        : ''

  return turn ? wrapParts([turn], ctx.columns).map(text => ({ text: flushRight(text, ctx.columns), dimColor: true })) : []
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
    // The cost, the tools and the turn are three blocks, each set apart from the next by a faint rule.
    const facts = [costRow(ctx), [...toolsHeader(ctx), ...toolsChart(ctx), ...toolListRows(ctx, TOOL_ROWS)], turnRow(ctx)]
      .filter(block => block.length > 0)
      .flatMap((block, i) => (i > 0 ? [softRule(ctx.columns), ...block] : block))

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

      if (!usage) return lines.slice(0, ctx.budget ?? Number.POSITIVE_INFINITY)

      // The tools take the rows the column has left, whole: header, chart and list, else the one-row chart.
      const budget = ctx.budget ?? Number.POSITIVE_INFINITY
      const head = [...lines, ...costRow(ctx), ...modelRow(ctx)]
      const chart = toolsChart(ctx)
      const tall = [...toolsHeader(ctx), ...chart]
      const tools = chart.length === 0 || head.length + tall.length <= budget ? tall : toolsRow(ctx)
      const base = [...head, ...tools]

      return [...base, ...toolListRows(ctx, budget - base.length)].slice(0, budget)
    },
  },
}
