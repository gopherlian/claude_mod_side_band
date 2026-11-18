import { expect, test } from 'claude-code/testing'

import { creditLines } from '../sections/credit'
import { SOFT_RULE_COLOR } from '../sections/usage'
import type { Line } from '../sections/usage'
import { groups } from './index'
import { project } from './project'
import { session } from './session'
import { STRIP_GAP, arrangeStrip, cellsOf } from './strip'
import { system } from './system'
import { time } from './time'
import type { GroupContext } from './types'

const NOW = Date.parse('2026-11-16T10:00:00Z')
const endsIn = (ms: number) => new Date(NOW + ms).toISOString()

const ctx = (over: Partial<GroupContext> = {}): GroupContext => ({
  now: NOW,
  columns: 99,
  rows: 54,
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
      { name: 'MCP tools', tokens: 37_000, kind: 'used' },
      { name: 'Free space', tokens: 830_000, kind: 'free' },
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

const texts = (lines: Line[]) => lines.map(line => line.text)

test('a cell row is exactly as wide as asked: padded, cut, or centered', () => {
  const width = (cells: { text: string }[]) => cells.map(cell => cell.text).join('').length

  expect(width(cellsOf({ text: 'abc' }, 8))).toBe(8)
  expect(width(cellsOf({ text: 'abcdefghij' }, 8))).toBe(8)
  expect(cellsOf({ text: 'abcdefghij' }, 8).map(cell => cell.text).join('')).toBe('abcdefgh')
  expect(cellsOf({ text: 'abc', align: 'center' }, 9).map(cell => cell.text).join('')).toBe('   abc   ')
  expect(cellsOf({ text: '' }, 0)).toEqual([])
})

test('a cut keeps the colour of each run and drops what passes the width', () => {
  const cells = cellsOf({ text: 'ab cd', cells: [{ text: 'ab', color: 'red' }, { text: ' cd', dimColor: true }] }, 4)

  expect(cells.filter(cell => cell.text.trim() !== '')).toEqual([
    { text: 'ab', color: 'red' },
    { text: ' c', dimColor: true },
  ])
  expect(cells.map(cell => cell.text).join('')).toBe('ab c')
})

test('the groups stand side by side: the titles share the first row, in order, the time frame at the left', () => {
  const lines = arrangeStrip(ctx(), 8)
  const first = texts(lines)[0]!

  expect(first.startsWith('┏')).toBe(true)
  expect(first.indexOf('━━ Claude')).toBeGreaterThan(first.indexOf('┓'))
  expect(first.indexOf('━━ Project')).toBeGreaterThan(first.indexOf('━━ Claude'))
  expect(first.indexOf('━━ System')).toBeGreaterThan(first.indexOf('━━ Project'))
  expect(lines.length).toBeLessThanOrEqual(8)
})

test('a faint orange bar separates the columns on every row, with a space on each side', () => {
  const lines = arrangeStrip(ctx(), 8)

  for (const line of lines) {
    const bars = line.cells!.filter(cell => cell.text === '┊')

    expect(bars).toHaveLength(3)
    expect(bars.every(cell => cell.color === SOFT_RULE_COLOR)).toBe(true)
    expect(line.text.match(/ ┊ /g)).toHaveLength(3)
  }
})

test('the cells of every row add up to its text, and no row passes the strip', () => {
  for (const columns of [60, 80, 99, 120, 160]) {
    for (const line of arrangeStrip(ctx({ columns }), 8)) {
      expect(line.cells!.map(cell => cell.text).join('')).toBe(line.text)
      expect(line.text.length).toBeLessThanOrEqual(columns)
    }
  }
})

test('where the columns do not all fit the group with the highest priority number is dropped, whole', () => {
  const titles = (columns: number) =>
    texts(arrangeStrip(ctx({ columns }), 8)).join('\n').match(/━━ (Claude|Project|System)/g)?.map(t => t.slice(3))

  expect(titles(99)).toEqual(['Claude', 'Project', 'System'])
  expect(titles(80)).toEqual(['Claude', 'Project'])
  expect(titles(60)).toEqual(['Claude'])
  expect(titles(40)).toBeUndefined()
})

test('the time is never dropped, even where nothing else fits', () => {
  const lines = arrangeStrip(ctx({ columns: 20 }), 8)

  expect(texts(lines)[0]!.startsWith('┏')).toBe(true)
  expect(lines.every(line => line.text.length <= 20)).toBe(true)
})

test('a group with nothing to show leaves no column: outside a repository there is no Project', () => {
  const titles = texts(arrangeStrip(ctx({ git: undefined }), 8)).join('\n')

  expect(titles).not.toMatch(/Project/)
  expect(titles).toMatch(/Claude/)
  expect(titles).toMatch(/System/)
})

test('width left over is shared among the columns, up to the most each takes', () => {
  const narrow = arrangeStrip(ctx({ columns: 99 }), 8)[0]!.text
  const wide = arrangeStrip(ctx({ columns: 140 }), 8)[0]!.text
  const widest = arrangeStrip(ctx({ columns: 300 }), 8)[0]!.text

  expect(wide.indexOf('━━ Claude')).toBeGreaterThan(narrow.indexOf('━━ Claude'))
  expect(widest.length).toBeLessThan(300)
  expect(widest.length).toBe(34 + 40 + 24 + 40 + 3 * STRIP_GAP)
})

test('the strip is never taller than its rows, and the time frame is never cut', () => {
  for (const rows of [3, 4, 5, 6, 7, 8, 12]) {
    const lines = texts(arrangeStrip(ctx(), rows))
    const frame = lines.map(row => row.slice(0, 1))

    expect(lines.length).toBeLessThanOrEqual(Math.max(3, rows))
    expect(frame[0]).toBe('┏')
    expect(frame).toContain('┗')
  }
})

test('with rows to spare the clock is big, three rows tall; with few it is text', () => {
  const tall = texts(arrangeStrip(ctx(), 8)).slice(0, 8).map(row => row.slice(0, 24)).join('\n')
  const short = texts(arrangeStrip(ctx(), 4)).map(row => row.slice(0, 24)).join('\n')

  expect(tall).toMatch(/[█▀▄]/)
  expect(short).not.toMatch(/[█▀▄]/)
  expect(short).toMatch(/\d\d:\d\d/)
})

test('every column is cut at the bottom to the rows given, keeping what comes first', () => {
  const five = texts(arrangeStrip(ctx(), 5))
  const claude = five.map(row => row.split(' ┊ ')[1] ?? '')

  expect(five).toHaveLength(5)
  expect(claude[0]).toMatch(/^━━ Claude/)
  expect(claude[1]).toMatch(/^Context/)
  expect(claude[2]).toMatch(/^Session/)
  expect(claude[3]).toMatch(/^Weekly/)
  expect(claude[4]).toMatch(/^┃ time elapsed/)
})

test('after the columns, the credit, if all of it fits below a blank row', () => {
  const credit = creditLines(99)
  const withCredit = arrangeStrip(ctx(), 8 + 1 + credit.length, groups, credit)
  const without = arrangeStrip(ctx(), 8 + credit.length, groups, credit)

  expect(texts(withCredit).slice(-credit.length)).toEqual(texts(credit))
  expect(texts(withCredit)[withCredit.length - credit.length - 1]!.trim()).toBe('')
  expect(texts(without).join('\n')).not.toMatch(/GNU\/GPL/)
})

test('with no credit given, nothing follows the columns', () => {
  expect(arrangeStrip(ctx(), 20)).toHaveLength(8)
})

test('there is no footnote in the strip, and no (*) pointing to one', () => {
  expect(texts(arrangeStrip(ctx(), 20)).join('\n')).not.toMatch(/\(\*\)/)
})

test('every group has a compact form with its width limits', () => {
  expect(time.strip).toMatchObject({ min: 22, max: 34 })
  expect(session.strip).toMatchObject({ min: 28, max: 40 })
  expect(project.strip).toMatchObject({ min: 12, max: 24 })
  expect(system.strip).toMatchObject({ min: 28, max: 40 })
})
