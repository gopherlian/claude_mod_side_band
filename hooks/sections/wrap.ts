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
