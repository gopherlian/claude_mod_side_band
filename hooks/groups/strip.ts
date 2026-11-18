// The strip: where the pane is not docked, the groups stand side by side, left to right, each as a compact column.
import { SOFT_RULE_COLOR, blank, titledRule } from '../sections/usage'
import type { Cell, Line } from '../sections/usage'
import { groups } from './index'
import type { Group, GroupContext, Strip } from './types'

/** Cells between two columns: a space, the faint bar, a space. */
export const STRIP_GAP = 3

/** What a column's rows are drawn with; between two columns this goes on every row. */
const SEPARATOR: Cell[] = [{ text: ' ' }, { text: '┊', color: SOFT_RULE_COLOR }, { text: ' ' }]

/**
 * `line` as cells exactly `width` across: cut where it is wider (each run keeps
 * its colour), padded with spaces where it is narrower, and centred where it
 * says so.
 */
export const cellsOf = (line: Line, width: number): Cell[] => {
  if (width <= 0) return []

  const runs: Cell[] = line.cells ?? [{ text: line.text, color: line.color, dimColor: line.dimColor }]
  const cut: Cell[] = []
  let used = 0
  for (const run of runs) {
    if (used >= width) break
    const text = run.text.slice(0, width - used)
    if (text !== '') cut.push(text === run.text ? run : { ...run, text })
    used += text.length
  }

  const free = width - used
  const left = line.align === 'center' ? Math.floor(free / 2) : 0

  return [
    ...(left > 0 ? [{ text: ' '.repeat(left) }] : []),
    ...cut,
    ...(free - left > 0 ? [{ text: ' '.repeat(free - left) }] : []),
  ]
}

/** The width each column takes: its least, then what is left shared one cell at a time, up to each one's most. */
const widthsOf = (forms: Strip[], total: number): number[] => {
  const widths = forms.map(form => form.min)
  let spare = total - (widths.reduce((sum, w) => sum + w, 0) + STRIP_GAP * (forms.length - 1))
  for (let grew = true; spare > 0 && grew; ) {
    grew = false
    forms.forEach((form, i) => {
      if (spare > 0 && (widths[i] ?? 0) < form.max) {
        widths[i] = (widths[i] ?? 0) + 1
        spare -= 1
        grew = true
      }
    })
  }

  return widths
}

/**
 * The lines to draw in `rows` rows, `ctx.columns` cells across: every group
 * that has a compact form and something to show, side by side in the order of
 * `all`, each under the rule that names it (the first has none: its frame is
 * its head) and a faint bar between them. Where they do not all fit across, the
 * group with the highest priority number goes, whole, the first never. A column
 * is cut at the bottom to the rows it has. After the columns, the credit, after
 * a blank row, if all of it fits.
 */
export const arrangeStrip = (ctx: GroupContext, rows: number, all: Group[] = groups, credit: Line[] = []): Line[] => {
  const forms = (group: Group): Strip => group.strip!
  const titled = (group: Group) => (group.label === undefined ? 0 : 1)
  const body = (group: Group, columns: number) =>
    forms(group).lines({ ...ctx, columns, budget: Math.max(1, rows - titled(group)), noted: false })

  let shown = all.filter(group => group.strip && body(group, forms(group).min).length > 0)
  const needs = (items: Group[]) => items.reduce((sum, g) => sum + forms(g).min, 0) + STRIP_GAP * (items.length - 1)
  while (shown.length > 1 && needs(shown) > ctx.columns) {
    const worst = shown.reduce((a, b) => (b.priority > a.priority ? b : a))
    shown = shown.filter(group => group !== worst)
  }
  if (shown.length === 0) return []

  const widths = shown.length === 1 ? [Math.min(ctx.columns, forms(shown[0]!).max)] : widthsOf(shown.map(forms), ctx.columns)
  const columns = shown.map((group, i) => {
    const width = widths[i] ?? 0
    const lines = body(group, width).slice(0, Math.max(1, rows - titled(group)))

    return group.label === undefined ? lines : [titledRule(group.label, width), ...lines]
  })

  const height = Math.max(...columns.map(column => column.length))
  const out: Line[] = Array.from({ length: height }, (_, r) => {
    const cells = columns.flatMap((column, i) => [
      ...(i > 0 ? SEPARATOR : []),
      ...cellsOf(column[r] ?? { text: '' }, widths[i] ?? 0),
    ])

    return { text: cells.map(cell => cell.text).join(''), cells }
  })

  if (credit.length > 0 && rows - out.length >= credit.length + 1) out.push(blank(), ...credit)

  return out
}
