import { expect, test } from 'claude-code/testing'

import { formatRate } from '../format'
import { compactMeter, rateMeter } from '../sections/monitor'
import { RESOURCE_COLORS, RESOURCE_TEXT_COLORS } from '../sections/palette'
import { bar } from '../sections/usage'
import { cpuUsage, parseStat } from './cpu'
import { parseAmd, parseNvidia } from './gpu'
import { npuUtil } from './npu'

const STAT_A = 'cpu  100 0 100 800 0 0 0 0 0 0\ncpu0 50 0 50 400 0 0 0 0 0 0\ncpu1 50 0 50 400 0 0 0 0 0 0\nintr 1\n'
const STAT_B = 'cpu  200 0 200 1000 0 0 0 0 0 0\ncpu0 150 0 150 400 0 0 0 0 0 0\ncpu1 50 0 50 600 0 0 0 0 0 0\n'

test('cpu utilization is the busy share between two snapshots', () => {
  const usage = cpuUsage(parseStat(STAT_A)!, parseStat(STAT_B)!)
  expect(Math.round(usage.total)).toBe(50)
  expect(usage.cores.map(Math.round)).toEqual([100, 0])
})

test('iowait counts as idle and a missing cpu line is not a reading', () => {
  expect(parseStat('nothing here')).toBeUndefined()
  const a = parseStat('cpu 0 0 0 100 0 0 0 0\n')!
  const b = parseStat('cpu 0 0 0 100 100 0 0 0\n')!
  expect(cpuUsage(a, b).total).toBe(0)
})

test('nvidia-smi csv becomes readings; junk becomes none', () => {
  const [gpu] = parseNvidia('NVIDIA GeForce RTX 4070, 12, 1024, 12282, 45.00\n')
  expect(gpu).toEqual({ name: 'NVIDIA GeForce RTX 4070', util: 12, memUsedMb: 1024, memTotalMb: 12282, temp: 45 })
  expect(parseNvidia('NVIDIA-SMI has failed')).toEqual([])
})

test('an amd card reads its busy percent and bytes of vram', () => {
  const gpu = parseAmd('AMD GPU', '37\n', String(1024 * 1048576), String(8192 * 1048576))!
  expect(gpu.util).toBe(37)
  expect(gpu.memUsedMb).toBe(1024)
  expect(parseAmd('AMD GPU', 'n/a')).toBeUndefined()
})

test('an npu needs two samples and is clamped', () => {
  expect(npuUtil(undefined, 500, 5000)).toBeUndefined()
  expect(npuUtil(0, 2_500_000, 5000)).toBe(50)
  expect(npuUtil(0, 99_000_000, 5000)).toBe(100)
})

test('a small meter is the name, a bar in the resource colour and the number, as wide as asked', () => {
  const cells = compactMeter('CPU', 20, 20, 'cpu')

  expect(cells).toEqual([
    { text: 'CPU  ', color: RESOURCE_TEXT_COLORS.cpu },
    { text: bar(20, 11), color: RESOURCE_COLORS.cpu },
    { text: ' 20%', color: RESOURCE_TEXT_COLORS.cpu },
  ])
  expect(cells.map(c => c.text).join('')).toHaveLength(20)
})

test('a numbered name is kept whole, and the bar gives way', () => {
  const cells = compactMeter('VRAM0', 50, 20, 'vram')

  expect(cells[0]!.text).toBe('VRAM0 ')
  expect(cells.map(c => c.text).join('')).toHaveLength(20)
})

test('a rate meter is an arrow, a bar scaled to the peak and the rate', () => {
  const cells = rateMeter('↓', 524288, 1048576, 20, 'down')

  expect(cells).toEqual([
    { text: '↓ ', color: RESOURCE_TEXT_COLORS.down },
    { text: bar(50, 10), color: RESOURCE_COLORS.down },
    { text: ` ${formatRate(524288).padStart(7)}`, color: RESOURCE_TEXT_COLORS.down },
  ])
  expect(rateMeter('↑', 10, 0, 20, 'up')[1]!.text).toBe(bar(0, 10))
})

test('every resource bar has its own colour, never the separators orange', () => {
  expect(new Set(Object.values(RESOURCE_COLORS)).size).toBe(Object.values(RESOURCE_COLORS).length)
  expect(Object.values(RESOURCE_COLORS)).not.toContain('#ff8c00')
})

test('every resource has a lighter text colour of its own, none orange', () => {
  expect(Object.keys(RESOURCE_TEXT_COLORS).sort()).toEqual(Object.keys(RESOURCE_COLORS).sort())
  expect(new Set(Object.values(RESOURCE_TEXT_COLORS)).size).toBe(Object.values(RESOURCE_TEXT_COLORS).length)
  expect(Object.values(RESOURCE_TEXT_COLORS)).not.toContain('#ff8c00')
})
