import { expect, test } from 'claude-code/testing'

import { formatLeft } from './format'

test('what is left is written as short as it can be: two units at most, no spaces, no empty unit', () => {
  expect(formatLeft(42_000)).toBe('42s')
  expect(formatLeft(12 * 60_000)).toBe('12m')
  expect(formatLeft(83 * 60_000)).toBe('1h23m')
  expect(formatLeft(2 * 3_600_000)).toBe('2h')
  expect(formatLeft(69 * 60_000)).toBe('1h9m')
  expect(formatLeft((3 * 24 + 4) * 3_600_000)).toBe('3d4h')
  expect(formatLeft(3 * 86_400_000)).toBe('3d')
})

test('a window that already ended reads as nothing left', () => {
  expect(formatLeft(-5_000)).toBe('0s')
})
