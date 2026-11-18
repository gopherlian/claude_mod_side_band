import { project } from './project'
import { session } from './session'
import { system } from './system'
import { time } from './time'
import type { Group, GroupContext } from './types'
import { blank, rule, softRule, titledRule } from '../sections/usage'
import type { Line } from '../sections/usage'

/** Display order, top to bottom. Add a theme by appending it. */
export const groups: Group[] = [time, session, project, system]

/** Between two groups: a blank row, then the rule that names the second. */
const SEPARATOR_ROWS = 2

/** Around the footnotes: the faint grey rule above them and the orange rule, untitled, below them. */
const FOOTNOTE_SEPARATOR_ROWS = 2

/**
 * The lines to draw in `available` rows: every group with something to show,
 * a blank row and a rule between them, dropping whole groups (highest
 * priority number first) until it fits. The first group always stays. Then,
 * if rows are left, the footnotes of the groups shown go at the foot, between
 * the faint grey rule of a group's inside and the orange rule of a group's
 * name, untitled: whole or not at all, so they never cost a group its place.
 * Last of all goes `credit`, right under the footnote's rule, or after a blank row where there is no footnote, on the
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
  if (noted) out.push(softRule(ctx.columns), ...notes.flat(), rule(ctx.columns))
  // Right under the footnote's orange rule the credit needs no blank row; anywhere else it keeps one.
  const gap = noted ? [] : [blank()]
  if (credit.length > 0 && available - out.length >= credit.length + gap.length) {
    out.push(...gap, ...credit)
  }

  return out
}
