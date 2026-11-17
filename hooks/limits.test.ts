import { expect, test } from 'claude-code/testing'

import { LIMITS_SYNC_MS, limitsPath, mergeLimits, parseLimits } from './limits'

const NOW = Date.parse('2026-11-17T10:00:00Z')
const endsIn = (ms: number): string => new Date(NOW + ms).toISOString()

test('the bands share their limits every 8 seconds', () => {
  expect(LIMITS_SYNC_MS).toBe(8_000)
})

test('the shared file lives under the Claude directory', () => {
  expect(limitsPath('/home/a')).toBe('/home/a/.claude/side-band-limits.json')
})

test('an idle session takes the higher figure another band saw for the same window', () => {
  const resetsAt = endsIn(3_600_000)
  const merged = mergeLimits(
    [{ kind: 'five_hour', percentUsed: 18, resetsAt }],
    [{ kind: 'five_hour', percentUsed: 21, resetsAt }],
    NOW,
  )
  expect(merged).toEqual([{ kind: 'five_hour', percentUsed: 21, resetsAt }])
})

test('a session keeps its own figure when it is the higher one', () => {
  const resetsAt = endsIn(3_600_000)
  const merged = mergeLimits(
    [{ kind: 'five_hour', percentUsed: 21, resetsAt }],
    [{ kind: 'five_hour', percentUsed: 18, resetsAt }],
    NOW,
  )
  expect(merged[0]?.percentUsed).toBe(21)
})

test('a window that has reset beats the old one, even with a lower figure', () => {
  const merged = mergeLimits(
    [{ kind: 'five_hour', percentUsed: 2, resetsAt: endsIn(5 * 3_600_000) }],
    [{ kind: 'five_hour', percentUsed: 90, resetsAt: endsIn(60_000) }],
    NOW,
  )
  expect(merged).toEqual([{ kind: 'five_hour', percentUsed: 2, resetsAt: endsIn(5 * 3_600_000) }])
})

test('a shared window that is already over is dropped', () => {
  const merged = mergeLimits([], [{ kind: 'five_hour', percentUsed: 90, resetsAt: endsIn(-1_000) }], NOW)
  expect(merged).toEqual([])
})

test('a window the session lacks is filled in from the shared ones', () => {
  const resetsAt = endsIn(86_400_000)
  expect(mergeLimits([], [{ kind: 'seven_day', percentUsed: 3, resetsAt }], NOW)).toEqual([
    { kind: 'seven_day', percentUsed: 3, resetsAt },
  ])
})

test('windows without a reset time compare by figure and keep the session order', () => {
  const merged = mergeLimits(
    [
      { kind: 'five_hour', percentUsed: 10 },
      { kind: 'seven_day', percentUsed: 5 },
    ],
    [{ kind: 'seven_day', percentUsed: 7 }],
    NOW,
  )
  expect(merged).toEqual([
    { kind: 'five_hour', percentUsed: 10 },
    { kind: 'seven_day', percentUsed: 7 },
  ])
})

test('unreadable or malformed shared text means nothing shared', () => {
  expect(parseLimits('')).toEqual([])
  expect(parseLimits('{"half":')).toEqual([])
  expect(parseLimits('{"kind":"five_hour"}')).toEqual([])
  expect(parseLimits('[{"kind":"five_hour","percentUsed":"x"},{"kind":"seven_day","percentUsed":3}]')).toEqual([
    { kind: 'seven_day', percentUsed: 3 },
  ])
})
