import { project } from './project'
import { session } from './session'
import { system } from './system'
import { time } from './time'
import type { Group, GroupContext } from './types'
import { blank, rule, titledRule } from '../sections/usage'
import type { Line } from '../sections/usage'

/** Display order, top to bottom. Add a theme by appending it. */
export const groups: Group[] = [time, session, project, system]

/** Between two groups: a blank row, then the rule that names the second. */
const SEPARATOR_ROWS = 2

/** Above the credit: the orange rule of a group's name, untitled, with no blank row around it. */
const creditSeparator = (columns: number): Line[] => [rule(columns)]

/**
 * The lines to draw in `available` rows: every group with something to show,
 * a blank row (which a group's `heading` may fill) and a rule between them,
 * dropping whole groups (highest priority number first) until it fits. The
 * first group always stays. Last of all goes `credit`, right under an untitled orange rule, with no blank row around it:
 * whole or not at all, never at the cost of a group.
 */
export const arrange = (
  ctx: GroupContext,
  available: number,
  all: Group[] = groups,
  credit: Line[] = [],
): Line[] => {
  let shown = all
    .map(group => ({ group, lines: group.lines(ctx) }))
    .filter(item => item.lines.length > 0)
  const size = (items: typeof shown) =>
    items.reduce((sum, item) => sum + item.lines.length, 0) + SEPARATOR_ROWS * Math.max(0, items.length - 1)

  while (shown.length > 1 && size(shown) > available) {
    const worst = shown.reduce((a, b) => (b.group.priority > a.group.priority ? b : a))
    shown = shown.filter(item => item !== worst)
  }

  const out: Line[] = []
  shown.forEach((item, i) => {
    if (i > 0) out.push(item.group.heading?.(ctx) ?? blank(), item.group.label ? titledRule(item.group.label, ctx.columns) : rule(ctx.columns))
    out.push(...item.lines)
  })
  const foot = [...creditSeparator(ctx.columns), ...credit]
  if (credit.length > 0 && available - out.length >= foot.length) out.push(...foot)

  return out
}
