// Layout rules of the band, kept apart from the widgets.
import { bigText } from './bigdigits'
import type { BigHeight } from './bigdigits'
import type { Chunk } from './widgets/types'

/** The band asks for 1/12 of the window width: half of what it once took. */
const BAND_DIVISOR = 12

/** Content columns the band never asks for fewer than: the framed big clock needs 21. */
const MIN_CONTENT = 28

/** The engine clamps a docked pane to at least 24 columns and at most 45%. */
const MIN_COLUMNS = 24
const MAX_SHARE = 0.45

const SEPARATOR = ' · '

/** Cells of breathing room on each side, inside the band. */
export const PADDING_X = 2

/** The same in the strip, where every cell across is worth keeping. */
export const STRIP_PADDING_X = 1

/** Body rows the band asks for when it opens inline: what the tallest column of the strip needs. */
export const STRIP_ROWS = 8

/**
 * Body columns to request from `$.ui.open` for a screen `total` cells wide:
 * the band's 1/12 for its content (never under `MIN_CONTENT`), plus the padding
 * on both sides, never past the 45% the engine allows. A request only: a width
 * the person resized the dock to wins.
 */
export const dockColumns = (total: number): number => {
  const wanted = Math.max(MIN_CONTENT, Math.round(total / BAND_DIVISOR)) + PADDING_X * 2
  const ceiling = Math.max(MIN_COLUMNS, Math.floor(total * MAX_SHARE))

  return Math.min(wanted, ceiling)
}

/**
 * Rows the groups may fill. A docked pane scrolls (the wheel, the arrows when
 * focused), so it draws every group and lets the person roll to what does not
 * fit. Anywhere else nothing scrolls the band: it keeps to the rows its window
 * gave it, or to the screen's less three, and drops groups to fit.
 */
export const rowBudget = (placement: string | undefined, bodyRows: number | undefined, screenRows: number): number =>
  placement === 'dock' ? Number.POSITIVE_INFINITY : (bodyRows ?? Math.max(5, screenRows - 3))

/** Packs chunks, in order, into rows of at most `columns` cells. */
const pack = (chunks: Chunk[], columns: number): string[] => {
  const rows: string[] = []
  for (const { text } of chunks) {
    const last = rows[rows.length - 1]
    if (last !== undefined && last.length + SEPARATOR.length + text.length <= columns) {
      rows[rows.length - 1] = last + SEPARATOR + text
    } else {
      rows.push(text.slice(0, columns))
    }
  }

  return rows
}

/**
 * The rows to draw: as many chunks as fit in `columns` x `rows`, dropping
 * the highest-ranked (least important) first and keeping display order.
 */
export const fit = (all: Chunk[], columns: number, rows: number): string[] => {
  const chunks = all.filter(chunk => chunk.text !== '')
  const byImportance = [...chunks].sort((a, b) => a.rank - b.rank)

  for (let keep = byImportance.length; keep > 0; keep--) {
    const kept = new Set(byImportance.slice(0, keep))
    const packed = pack(
      chunks.filter(chunk => kept.has(chunk)),
      columns,
    )
    if (packed.length <= rows) return packed
  }

  return []
}

/** `row` with the spaces on its left that centre it in `columns` cells; nothing where it fills them. */
export const centered = (row: string, columns: number): string =>
  ' '.repeat(Math.max(0, Math.floor((columns - row.length) / 2))) + row

const BIG_GAP = '  '
/** Narrowest side column worth drawing next to the big numbers. */
const MIN_SIDE = 10

/**
 * The rows to draw. With two rows or more, the chunks that have a big form
 * (the time) are drawn in the big font, 3 rows tall (2 when only 2 fit); the
 * other chunks are packed beside them, in the same rows, most important first.
 *
 * With `stack`, the big time is centered on rows of its own and the other
 * chunks go below it, as they were packed. That needs a row to put them in:
 * where none is left they stay beside the time, so the weather is not lost.
 */
export const compose = (
  all: Chunk[],
  columns: number,
  rows: number,
  options: { stack?: boolean } = {},
): string[] => {
  const chunks = all.filter(chunk => chunk.text !== '')
  if (rows < 2) return fit(chunks, columns, rows)

  const height: BigHeight = rows >= 3 ? 3 : 2
  const used: Chunk[] = []
  let width = 0
  for (const chunk of chunks.filter(c => c.big).sort((a, b) => a.rank - b.rank)) {
    const next = width + (used.length ? BIG_GAP.length : 0) + bigText(chunk.big!, height)[0].length
    if (next <= columns) {
      used.push(chunk)
      width = next
    }
  }
  if (used.length === 0) return fit(chunks, columns, rows)

  const pieces = chunks.filter(chunk => used.includes(chunk)).map(chunk => bigText(chunk.big!, height))
  const big = Array.from({ length: height }, (_, row) =>
    pieces.map(piece => piece[row]).join(BIG_GAP),
  )
  const rest = chunks.filter(chunk => !used.includes(chunk))
  const sideColumns = columns - width - BIG_GAP.length
  const isStacked = options.stack === true && rows > height
  if (isStacked || sideColumns < MIN_SIDE) {
    const lead = options.stack ? ' '.repeat(Math.max(0, Math.floor((columns - width) / 2))) : ''
    const below = fit(rest, columns, rows - height)

    // Stacked, what goes below the time is centered under it, row by row.
    return [...big.map(row => lead + row), ...(options.stack ? below.map(row => centered(row, columns)) : below)]
  }

  const side = fit(rest, sideColumns, height)

  return big.map((row, i) => (side[i] ? row + BIG_GAP + side[i] : row))
}
