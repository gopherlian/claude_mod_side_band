// Big fonts drawn with half blocks (each cell stacks two pixels). '#' is on.
// SHORT is 4 pixels tall (2 rows of text); TALL is 5 pixels tall (3 rows).
type Font = Record<string, string[]>

const SHORT: Font = {
  '0': ['###', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '###'],
  '2': ['###', '..#', '#..', '###'],
  '3': ['###', '..#', '.##', '###'],
  '4': ['#.#', '#.#', '###', '..#'],
  '5': ['###', '#..', '..#', '###'],
  '6': ['#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '###'],
  '9': ['###', '#.#', '###', '..#'],
  ':': ['.', '#', '.', '#'],
  '-': ['...', '###', '...', '...'],
  '°': ['##', '##', '..', '..'],
  C: ['###', '#..', '#..', '###'],
}

const TALL: Font = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '###', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  ':': ['.', '#', '.', '#', '.'],
  '-': ['...', '...', '###', '...', '...'],
  '°': ['##', '##', '..', '..', '..'],
  C: ['###', '#..', '#..', '#..', '###'],
}

const GAP = ' '

/** Rows of text a big number takes: 3 when there is room, else 2. */
export type BigHeight = 2 | 3

const cell = (top: boolean, bottom: boolean): string =>
  top && bottom ? '█' : top ? '▀' : bottom ? '▄' : ' '

const glyph = (font: Font, ch: string, height: BigHeight): string[] | undefined => {
  const g = font[ch]
  if (!g) return undefined

  return Array.from({ length: height }, (_, row) =>
    g[0]
      .split('')
      .map((_, c) => cell(g[row * 2]?.[c] === '#', g[row * 2 + 1]?.[c] === '#'))
      .join(''),
  )
}

/** The rows of `text` in the big font; characters without a glyph are skipped. */
export const bigText = (text: string, height: BigHeight = 3): string[] => {
  const font = height === 3 ? TALL : SHORT
  const glyphs = text
    .split('')
    .map(ch => glyph(font, ch, height))
    .filter((g): g is string[] => g !== undefined)

  return Array.from({ length: height }, (_, row) =>
    glyphs.map(g => g[row]).join(GAP),
  )
}

export const bigWidth = (text: string): number => bigText(text)[0].length
