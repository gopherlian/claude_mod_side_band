// A heavy orange frame of box-drawing characters around rows of text.
import type { Line } from './usage'

/** What the frame takes off the width inside it: two edges and a space beside each. */
export const FRAME_COLUMNS = 4

/** The frame is orange, like the rules between sections. */
export const FRAME_COLOR = '#ff8c00'

const edge = (left: string, right: string, columns: number): string =>
  left + '━'.repeat(Math.max(0, columns - 2)) + right

/**
 * `rows` inside a frame `columns` wide. Each row is cut or padded to what is
 * inside, so the right edge always lines up. No rows, no frame.
 */
export const frame = (rows: string[], columns: number): string[] => {
  if (rows.length === 0) return []
  const inner = Math.max(0, columns - FRAME_COLUMNS)

  return [
    edge('┏', '┓', columns),
    ...rows.map(row => `┃ ${row.slice(0, inner).padEnd(inner)} ┃`),
    edge('┗', '┛', columns),
  ]
}

/**
 * The same frame as lines to draw: the edges and the two sides orange, what is
 * inside left in its own colour. `text` of each line is the plain row.
 */
export const frameLines = (rows: string[], columns: number): Line[] =>
  frame(rows, columns).map((text, index, all) => {
    if (index === 0 || index === all.length - 1) return { text, color: FRAME_COLOR }

    return {
      text,
      cells: [
        { text: text.slice(0, 2), color: FRAME_COLOR },
        { text: text.slice(2, -2) },
        { text: text.slice(-2), color: FRAME_COLOR },
      ],
    }
  })
