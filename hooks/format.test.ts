import { expect, test } from 'claude-code/testing'

import { formatRemaining } from './format'

test('what is left is written with a space between units and no zero padding', () => {
  expect(formatRemaining(42_000)).toBe('42s')
  expect(formatRemaining(12 * 60_000)).toBe('12m')
  expect(formatRemaining(83 * 60_000)).toBe('1h 23m')
  expect(formatRemaining(2 * 3_600_000)).toBe('2h 0m')
  expect(formatRemaining(69 * 60_000)).toBe('1h 9m')
  expect(formatRemaining((3 * 24 + 4) * 3_600_000)).toBe('3d 4h')
  expect(formatRemaining(3 * 86_400_000)).toBe('3d 0h')
})

test('a window that already ended reads as nothing left', () => {
  expect(formatRemaining(-5_000)).toBe('0s')
})
