import { expect, test } from 'claude-code/testing'

import { SEASONS, dress, demoSeason, seasonAt } from './season'

const day = (month: number, date: number, hour = 12) => new Date(2026, month - 1, date, hour).getTime()
const idAt = (month: number, date: number) => seasonAt(day(month, date))?.id

test('each day of the year belongs to at most one season, and the ranges have their edges', () => {
  expect(idAt(2, 11)).toBeUndefined()
  expect(idAt(2, 12)).toBe('valentine')
  expect(idAt(2, 14)).toBe('valentine')
  expect(idAt(2, 15)).toBeUndefined()

  expect(idAt(6, 20)).toBeUndefined()
  expect(idAt(6, 21)).toBe('summer')
  expect(idAt(9, 22)).toBe('summer')
  expect(idAt(9, 23)).toBeUndefined()

  expect(idAt(10, 6)).toBeUndefined()
  expect(idAt(10, 7)).toBe('donis')
  expect(idAt(10, 9)).toBe('donis')
  expect(idAt(10, 10)).toBeUndefined()

  expect(idAt(10, 23)).toBeUndefined()
  expect(idAt(10, 24)).toBe('halloween')
  expect(idAt(11, 1)).toBe('halloween')
  expect(idAt(11, 2)).toBeUndefined()

  expect(idAt(12, 23)).toBeUndefined()
  expect(idAt(12, 24)).toBe('nochebuena')
  expect(idAt(12, 25)).toBe('navidad')
  expect(idAt(12, 31)).toBe('navidad')
  expect(idAt(1, 1)).toBe('navidad')
  expect(idAt(1, 4)).toBe('navidad')
  expect(idAt(1, 5)).toBe('reyes')
  expect(idAt(1, 6)).toBe('reyes')
  expect(idAt(1, 7)).toBeUndefined()
})

test('a whole day counts: the first and the last minute of a range are inside it', () => {
  expect(seasonAt(new Date(2026, 1, 12, 0, 0).getTime())?.id).toBe('valentine')
  expect(seasonAt(new Date(2026, 1, 14, 23, 59).getTime())?.id).toBe('valentine')
})

test('the demonstration walks through every season, one every five seconds, and starts over', () => {
  const ids = SEASONS.map(season => season.id)

  expect(new Set(ids).size).toBe(7)
  for (let step = 0; step < ids.length * 2; step++) {
    expect(demoSeason(step * 5000 + 1234).id).toBe(ids[step % ids.length])
  }
  expect(demoSeason(4999).id).toBe(demoSeason(0).id)
})

import type { Line } from './sections/usage'

const top: Line = { text: '┏' + '━'.repeat(30) + '┓', color: '#a05800' }
const rowOf = (text: string): Line => ({
  text: `┃ ${text.padEnd(28)} ┃`,
  cells: [{ text: '┃ ', color: '#a05800' }, { text: text.padEnd(28), color: 'green' }, { text: ' ┃', color: '#a05800' }],
})
const frameOf = (): Line[] => [top, rowOf('big'), rowOf('time'), rowOf('weather'), { text: '┗' + '━'.repeat(30) + '┛', color: '#a05800' }]
const season = (id: string) => SEASONS.find(s => s.id === id)!
const plain = (line: Line) => (line.cells ?? [{ text: line.text }]).map(cell => cell.text).join('')
const MOTIF_COLOUR = '#8f8f8f'

test('a dressed frame keeps every row as wide as it was and its cells add up to its text', () => {
  for (const { id } of SEASONS) {
    const lines = dress(frameOf(), season(id))

    expect(lines).toHaveLength(5)
    for (const line of lines) {
      expect(line.text.length).toBe(32)
      expect(plain(line)).toBe(line.text)
    }
    expect(lines[0]!.text.startsWith('┏')).toBe(true)
    expect(lines[0]!.text.endsWith('┓')).toBe(true)
    expect(lines[4]).toEqual(frameOf()[4])
  }
})

test('the tag leads the top border, flush left, with the name alone; the icon of the day sits at its right end', () => {
  const names: Record<string, [string, string]> = {
    valentine: ['San Valentín', '♥'],
    summer: ['Verano', '☀'],
    donis: ["9 d'Octubre", '⚑'],
    halloween: ['Halloween', '☾'],
    nochebuena: ['Nochebuena', '✦'],
    navidad: ['Navidad', '❄'],
    reyes: ['Reyes Magos', '♚'],
  }
  for (const { id } of SEASONS) {
    const [name, icon] = names[id]!
    const line = dress(frameOf(), season(id))[0]!
    const chars = [...line.text]

    expect(line.text.startsWith(`┏◢ ${name} ◤━`)).toBe(true)
    expect(chars[chars.length - 3]).toBe(icon)
    expect(line.text.endsWith('━┓')).toBe(true)
    expect(line.text.match(new RegExp(`[${icon}]`, 'gu'))).toHaveLength(1)
    const cell = line.cells!.find(c => c.text === icon)!
    expect(cell.color).toBe(season(id).accent)
    expect(dress(frameOf(), season(id))[0]!.text).toBe(line.text)
  }
})

test('the tag is dark text on a colour, set off by the triangles in that colour', () => {
  const cells = dress(frameOf(), season('navidad'))[0]!.cells!
  const label = cells.find(cell => cell.text.includes('Navidad'))!
  const left = cells.find(cell => cell.text.includes('◢'))!
  const right = cells.find(cell => cell.text.includes('◤'))!

  expect(label.backgroundColor).toBeDefined()
  expect(label.color).toBe('#111111')
  expect(left.color).toBe(label.backgroundColor)
  expect(right.color).toBe(label.backgroundColor)
})

test('a border too narrow for the tag keeps the icon and leaves the name out', () => {
  const narrow: Line = { text: '┏' + '━'.repeat(14) + '┓', color: '#a05800' }
  const line = dress([narrow, rowOf('x')], season('reyes'))[0]!

  expect(line.text).not.toContain('Reyes')
  expect(line.text).toContain('♚')
  expect(line.text.length).toBe(16)
})

const channels = (hex: string) => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16))

test('the background behind the time is very dark, so what is written on it reads; only the blue band is deeper', () => {
  for (const { id } of SEASONS) {
    for (const row of dress(frameOf(), season(id)).slice(1, -1)) {
      for (const cell of row.cells!) {
        expect(cell.backgroundColor).toMatch(/^#[0-9a-f]{6}$/)
        expect(Math.max(...channels(cell.backgroundColor!))).toBeLessThanOrEqual(id === 'donis' ? 0x90 : 0x40)
      }
    }
  }
})

test('the background covers the whole square, and the borders have none', () => {
  const lines = dress(frameOf(), season('halloween'))

  for (const row of lines.slice(1, -1)) {
    expect(row.cells!.every(cell => cell.backgroundColor !== undefined)).toBe(true)
  }
  expect(lines[4]!.cells).toBeUndefined()
})

test('the text on the square keeps its own colour over the background', () => {
  const row = dress(frameOf(), season('navidad'))[2]!

  expect(row.cells!.some(cell => cell.color === 'green' && cell.text.includes('time'))).toBe(true)
})

const motifOf = (id: string) => season(id).motif ?? []

test('every day but 9 October draws its motif in light grey, on blank cells only, never against a letter', () => {
  for (const { id } of SEASONS.filter(s => s.id !== 'donis')) {
    const rows = dress(frameOf(), season(id)).slice(1, -1)
    const original = frameOf().slice(1, -1)
    let drawn = 0

    rows.forEach((row, r) => {
      const chars = [...row.text]
      const chars0 = [...original[r]!.text]
      chars.forEach((char, c) => {
        if (char === chars0[c]) return
        drawn++
        expect(chars0[c]).toBe(' ')
        expect(motifOf(id)).toContain(char)
        // Only in the margins: outside the span of what is written on the row.
        const written = chars0.map((ch, at) => (at >= 2 && at <= chars0.length - 3 && ch !== ' ' ? at : -1)).filter(at => at >= 0)
        expect(c < Math.min(...written) || c > Math.max(...written)).toBe(true)
        expect(chars[c - 1]).toBe(' ')
        expect(chars[c + 1]).toBe(' ')
        const cell = row.cells!.flatMap(x => [...x.text].map(() => x))[c]!
        expect(cell.color).toBe(MOTIF_COLOUR)
      })
      // Where there is text, it is where it was.
      for (const word of ['big', 'time', 'weather']) {
        if (original[r]!.text.includes(word)) expect(row.text).toContain(word)
      }
    })
    expect(drawn).toBeGreaterThan(3)
  }
})

test('the motifs are one-cell symbols that are not emoji', () => {
  for (const { id, icon, motif } of SEASONS) {
    for (const glyph of [icon, ...(motif ?? [])]) {
      expect([...glyph]).toHaveLength(1)
      expect(glyph).not.toMatch(/[\u{1F000}-\u{1FFFF}\uFE0F]/u)
    }
    expect(id).toBeDefined()
  }
})

test('9 October paints the Royal Senyera: a deep blue band, six cells wide, then red bars on gold, row by row', () => {
  const rows = dress(frameOf(), season('donis')).slice(1, -1)
  const colourAt = (row: Line, column: number) => {
    let at = 0
    for (const cell of row.cells!) {
      at += cell.text.length
      if (column < at) return cell.backgroundColor
    }
  }

  const blue = colourAt(rows[0]!, 0)!
  for (const row of rows) for (let column = 0; column < 6; column++) expect(colourAt(row, column)).toBe(blue)
  for (const row of rows) expect(colourAt(row, 6)).not.toBe(blue)
  expect(Math.max(...channels(blue))).toBeGreaterThan(0x40)
  expect(channels(blue)[2]).toBeGreaterThan(channels(blue)[0]! * 2)
  expect(Math.max(...channels(blue))).toBeLessThan(0x80)
  expect(colourAt(rows[0]!, 15)).not.toBe(colourAt(rows[1]!, 15))
  expect(colourAt(rows[0]!, 15)).toBe(colourAt(rows[2]!, 15))
  expect(rows.map(row => row.text).join('')).toBe(frameOf().slice(1, -1).map(row => row.text).join(''))
})
