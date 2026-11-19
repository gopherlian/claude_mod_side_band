import { expect, test } from 'claude-code/testing'

import { SEASONS, decorateTop, demoSeason, seasonAt } from './season'

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

const top = (width: number) => ({ text: '┏' + '━'.repeat(width - 2) + '┓', color: '#a05800' })
const season = (id: string) => SEASONS.find(s => s.id === id)!
const cellsText = (line: { cells?: { text: string }[] }) => (line.cells ?? []).map(cell => cell.text).join('')

test('a decorated border keeps its width and its corners, and its cells add up to its text', () => {
  for (const { id } of SEASONS) {
    const line = decorateTop(top(30), season(id), 0)

    expect(line.text.length).toBe(30)
    expect(line.text.startsWith('┏')).toBe(true)
    expect(line.text.endsWith('┓')).toBe(true)
    expect(cellsText(line)).toBe(line.text)
  }
})

test('each season draws its own glyphs on the border, none of them an emoji', () => {
  const glyphsOf = (id: string) => [...decorateTop(top(30), season(id), 0).text].filter(ch => !'┏┓━'.includes(ch))

  expect(glyphsOf('nochebuena').every(ch => '✦✧'.includes(ch))).toBe(true)
  expect(glyphsOf('navidad').every(ch => '❄✦'.includes(ch))).toBe(true)
  expect(glyphsOf('halloween').every(ch => '▲☾✶'.includes(ch))).toBe(true)
  expect(glyphsOf('valentine').every(ch => ch === '♥')).toBe(true)
  expect(glyphsOf('summer').every(ch => '☀≈'.includes(ch))).toBe(true)
  for (const { id } of SEASONS) {
    for (const ch of glyphsOf(id)) expect(ch).not.toMatch(/\p{Extended_Pictographic}️|[\u{1F000}-\u{1FFFF}]/u)
  }
  expect(glyphsOf('nochebuena').length).toBeGreaterThan(0)
})

test('the Three Kings are three stars', () => {
  expect([...decorateTop(top(30), season('reyes'), 0).text].filter(ch => ch === '★')).toHaveLength(3)
})

test('the border of 9 October is the Royal Senyera: blue first, then yellow and red bars', () => {
  const colours = decorateTop(top(40), season('donis'), 0).cells!.slice(1, -1).map(cell => cell.color)

  expect(colours[0]).toBe('#2b6cb0')
  expect(colours.filter(colour => colour === '#c53030').length).toBeGreaterThan(0)
  expect(colours.filter(colour => colour === '#d69e2e').length).toBeGreaterThan(0)
  expect(colours.indexOf('#d69e2e')).toBeGreaterThan(colours.lastIndexOf('#2b6cb0') - 1)
})

test('the glyphs move on every two seconds, and stay still within them', () => {
  const at = (ms: number) => decorateTop(top(30), season('nochebuena'), ms).text

  expect(at(0)).toBe(at(1999))
  expect(at(0)).not.toBe(at(2000))
})

test('a border too narrow to decorate is left as it is', () => {
  const narrow = top(6)

  expect(decorateTop(narrow, season('navidad'), 0)).toEqual(narrow)
})
