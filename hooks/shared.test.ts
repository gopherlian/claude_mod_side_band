import { expect, test } from 'claude-code/testing'

import { SHARED_VERSION, isFresh, mergeShared, parseShared, sharedPath } from './shared'

test('the shared file lives next to the shared limits, under the Claude directory', () => {
  expect(sharedPath('/home/a')).toBe('/home/a/.claude/side-band-state.json')
})

test('text that is not a shared state of this version is nothing shared', () => {
  for (const text of ['', 'nope', '[]', 'null', '42', '{"v":2,"at":1}', '{"at":1}']) {
    expect(parseShared(text)).toEqual({ v: SHARED_VERSION })
  }
})

test('a shared state is read back as it was written', () => {
  const state = {
    v: SHARED_VERSION,
    at: 1000,
    hardware: { cpu: { total: 12, cores: [] }, gpus: [], npus: [] },
    system: { ramPercent: 40, dockers: [] },
    stat: { all: { idle: 1, total: 2 }, cores: [] },
    net: { totals: { rx: 5, tx: 6 }, at: 900 },
    npu: { accel0: { busyUs: 7, at: 900 } },
    slowAt: 800,
    weather: { status: 'ready' as const, place: 'Valencia', temperature: 22 },
    weatherAt: 700,
  }

  expect(parseShared(JSON.stringify(state))).toEqual(state)
})

test('a field of the wrong kind is dropped, the others are kept', () => {
  const read = parseShared(JSON.stringify({ v: SHARED_VERSION, at: 'now', slowAt: 5, system: 'x', weatherAt: null }))

  expect(read).toEqual({ v: SHARED_VERSION, slowAt: 5 })
})

test('a reading is fresh while it is younger than the interval, and never from the future', () => {
  expect(isFresh(1000, 1000, 5000)).toBe(true)
  expect(isFresh(1000, 5999, 5000)).toBe(true)
  expect(isFresh(1000, 6000, 5000)).toBe(false)
  expect(isFresh(2000, 1000, 5000)).toBe(false)
  expect(isFresh(undefined, 1000, 5000)).toBe(false)
})

test('merging keeps what the other band wrote and replaces what this one has', () => {
  const current = parseShared(JSON.stringify({ v: SHARED_VERSION, at: 1, weatherAt: 9, slowAt: 3 }))

  expect(mergeShared(current, { at: 2, slowAt: undefined })).toEqual({ v: SHARED_VERSION, at: 2, weatherAt: 9, slowAt: 3 })
})
