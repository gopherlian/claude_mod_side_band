import { project } from './project'
import { session } from './session'
import { system } from './system'
import { time } from './time'
import type { Group, GroupContext } from './types'
import { blank, footRule, rule, titledRule } from '../sections/usage'
import type { Line } from '../sections/usage'

/** Display order, top to bottom. Add a theme by appending it. */
export const groups: Group[] = [time, session, project, system]

/** Between two groups: a blank row, then the rule that names the second. */
const SEPARATOR_ROWS = 2

/** Before the footnotes: a blank row, then the short rule. */
const FOOTNOTE_SEPARATOR_ROWS = 2

/** Before the credit: a blank row, then the short rule. */
const CREDIT_SEPARATOR_ROWS = 2

/**
 * The lines to draw in `available` rows: every group with something to show,
 * a blank row and a rule between them, dropping whole groups (highest
 * priority number first) until it fits. The first group always stays. Then,
 * if rows are left, the footnotes of the groups shown go at the foot, after a
 * blank row and a short rule: whole or not at all, so they never cost a group
 * its place.
 * Last of all goes `credit`, after its own blank row and short rule, on the
 * same terms: whole or not at all, never at the cost of a group or a note.
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

  const notes = shown.map(item => item.group.footnote?.(ctx) ?? [])
  const rows = notes.reduce((sum, own) => sum + own.length, 0)
  const noted = rows > 0 && available - size(shown) >= rows + FOOTNOTE_SEPARATOR_ROWS

  const out: Line[] = []
  shown.forEach((item, i) => {
    if (i > 0) out.push(blank(), item.group.label ? titledRule(item.group.label, ctx.columns) : rule(ctx.columns))
    out.push(...item.lines)
  })
  if (noted) out.push(blank(), footRule(ctx.columns), ...notes.flat())
  if (credit.length > 0 && available - out.length >= credit.length + CREDIT_SEPARATOR_ROWS) {
    out.push(blank(), footRule(ctx.columns), ...credit)
  }

  return out
}
