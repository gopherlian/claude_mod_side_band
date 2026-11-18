// A frame of box-drawing characters around rows of text: heavy and orange, around the time.
import type { Cell, Line } from './usage'

/** What the frame takes off the width inside it: two edges and a space beside each. */
export const FRAME_COLUMNS = 4

/** The frame is orange, like the heavy rules between sections. */
export const FRAME_COLOR = '#c06a00'

/** The characters a frame is drawn with. */
export type Glyphs = { tl: string; tr: string; bl: string; br: string; h: string; v: string }

/** Heavy lines, as the frame of the time. */
export const HEAVY: Glyphs = { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' }

/** How a frame looks: its characters and the colour of its edges and sides. */
export type Look = { glyphs: Glyphs; color: string }

export const HEAVY_LOOK: Look = { glyphs: HEAVY, color: FRAME_COLOR }

const edge = (left: string, right: string, fill: string, columns: number): string =>
  left + fill.repeat(Math.max(0, columns - 2)) + right

/**
 * `rows` inside a frame `columns` wide. Each row is cut or padded to what is
 * inside, so the right edge always lines up. No rows, no frame.
 */
export const frame = (rows: string[], columns: number, glyphs: Glyphs = HEAVY): string[] => {
  if (rows.length === 0) return []
  const inner = Math.max(0, columns - FRAME_COLUMNS)

  return [
    edge(glyphs.tl, glyphs.tr, glyphs.h, columns),
    ...rows.map(row => `${glyphs.v} ${row.slice(0, inner).padEnd(inner)} ${glyphs.v}`),
    edge(glyphs.bl, glyphs.br, glyphs.h, columns),
  ]
}

/**
 * The same frame as lines to draw: the edges and the two sides in the look's
 * colour, what is inside left in its own colour, or painted by `paint`, which
 * is given the padded text of a row and returns it as cells. `text` of each
 * line is the plain row.
 */
export const frameLines = (
  rows: string[],
  columns: number,
  look: Look = HEAVY_LOOK,
  paint?: (inner: string) => Cell[],
): Line[] =>
  frame(rows, columns, look.glyphs).map((text, index, all) => {
    if (index === 0 || index === all.length - 1) return { text, color: look.color }

    const inner = text.slice(2, -2)

    return {
      text,
      cells: [
        { text: text.slice(0, 2), color: look.color },
        ...(paint ? paint(inner) : [{ text: inner }]),
        { text: text.slice(-2), color: look.color },
      ],
    }
  })
