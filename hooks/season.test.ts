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

test('a dressed frame keeps every row as wide and as plain as it was', () => {
  for (const { id } of SEASONS) {
    const lines = dress(frameOf(), season(id))

    expect(lines.map(l => l.text)).toEqual(
      frameOf().map((l, i) => (i === 0 ? lines[0]!.text : l.text)),
    )
    expect(lines).toHaveLength(5)
    for (const line of lines) {
      expect(line.text.length).toBe(32)
      expect(plain(line)).toBe(line.text)
    }
    expect(lines[0]!.text.startsWith('┏')).toBe(true)
    expect(lines[0]!.text.endsWith('┓')).toBe(true)
  }
})

test('the top border carries the name of the festivity on a slanted tag, and it is the same whenever it is drawn', () => {
  const names: Record<string, string> = {
    valentine: 'San Valentín',
    summer: 'Verano',
    donis: 'Sant Donís',
    halloween: 'Halloween',
    nochebuena: 'Nochebuena',
    navidad: 'Navidad',
    reyes: 'Reyes Magos',
  }
  for (const { id } of SEASONS) {
    const text = dress(frameOf(), season(id))[0]!.text

    expect(text).toContain(`◢ ${names[id]} ◤`)
    expect(dress(frameOf(), season(id))[0]!.text).toBe(text)
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

test('a border too narrow for the tag is left as it is', () => {
  const narrow: Line = { text: '┏' + '━'.repeat(14) + '┓', color: '#a05800' }

  expect(dress([narrow, rowOf('x')], season('reyes'))[0]).toEqual(narrow)
})

const channels = (hex: string) => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16))

test('the background behind the time is very dark, so what is written on it reads', () => {
  for (const { id } of SEASONS) {
    const rows = dress(frameOf(), season(id)).slice(1, -1)

    for (const row of rows) {
      for (const cell of row.cells!) {
        expect(cell.backgroundColor).toMatch(/^#[0-9a-f]{6}$/)
        expect(Math.max(...channels(cell.backgroundColor!))).toBeLessThanOrEqual(0x40)
      }
    }
  }
})

test('the background covers the whole square, and the borders have none', () => {
  const lines = dress(frameOf(), season('halloween'))

  for (const row of lines.slice(1, -1)) {
    expect(plain(row)).toBe(row.text)
    expect(row.cells!.every(cell => cell.backgroundColor !== undefined)).toBe(true)
  }
  for (const border of [lines[0]!, lines[4]!]) {
    expect(border.cells === undefined || border.cells.every(cell => cell.backgroundColor === undefined || cell.text.includes('Hall'))).toBe(true)
  }
})

test('the text on the square keeps its own colour over the background', () => {
  const row = dress(frameOf(), season('navidad'))[2]!

  expect(row.cells!.some(cell => cell.color === 'green' && cell.text.includes('time'))).toBe(true)
})

test('9 October paints the Royal Senyera: a blue band, then red bars on gold, row by row', () => {
  const rows = dress(frameOf(), season('donis')).slice(1, -1)
  const colourAt = (row: Line, column: number) => {
    let at = 0
    for (const cell of row.cells!) {
      at += cell.text.length
      if (column < at) return cell.backgroundColor
    }
  }

  const blues = rows.map(row => colourAt(row, 2))
  expect(new Set(blues).size).toBe(1)
  expect(rows.map(row => colourAt(row, 15))[0]).not.toBe(rows.map(row => colourAt(row, 15))[1])
  expect(colourAt(rows[0]!, 15)).toBe(colourAt(rows[2]!, 15))
  expect(colourAt(rows[0]!, 2)).not.toBe(colourAt(rows[0]!, 15))
})
