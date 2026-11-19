// Text for a band that has no wrapping of its own: one string per row.

/** Packs the words of `text` into rows of at most `width` cells; a word wider than that is cut. */
export const wrap = (text: string, width: number): string[] => {
  if (width < 1) return []

  const rows: string[] = []
  let row = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let rest = word
    while (rest.length > width) {
      if (row) rows.push(row)
      row = ''
      rows.push(rest.slice(0, width))
      rest = rest.slice(width)
    }
    const joined = row ? `${row} ${rest}` : rest
    if (joined.length <= width) {
      row = joined
    } else {
      rows.push(row)
      row = rest
    }
  }
  if (row) rows.push(row)

  return rows
}

/** The separator between the parts of a row. */
const PART_SEPARATOR = ' · '

/**
 * Packs whole `parts` into rows of at most `width` cells, joined by ` · `; a part is split only when it alone is
 * wider than a row. Nothing is dropped: what does not fit on one row goes on the next.
 */
export const wrapParts = (parts: string[], width: number): string[] => {
  if (width < 1) return []

  const rows: string[] = []
  for (const part of parts.filter(Boolean)) {
    const last = rows[rows.length - 1]
    if (last !== undefined && last.length + PART_SEPARATOR.length + part.length <= width) {
      rows[rows.length - 1] = last + PART_SEPARATOR + part
    } else if (part.length <= width) {
      rows.push(part)
    } else {
      rows.push(...wrap(part, width))
    }
  }

  return rows
}

/** A run of a coloured row; the same shape as `Cell` in the usage section. */
type Run = { text: string; color?: string; backgroundColor?: string; dimColor?: boolean }

/** A cut of `run` that keeps its colour. */
const sliced = (run: Run, from: number, to?: number): Run => ({ ...run, text: run.text.slice(from, to) })

/**
 * Wraps a coloured row into rows of at most `width` cells, at its spaces, each run keeping its colour. A dot left
 * at the edge of a row by the break is dropped, and a word wider than a row is cut.
 */
export const wrapCells = (runs: Run[], width: number): Run[][] => {
  if (width < 1) return []

  // Words are what lies between spaces, across runs: `$3.00` and the `/h` glued to it stay one word.
  const words: Run[][] = []
  let open = false
  for (const run of runs) {
    for (const [at, piece] of run.text.split(/( +)/).entries()) {
      if (piece === '') continue
      if (at % 2 === 1) {
        open = false
        continue
      }
      if (open) words[words.length - 1]!.push({ ...run, text: piece })
      else words.push([{ ...run, text: piece }])
      open = true
    }
  }

  const size = (word: Run[]) => word.reduce((sum, run) => sum + run.text.length, 0)
  const rows: Run[][] = []
  let row: Run[][] = []
  const flush = () => {
    const edge = (word: Run[]) => word.map(run => run.text).join('') === '·'
    while (row.length > 0 && edge(row[0]!)) row.shift()
    while (row.length > 0 && edge(row[row.length - 1]!)) row.pop()
    if (row.length > 0) rows.push(row.flatMap((word, i) => (i > 0 ? [{ text: ' ' }, ...word] : word)))
    row = []
  }
  const used = () => row.reduce((sum, word) => sum + size(word), 0) + Math.max(0, row.length - 1)

  for (const word of words) {
    if (size(word) > width) {
      flush()
      // Cut a word wider than the row into rows of its own, run by run.
      let piece: Run[] = []
      let left = width
      for (const run of word) {
        for (let from = 0; from < run.text.length; ) {
          const take = Math.min(left, run.text.length - from)
          piece.push(sliced(run, from, from + take))
          from += take
          left -= take
          if (left === 0) {
            rows.push(piece)
            piece = []
            left = width
          }
        }
      }
      if (piece.length > 0) rows.push(piece)
    } else if (row.length > 0 && used() + 1 + size(word) > width) {
      flush()
      row = [word]
    } else {
      row.push(word)
    }
  }
  flush()

  return rows
}
