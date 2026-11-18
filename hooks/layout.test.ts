import { expect, test } from 'claude-code/testing'

import { bigText } from './bigdigits'
import { PADDING_X, compose, dockColumns, fit, rowBudget } from './layout'

const chunks = [
  { text: '18°C', rank: 0 },
  { text: 'Clear', rank: 1 },
  { text: 'Madrid', rank: 2 },
  { text: '14:32:07', rank: 3, big: '14:32' },
  { text: 'Mon 16 Nov', rank: 4 },
]

test('with one row the most important chunks stay, in display order', () => {
  expect(fit(chunks, 24, 1)).toEqual(['18°C · Clear · Madrid'])
  expect(compose(chunks, 17, 1)).toEqual(['18°C · Clear'])
})

test('the weather outranks the time and the date', () => {
  expect(compose(chunks, 40, 1)[0].startsWith('18°C')).toBe(true)
})

test('with two rows the time uses the short font, the rest beside it', () => {
  const rows = compose(chunks, 50, 2)
  const [top] = bigText('14:32', 2)
  expect(rows.length).toBe(2)
  expect(rows[0].startsWith(top)).toBe(true)
  expect(rows[0]).toContain('18°C')
})

test('with three rows only the time is big, three rows tall, text beside it', () => {
  const [top, middle, bottom] = bigText('14:32', 3)
  const rows = compose(chunks, 50, 3)
  expect(rows.length).toBe(3)
  expect(rows[0].startsWith(top)).toBe(true)
  expect(rows[1].startsWith(middle)).toBe(true)
  expect(rows[2].startsWith(bottom)).toBe(true)
  expect(rows[0]).toContain('18°C')
  for (const row of rows) expect(row.length).toBeLessThanOrEqual(50)
})

test('the temperature is never drawn big', () => {
  expect(compose(chunks, 50, 3).join('\n')).not.toContain(bigText('18°C', 3)[0])
})

test('on a narrow band the big time stands alone, with text below if rows remain', () => {
  const rows = compose(chunks, 20, 5)
  expect(rows.slice(0, 3)).toEqual(bigText('14:32', 3))
  expect(rows.length).toBe(5)
})

test('stacked, the big time is centered on its own rows and the rest goes below it, each row centered too', () => {
  const big = bigText('14:32', 3)
  const pad = ' '.repeat(Math.floor((50 - big[0].length) / 2))
  const rows = compose(chunks, 50, 6, { stack: true })

  expect(rows.slice(0, 3)).toEqual(big.map(row => pad + row))
  expect(rows.slice(3).join('\n')).toContain('18°C · Clear · Madrid')
  for (const row of rows.slice(3)) {
    expect(row).toBe(' '.repeat(Math.floor((50 - row.trim().length) / 2)) + row.trim())
  }
  expect(rows[0]).not.toContain('18°C')
  expect(rows.length).toBeLessThanOrEqual(6)
})

test('stacked with no row left for text keeps the text beside the time rather than losing it', () => {
  expect(compose(chunks, 50, 3, { stack: true })).toEqual(compose(chunks, 50, 3))
  expect(compose(chunks, 50, 3, { stack: true })[0]).toContain('18°C')
})

test('stacked on a band too narrow for text beside the time, the time alone is centered', () => {
  const big = bigText('14:32', 3)
  const pad = ' '.repeat(Math.floor((20 - big[0].length) / 2))

  expect(compose(chunks, 20, 3, { stack: true })).toEqual(big.map(row => pad + row))
})

test('without the option nothing is stacked or centered', () => {
  expect(compose(chunks, 50, 6)[0].startsWith(bigText('14:32', 3)[0])).toBe(true)
})

test('the band asks for 1/12 of the window plus the padding on both sides', () => {
  expect(dockColumns(480)).toBe(40 + PADDING_X * 2)
  expect(dockColumns(400)).toBe(33 + PADDING_X * 2)
})

test('the band never asks for fewer than 28 columns of content, enough for the framed big clock', () => {
  expect(dockColumns(212)).toBe(28 + PADDING_X * 2)
  expect(dockColumns(180)).toBe(28 + PADDING_X * 2)
  expect(dockColumns(110)).toBe(28 + PADDING_X * 2)
})

test('the band never asks for more than 45% of the window', () => {
  expect(dockColumns(60)).toBe(Math.floor(60 * 0.45))
})

test('a docked band scrolls, so it may draw every row it has', () => {
  expect(rowBudget('dock', 5, 24)).toBe(Number.POSITIVE_INFINITY)
  expect(rowBudget('dock', undefined, 24)).toBe(Number.POSITIVE_INFINITY)
})

test('a band that cannot scroll keeps to the rows its window gave it', () => {
  expect(rowBudget('inline', 12, 24)).toBe(12)
  expect(rowBudget('widget', 12, 24)).toBe(12)
  expect(rowBudget('inline', undefined, 24)).toBe(21)
  expect(rowBudget(undefined, undefined, 4)).toBe(5)
})
