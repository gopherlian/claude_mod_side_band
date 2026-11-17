import { expect, test } from 'claude-code/testing'

import { AUTHOR, LICENSE, creditLines } from './credit'
import { RULE_COLOR, SOFT_RULE_COLOR } from './usage'

test('the credit sits in a faint frame: name, email and license on one row, split by vertical bars, centered', () => {
  const lines = creditLines(80)
  const inner = lines[1]!.text.slice(2, -2)
  const full = `© 2026 ${AUTHOR.name} │ ${AUTHOR.email} │ ${LICENSE.name}`

  expect(lines.map(line => line.text.length)).toEqual([80, 80, 80])
  expect(lines[0]!.text).toBe('╭' + '┈'.repeat(78) + '╮')
  expect(lines[2]!.text).toBe('╰' + '┈'.repeat(78) + '╯')
  expect(inner.trim()).toBe(full)
  expect(inner.length - inner.trimStart().length).toBe(Math.floor((76 - full.length) / 2))
  expect(lines[1]!.text.startsWith('┊ ') && lines[1]!.text.endsWith(' ┊')).toBe(true)
  expect(AUTHOR.name).toBe('Alberto Rodriguez Baixauli')
  expect(AUTHOR.email).toBe('a@webtory.es')
  expect(LICENSE.name).toBe('GNU GPL v3 or later')
})

test('the frame, the name, the bar and the license are dark orange and only the email is bright orange', () => {
  const lines = creditLines(80)
  const row = lines[1]!.cells!

  expect(lines[0]!.color).toBe(SOFT_RULE_COLOR)
  expect(lines[2]!.color).toBe(SOFT_RULE_COLOR)
  expect(row.filter(cell => cell.color === RULE_COLOR)).toEqual([{ text: AUTHOR.email, color: RULE_COLOR }])
  expect(row.filter(cell => cell.color !== RULE_COLOR).every(cell => cell.color === SOFT_RULE_COLOR)).toBe(true)
  expect(row.map(cell => cell.text).join('')).toBe(lines[1]!.text)
  expect(lines.some(line => line.dimColor)).toBe(false)
})

test('in a narrow band the row wraps inside the frame and the email stays whole and bright', () => {
  const lines = creditLines(30)

  expect(lines.every(line => line.text.length === 30)).toBe(true)
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
