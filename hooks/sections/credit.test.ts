import { expect, test } from 'claude-code/testing'

import { AUTHOR, LICENSE, creditLines } from './credit'
import { RULE_COLOR, SOFT_RULE_COLOR } from './usage'

test('the credit is one centred row: the year, the email and the license, with no name, bar or frame', () => {
  const row = `© 2026 ${AUTHOR.email}  ${LICENSE.name}`
  const lead = (text: string) => text.length - text.trimStart().length

  expect(row).toBe('© 2026 a@webtory.es  GNU/GPL')
  for (const columns of [28, 43, 80]) {
    const lines = creditLines(columns)
    expect(lines.map(line => line.text.trim())).toEqual([row])
    expect(lead(lines[0]!.text)).toBe(Math.floor((columns - row.length) / 2))
  }
  expect(creditLines(80)[0]!.text).not.toMatch(/Alberto|│|[╭╮╰╯┊┈]/)
})

test('the year and the license are dark orange and only the email is bright orange', () => {
  const [line] = creditLines(43)
  const cells = line!.cells!

  expect(cells.filter(cell => cell.color === RULE_COLOR)).toEqual([{ text: AUTHOR.email, color: RULE_COLOR }])
  expect(cells.filter(cell => cell.color !== RULE_COLOR).every(cell => cell.color === SOFT_RULE_COLOR)).toBe(true)
  expect(cells.map(cell => cell.text).join('')).toBe(line!.text)
  expect(line!.dimColor).toBeUndefined()
})

test('in a band narrower than the row it wraps, each row centred, and the email stays whole and bright', () => {
  const lines = creditLines(20)

  expect(lines.length).toBeGreaterThan(1)
  expect(lines.every(line => line.text.length <= 20)).toBe(true)
  expect(lines.flatMap(line => line.cells ?? []).filter(cell => cell.color === RULE_COLOR)).toEqual([
    { text: AUTHOR.email, color: RULE_COLOR },
  ])
})

test('the credit never draws past the band, wrapping or cutting what does not fit', () => {
  for (const columns of [10, 20, 28, 34, 60]) {
    const lines = creditLines(columns)

    expect(lines.length).toBeGreaterThan(0)
    expect(lines.every(line => line.text.length <= columns)).toBe(true)
  }
  expect(creditLines(0)).toEqual([])
})
