import { expect, test } from 'claude-code/testing'

import { AUTHOR, LICENSE, creditLines } from './credit'
import { RULE_COLOR, SOFT_RULE_COLOR } from './usage'

test('the credit has no frame: the name, the email and the license, as many to a row as fit, each row centred', () => {
  const lead = (text: string) => text.length - text.trimStart().length
  const name = `© 2026 ${AUTHOR.name}`
  const rest = `${AUTHOR.email} · ${LICENSE.name}`

  expect(creditLines(80).map(line => line.text.trim())).toEqual([`${name} · ${rest}`])
  const lines = creditLines(43)
  expect(lines.map(line => line.text.trim())).toEqual([name, rest])
  expect(lead(lines[0]!.text)).toBe(Math.floor((43 - name.length) / 2))
  expect(lead(lines[1]!.text)).toBe(Math.floor((43 - rest.length) / 2))
  expect(lines.some(line => /[╭╮╰╯┊]/.test(line.text))).toBe(false)
  expect(AUTHOR.name).toBe('Alberto Rodriguez Baixauli')
  expect(AUTHOR.email).toBe('a@webtory.es')
  expect(LICENSE.name).toBe('GNU GPL v3 or later')
})

test('the name, the separators and the license are dark orange and only the email is bright orange', () => {
  const lines = creditLines(43)
  const cells = lines.flatMap(line => line.cells!)

  expect(cells.filter(cell => cell.color === RULE_COLOR)).toEqual([{ text: AUTHOR.email, color: RULE_COLOR }])
  expect(cells.filter(cell => cell.color !== RULE_COLOR).every(cell => cell.color === SOFT_RULE_COLOR)).toBe(true)
  for (const line of lines) expect(line.cells!.map(cell => cell.text).join('')).toBe(line.text)
  expect(lines.some(line => line.dimColor)).toBe(false)
})

test('in a narrow band a wrapped name takes nothing more on its rows, and the email stays whole and bright', () => {
  const lines = creditLines(28)

  expect(lines.map(line => line.text.trim())).toEqual(['© 2026 Alberto Rodriguez', 'Baixauli', AUTHOR.email, LICENSE.name])
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
