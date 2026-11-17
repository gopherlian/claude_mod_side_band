import { expect, test } from 'claude-code/testing'

import { AUTHOR, LICENSE, creditLines } from './credit'

test('the credit names the author, the email and the license, one fact per row', () => {
  expect(creditLines(40).map(line => line.text)).toEqual([
    `© 2026 ${AUTHOR.name}`,
    AUTHOR.email,
    LICENSE.name,
  ])
  expect(AUTHOR.name).toBe('Alberto Rodriguez Baixauli')
  expect(AUTHOR.email).toBe('a@webtory.es')
  expect(LICENSE.name).toBe('GNU GPL v3 or later')
})

test('the credit is dim, like every footnote', () => {
  expect(creditLines(40).every(line => line.dimColor === true)).toBe(true)
})

test('the credit never draws past the band, wrapping or cutting what does not fit', () => {
  for (const columns of [10, 20, 28, 34, 60]) {
    const lines = creditLines(columns)

    expect(lines.length).toBeGreaterThan(0)
    expect(lines.every(line => line.text.length <= columns)).toBe(true)
  }
  expect(creditLines(0)).toEqual([])
})
