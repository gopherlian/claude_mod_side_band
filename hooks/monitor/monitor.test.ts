import { expect, test } from 'claude-code/testing'

import { monitorLines } from '../sections/monitor'
import { RESOURCE_COLORS, RESOURCE_TEXT_COLORS } from '../sections/palette'
import { meter } from '../sections/usage'
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

test('what is not detected is hidden, and nothing detected hides the section', () => {
  expect(monitorLines(undefined, 30)).toEqual([])
  expect(monitorLines({ gpus: [], npus: [] }, 30)).toEqual([])

  const texts = monitorLines({ cpu: { total: 20, cores: [] }, gpus: [], npus: [] }, 30).map(l => l.text)
  expect(texts).toEqual([meter('⚙ CPU     ', 20, 30)])
})

test('the monitor is only percent bars: no cores, names, GB, temperature or footer', () => {
  const lines = monitorLines(
    {
      cpu: { total: 10, cores: Array.from({ length: 18 }, (_, i) => i * 5) },
      gpus: [{ name: 'RTX', util: 90, memUsedMb: 4096, memTotalMb: 8192, temp: 61 }],
      npus: [{ name: 'NPU', util: 5 }],
    },
    30,
  )
  expect(lines.map(l => l.text)).toEqual([
    meter('⚙ CPU     ', 10, 30),
    meter('▣ GPU     ', 90, 30),
    meter('▤ VRAM    ', 50, 30),
    meter('◈ NPU     ', 5, 30),
  ])
  expect(lines[1].color).toBe(RESOURCE_COLORS.gpu)
})

test('several gpus are told apart by number', () => {
  const lines = monitorLines(
    {
      gpus: [
        { name: 'A', util: 1 },
        { name: 'B', util: 2 },
      ],
      npus: [],
    },
    30,
  ).map(l => l.text)
  expect(lines).toEqual([meter('▣ GPU0    ', 1, 30), meter('▣ GPU1    ', 2, 30)])
})

test('every resource bar has its own colour: CPU and GPU keep their own, never the separators orange', () => {
  const lines = monitorLines(
    {
      cpu: { total: 20, cores: [] },
      gpus: [{ name: 'g', util: 50, memUsedMb: 1, memTotalMb: 2 }],
      npus: [{ name: 'n', util: 5 }],
    } as never,
    30,
  )

  expect(lines.map(l => l.color)).toEqual([
    RESOURCE_COLORS.cpu,
    RESOURCE_COLORS.gpu,
    RESOURCE_COLORS.vram,
    RESOURCE_COLORS.npu,
  ])
  expect(new Set(Object.values(RESOURCE_COLORS)).size).toBe(Object.values(RESOURCE_COLORS).length)
  expect(Object.values(RESOURCE_COLORS)).not.toContain('#a05800')
})

test('the label and the percent are a lighter shade of the resource colour and the bar keeps the darker one', () => {
  const line = monitorLines({ cpu: { total: 20, cores: [] }, gpus: [], npus: [] }, 30)[0]!
  const cells = line.cells!

  expect(cells.map(c => c.text).join('')).toBe(line.text)
  expect(cells[0]).toEqual({ text: '⚙ CPU     ', color: RESOURCE_TEXT_COLORS.cpu })
  expect(cells[1]!.color).toBe(RESOURCE_COLORS.cpu)
  expect(cells[2]).toEqual({ text: '  20%', color: RESOURCE_TEXT_COLORS.cpu })
})

test('every resource has a lighter text colour of its own, none orange', () => {
  expect(Object.keys(RESOURCE_TEXT_COLORS).sort()).toEqual(Object.keys(RESOURCE_COLORS).sort())
  expect(new Set(Object.values(RESOURCE_TEXT_COLORS)).size).toBe(Object.values(RESOURCE_TEXT_COLORS).length)
  expect(Object.values(RESOURCE_TEXT_COLORS)).not.toContain('#a05800')
})
