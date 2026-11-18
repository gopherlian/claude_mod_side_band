import { expect, test } from 'claude-code/testing'

import { AUTHOR, LICENSE, creditLines } from './credit'
import { RULE_COLOR, SOFT_RULE_COLOR } from './usage'

test('the credit has no frame: name and email split by a bar, the license alone below, both centered', () => {
  const lines = creditLines(80)
  const first = `© 2026 ${AUTHOR.name} │ ${AUTHOR.email}`
  const lead = (text: string) => text.length - text.trimStart().length

  expect(lines.map(line => line.text.trim())).toEqual([first, LICENSE.name])
  expect(lead(lines[0]!.text)).toBe(Math.floor((80 - first.length) / 2))
  expect(lead(lines[1]!.text)).toBe(Math.floor((80 - LICENSE.name.length) / 2))
  expect(lines.some(line => /[╭╮╰╯┊┈]/.test(line.text))).toBe(false)
  expect(AUTHOR.name).toBe('Alberto Rodriguez Baixauli')
  expect(AUTHOR.email).toBe('a@webtory.es')
  expect(LICENSE.name).toBe('GNU GPL v3 or later')
})

test('the name, the bar and the license are dark orange and only the email is bright orange', () => {
  const lines = creditLines(80)
  const row = lines[0]!.cells!

  expect(lines[1]!.cells!.every(cell => cell.color === SOFT_RULE_COLOR)).toBe(true)
  expect(row.filter(cell => cell.color === RULE_COLOR)).toEqual([{ text: AUTHOR.email, color: RULE_COLOR }])
  expect(row.filter(cell => cell.color !== RULE_COLOR).every(cell => cell.color === SOFT_RULE_COLOR)).toBe(true)
  for (const line of lines) expect(line.cells!.map(cell => cell.text).join('')).toBe(line.text)
  expect(lines.some(line => line.dimColor)).toBe(false)
})

test('in a narrow band the row wraps, each row centred, and the email stays whole and bright', () => {
  const lines = creditLines(30)

  expect(lines.length).toBeGreaterThan(2)
  expect(lines.every(line => line.text.length <= 30)).toBe(true)
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
