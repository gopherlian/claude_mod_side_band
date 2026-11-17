// The Claude session: context, plan windows, time, cost, turn, tools.
import { formatClock, formatDuration } from '../format'
import { formatTokens, paceNote, resetLines, softRule, usageLines } from '../sections/usage'
import type { Line } from '../sections/usage'
import type { Group, GroupContext } from './types'

export const session: Group = {
  id: 'session',
  label: 'Claude',
  priority: 1,
  footnote: (ctx: GroupContext): Line[] => paceNote(ctx.usage, ctx.columns, ctx.now),
  lines: (ctx: GroupContext): Line[] => {
    const lines = usageLines(ctx.usage, ctx.columns, ctx.now, ctx.noted)
    const { usage, stats } = ctx
    const dim = (text: string) => lines.push({ text: text.slice(0, ctx.columns), dimColor: true })

    lines.push(...resetLines(usage, ctx.columns, ctx.now))

    if (usage?.startedAt !== undefined) {
      const elapsed = ctx.now - usage.startedAt
      const parts = [formatDuration(elapsed)]
      if (usage.costUsd !== undefined) {
        parts.push(`$${usage.costUsd.toFixed(2)}`)
        if (elapsed >= 3 * 60_000) parts.push(`$${(usage.costUsd / (elapsed / 3_600_000)).toFixed(2)}/h`)
      }
      dim(parts.join(' · '))
    }

    const activity = [
      stats.turnStartedAt !== undefined
        ? `turn ${formatClock(ctx.now - stats.turnStartedAt)}`
        : stats.lastTurnMs !== undefined
          ? `last ${formatClock(stats.lastTurnMs)}`
          : '',
      `tools ${stats.toolCalls}`,
      stats.runningTool ?? '',
    ].filter(Boolean)
    dim(activity.join(' · '))

    const top = [...(stats.categories ?? [])]
      .filter(category => category.tokens > 0)
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 3)
      .map(category => `${category.name.split(/\s+/)[0].toLowerCase()} ${formatTokens(category.tokens)}`)
    if (top.length > 0) dim(top.join(' · '))
    // The model and how hard it thinks, apart from the rest.
    const model = stats.model ?? stats.stepModel
    if (model) {
      lines.push(softRule(ctx.columns))
      dim([model, stats.effort].filter(Boolean).join(' · '))
    }

    return lines
  },
}
