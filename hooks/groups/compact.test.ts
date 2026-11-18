import { expect, test } from 'claude-code/testing'

import { project } from './project'
import { session } from './session'
import { system } from './system'
import { time } from './time'
import type { GroupContext } from './types'

const NOW = Date.parse('2026-11-16T10:00:00Z')
const endsIn = (ms: number) => new Date(NOW + ms).toISOString()

const ctx = (over: Partial<GroupContext> = {}): GroupContext => ({
  now: NOW,
  columns: 30,
  rows: 54,
  budget: 8,
  weather: {
    status: 'ready',
    place: 'Valencia',
    temperature: 22,
    summary: 'Overcast',
    icon: '☁',
    forecast: { max: 26, min: 21, rainPercent: 8, uv: 3, sunrise: '07:48', sunset: '17:44' },
  },
  usage: {
    contextTokens: 172_000,
    contextWindow: 1_000_000,
    contextPercent: 17,
    costUsd: 1.18,
    startedAt: NOW - 17 * 60_000,
    limits: [
      { kind: 'five_hour', percentUsed: 18, resetsAt: endsIn(2.5 * 3_600_000) },
      { kind: 'seven_day', percentUsed: 17, resetsAt: endsIn(28 * 3_600_000) },
    ],
  },
  stats: {
    toolCalls: 42,
    activeTools: 0,
    toolTimes: [NOW - 20_000],
    lastTurnMs: 9_000,
    model: 'Sonnet 5.5',
    effort: 'medium',
    categories: [
      { name: 'Messages', tokens: 100_000, kind: 'used' },
      { name: 'Free space', tokens: 900_000, kind: 'free' },
    ],
  },
  hardware: {
    cpu: { total: 2, cores: [] },
    gpus: [{ name: 'RTX', util: 0, memUsedMb: 800, memTotalMb: 10_000 }],
    npus: [],
  },
  system: { ramPercent: 17, swapPercent: 0, diskPercent: 6, downBps: 833, upBps: 800, netPeakBps: 1_048_576, dockers: [] },
  git: { branch: 'develop', changed: 0, ahead: 0, behind: 0 },
  ...over,
})

const texts = (lines: { text: string }[]) => lines.map(line => line.text)

test('the compact Claude column: context on one row, the windows, the legend, the cost, the model, the tools', () => {
  const rows = texts(session.strip!.lines(ctx()))

  expect(rows).toHaveLength(7)
  expect(rows[0]).toMatch(/^Context [█▒░]+ +17%$/)
  expect(rows[1]).toMatch(/^Session .* 18% +2h30m$/)
  expect(rows[2]).toMatch(/^Weekly .* 17% +1d4h$/)
  expect(rows[3]).toBe('┃ time elapsed in the window')
  expect(rows[4]).toMatch(/^17m · \$1\.18/)
  expect(rows[5]).toBe('Sonnet 5.5 ●●○○○ medium')
  expect(rows[6]).toMatch(/^tools [·▂▃▄▅▆▇█]{10} 42$/)
  expect(rows.every(row => row.length <= 30)).toBe(true)
})

test('the compact Claude column is cut to its rows at the bottom, the tools first', () => {
  const rows = texts(session.strip!.lines(ctx({ budget: 6 })))

  expect(rows).toHaveLength(6)
  expect(rows[5]).toBe('Sonnet 5.5 ●●○○○ medium')
  expect(texts(session.strip!.lines(ctx({ budget: 3 })))).toHaveLength(3)
})

test('the compact context row keeps the warning colour on its label and number', () => {
  const [row] = session.strip!.lines(ctx({ usage: { ...ctx().usage!, contextPercent: 90 } }))

  expect(row!.cells![0]!.color).toBe('red')
  expect(row!.cells!.at(-1)!.color).toBe('red')
})

test('without usage the compact Claude column says so', () => {
  expect(texts(session.strip!.lines(ctx({ usage: undefined })))).toEqual(['Usage unavailable'])
})

test('the compact System column puts two resources on a row, then the network, then docker', () => {
  const rows = texts(system.strip!.lines(ctx({ columns: 29 })))

  expect(rows).toHaveLength(5)
  expect(rows[0]).toMatch(/^CPU  [█░]{5} +2% GPU  [█░]{5} +0%$/)
  expect(rows[1]).toMatch(/^VRAM [█░]{5} +8% RAM  [█░]{5} +17%$/)
  expect(rows[2]).toMatch(/^Swap [█░]{5} +0% Disk [█░]{5} +6%$/)
  expect(rows[3]).toBe('↓ 833B/s  ↑ 800B/s')
  expect(rows[4]).toBe('docker · none running')
})

test('the compact System column pairs what there is: no GPU, no VRAM, and an odd one gets a row of its own', () => {
  const rows = texts(system.strip!.lines(ctx({ columns: 29, hardware: { cpu: { total: 2, cores: [] }, gpus: [], npus: [] }, system: { ramPercent: 17 } })))

  expect(rows[0]).toMatch(/^CPU  .* 2% RAM .* 17%$/)
  expect(rows).toHaveLength(1)
  expect(texts(system.strip!.lines(ctx({ columns: 29, hardware: { cpu: { total: 2, cores: [] }, gpus: [], npus: [] }, system: { ramPercent: 17, diskPercent: 6 } })))[1]).toMatch(/^Disk /)
  expect(system.strip!.lines(ctx({ hardware: undefined, system: {} }))).toEqual([])
})

test('the compact System column never passes its width', () => {
  for (const columns of [29, 30, 34, 40]) {
    for (const line of system.strip!.lines(ctx({ columns }))) {
      expect(line.text.length).toBeLessThanOrEqual(columns)
      expect((line.cells ?? [line]).map(cell => cell.text).join('')).toBe(line.text)
    }
  }
})

test('the compact System column counts containers instead of drawing them', () => {
  const dockers = [{ name: 'a', networks: [] }, { name: 'b', networks: [] }]

  expect(texts(system.strip!.lines(ctx({ system: { dockers } }))).pop()).toBe('docker · 2 running')
})

test('the compact Project column is the branch and its state, hidden outside a repository', () => {
  expect(texts(project.strip!.lines(ctx()))).toEqual(['develop', 'clean'])
  expect(texts(project.strip!.lines(ctx({ columns: 12, git: { branch: 'US-593', changed: 3, ahead: 2, behind: 0 } })))).toEqual(['US-593', '3 changed ↑2'])
  expect(project.strip!.lines(ctx({ git: undefined }))).toEqual([])
})

test('the time column is shaped to its rows: big clock with room, text without, outlook only where rows are left', () => {
  const rows = (budget: number, columns = 26) => texts(time.strip!.lines(ctx({ columns, budget })))

  expect(rows(8)).toHaveLength(8)
  expect(rows(8)[0]).toMatch(/^┏━+┓$/)
  expect(rows(8).join('\n')).toMatch(/[█▀▄]/)
  expect(rows(8).slice(-2)).toEqual([expect.stringContaining('rain 8%'), expect.stringContaining('UV 3')])

  expect(rows(5)).toHaveLength(5)
  expect(rows(5).join('\n')).not.toMatch(/[█▀▄]/)
  expect(rows(3)).toHaveLength(3)
  expect(rows(3).join('\n')).not.toMatch(/rain/)
  for (const budget of [3, 4, 5, 6, 7, 8]) {
    expect(rows(budget)[0]).toMatch(/^┏/)
    expect(rows(budget).some(row => row.startsWith('┗'))).toBe(true)
  }
})

test('without a budget the time group is what it always was', () => {
  expect(time.lines(ctx({ budget: undefined, columns: 30 }))).toEqual(time.lines(ctx({ columns: 30, budget: undefined, rows: 54 })))
  expect(time.lines(ctx({ budget: undefined, columns: 30 })).length).toBeGreaterThan(0)
})
