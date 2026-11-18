import { expect, test } from 'claude-code/testing'

import {
  bar,
  colorFor,
  footRule,
  formatTokens,
  meter,
  paceNote,
  rule,
  softRule,
  titledRule,
  usageLines as stackedLines,
} from './usage'
import type { UsageData } from './usage'

/** The rows with something on them: the stacked band also leaves blank rows between its parts. */
const usageLines = (...args: Parameters<typeof stackedLines>) => stackedLines(...args).filter(line => line.text.trim() !== '')

const NOW = Date.parse('2026-11-16T10:00:00Z')
const endsIn = (ms: number) => new Date(NOW + ms).toISOString()

/** Session has 77% of its five hours behind it (1h09m left); Weekly is half way (3.5 days left). */
const windows = (): UsageData => ({
  contextTokens: 10_000,
  contextWindow: 200_000,
  contextPercent: 5,
  limits: [
    { kind: 'seven_day', percentUsed: 23, resetsAt: endsIn(302_400_000) },
    { kind: 'five_hour', percentUsed: 41, resetsAt: endsIn(4_140_000) },
  ],
})

test('a meter can carry a mark where the time of its window stands', () => {
  expect(meter('Session', 41, 24, 0.77)).toBe('Session █████░░░┃░░  41%')
  expect(meter('Session', 41, 24, 0)).toBe('Session ┃████░░░░░░  41%')
  expect(meter('Session', 41, 24, 1)).toBe('Session █████░░░░░┃  41%')
  expect(meter('Session', 41, 24, 7)).toBe(meter('Session', 41, 24, 1))
  expect(meter('Session', 41, 24, -3)).toBe(meter('Session', 41, 24, 0))
  expect(meter('Session', 41, 24, 0.77).length).toBe(meter('Session', 41, 24).length)
})

test('the plan meters are marked where their time stands; the context and the rest are not', () => {
  const lines = usageLines(windows(), 24, NOW).map(l => l.text)

  expect(lines[1]).not.toContain('┃')
  expect(lines[2]).toBe('Session █████░░░┃░░  41%')
  expect(lines[3]).toBe('Weekly  ███░░┃░░░░░  23%')

  const spend = usageLines(
    { contextWindow: 200_000, limits: [{ kind: 'spend_limit', percentUsed: 50, resetsAt: endsIn(3_600_000) }] },
    24,
    NOW,
  ).map(l => l.text)
  expect(spend.some(t => t.startsWith('Spend') && !t.includes('┃'))).toBe(true)
})

test('a one-row legend under the meters says what the tick is', () => {
  const lines = usageLines(windows(), 30, NOW)

  expect(lines.slice(4)).toEqual([
    {
      text: '┃ time elapsed in the window',
      dimColor: true,
      cells: [
        { text: '┃', color: 'green' },
        { text: ' time elapsed in the window', color: undefined, dimColor: true },
      ],
    },
  ])
  expect(lines.length).toBe(5)
})

test('the legend shortens in a narrow band, goes when it cannot fit, and never overflows', () => {
  const legend = (columns: number) => usageLines(windows(), columns, NOW).slice(4).map(l => l.text)

  expect(legend(28)).toEqual(['┃ time elapsed in the window'])
  expect(legend(27)).toEqual(['┃ time elapsed'])
  expect(legend(14)).toEqual(['┃ time elapsed'])
  expect(legend(13)).toEqual([])
  for (let columns = 10; columns <= 40; columns++) {
    for (const line of usageLines(windows(), columns, NOW)) expect(line.text.length).toBeLessThanOrEqual(columns)
  }
})

test('when its note is to be drawn, the legend points to it with a (*)', () => {
  const legend = (columns: number, noted = true) =>
    usageLines(windows(), columns, NOW, noted).slice(4).map(l => l.text)

  expect(usageLines(windows(), 32, NOW, true).slice(4).map(l => l.text)).toEqual(['┃ time elapsed in the window (*)'])
  expect(legend(31)).toEqual(['┃ time elapsed (*)'])
  expect(legend(18)).toEqual(['┃ time elapsed (*)'])
  expect(legend(17)).toEqual([])
  expect(legend(30, false)).toEqual(['┃ time elapsed in the window'])
  expect(usageLines(windows(), 32, undefined, true).some(l => l.text.includes('(*)'))).toBe(false)
})

test('the pace note starts with the same (*), indents what wraps and says how to read the tick', () => {
  const note = paceNote(windows(), 30, NOW).map(l => l.text)

  expect(note.length).toBeGreaterThan(1)
  expect(note[0].startsWith('(*) If ┃ is inside')).toBe(true)
  expect(note.slice(1).every(text => text.startsWith('    ') && !text.startsWith('     '))).toBe(true)
  expect(note.map(text => text.slice(4)).join(' ')).toBe(
    'If ┃ is inside the fill, you spend faster than time passes; beyond it, you are under pace.',
  )
  expect(note.every(text => text.length <= 30)).toBe(true)
  expect(paceNote(windows(), 30, NOW).every(l => l.dimColor === true)).toBe(true)
})

test('the pace note is only there while a tick is drawn and the legend can point to it', () => {
  expect(paceNote(windows(), 30)).toEqual([])
  expect(paceNote(undefined, 30, NOW)).toEqual([])
  expect(paceNote({ contextWindow: 200_000, limits: [] }, 30, NOW)).toEqual([])
  expect(paceNote(windows(), 18, NOW).length).toBeGreaterThan(0)
  expect(paceNote(windows(), 17, NOW)).toEqual([])
})

test('a short faint rule sets the footnotes apart from the band', () => {
  expect(footRule(30)).toEqual({ text: '┈'.repeat(10), color: '#b36200' })
  expect(footRule(12).text).toBe('┈'.repeat(4))
  expect(footRule(6).text).toBe('┈'.repeat(3))
  expect(footRule(2).text).toBe('┈┈')
  expect(footRule(30).text).not.toBe(softRule(30).text)
})

test('with no tick on the meters there is no legend', () => {
  expect(usageLines(windows(), 30)).toHaveLength(4)
  expect(usageLines({ contextWindow: 200_000, limits: [] }, 30, NOW)).toHaveLength(4)
  expect(
    usageLines(
      { contextWindow: 200_000, limits: [{ kind: 'spend_limit', percentUsed: 50, resetsAt: endsIn(3_600_000) }] },
      30,
      NOW,
    ).some(l => l.text.includes('time elapsed')),
  ).toBe(false)
})

test('without the time, or without a valid end, a meter has no mark', () => {
  expect(usageLines(windows(), 24).some(l => l.text.includes('┃'))).toBe(false)

  const broken: UsageData = {
    contextWindow: 200_000,
    limits: [{ kind: 'five_hour', percentUsed: 41, resetsAt: 'soon' }, { kind: 'seven_day', percentUsed: 23 }],
  }
  expect(usageLines(broken, 24, NOW).some(l => l.text.includes('┃'))).toBe(false)
})

test('a window row ends with the time left, short and dim, where the bar keeps at least 8 cells', () => {
  const rows = usageLines(windows(), 28, NOW).filter(l => /^(Session|Weekly)/.test(l.text))

  expect(rows[0]!.text).toMatch(/^Session [█░┃]{8}  41%   1h9m$/)
  expect(rows[1]!.text).toMatch(/^Weekly  [█░┃]{8}  23%  3d12h$/)
  for (const row of rows) {
    expect(row.text).toHaveLength(28)
    expect(row.cells!.map(cell => cell.text).join('')).toBe(row.text)
    expect(row.cells!.at(-1)!.dimColor).toBe(true)
    expect(row.cells!.at(-1)!.color).toBeUndefined()
  }
})

test('the time left is left out where the bar would be shorter than 8 cells, and for a window with no valid end', () => {
  expect(usageLines(windows(), 27, NOW).find(l => l.text.startsWith('Session'))!.text).toHaveLength(27)
  expect(usageLines(windows(), 27, NOW).find(l => l.text.startsWith('Session'))!.text).not.toMatch(/1h9m/)
  expect(usageLines(windows(), 28, NOW).find(l => l.text.startsWith('Session'))!.text).toMatch(/1h9m$/)
  expect(usageLines(windows(), 40, undefined).find(l => l.text.startsWith('Session'))!.text).not.toMatch(/1h9m/)

  const data: UsageData = {
    contextWindow: 200_000,
    limits: [
      { kind: 'five_hour', percentUsed: 41, resetsAt: 'soon' },
      { kind: 'seven_day', percentUsed: 23 },
      { kind: 'spend_limit', percentUsed: 50, resetsAt: endsIn(2 * 3_600_000) },
    ],
  }
  const rows = usageLines(data, 30, NOW)
  expect(rows.find(l => l.text.startsWith('Session'))!.text).toBe(meter('Session', 41, 30))
  expect(rows.find(l => l.text.startsWith('Weekly'))!.text).toBe(meter('Weekly', 23, 30))
  expect(rows.find(l => l.text.startsWith('Spend'))!.text).toMatch(/ 50% +2h$/)
})

test('the bar of a window is shorter by what the time left takes, so the row never passes the band', () => {
  for (let columns = 20; columns <= 44; columns++) {
    for (const line of usageLines(windows(), columns, NOW)) expect(line.text.length).toBeLessThanOrEqual(columns)
  }
})

const breakdown = [
  { name: 'Messages', tokens: 100_000, kind: 'used' as const },
  { name: 'MCP tools', tokens: 37_000, kind: 'used' as const },
  { name: 'Autocompact buffer', tokens: 33_000, kind: 'buffer' as const },
  { name: 'Free space', tokens: 830_000, kind: 'free' as const },
]

test('with the breakdown, the context bar is drawn in runs and keeps its number', () => {
  const lines = usageLines({ ...windows(), contextTokens: 137_000, contextWindow: 1_000_000, contextPercent: 14, categories: breakdown }, 28, NOW)
  const row = lines[1]!

  expect(lines[0]!.text).toBe('Context 137k / 1.0M')
  expect(row.text).toHaveLength(28)
  expect(row.text.endsWith('  14%')).toBe(true)
  expect(row.cells!.map(cell => cell.text).join('')).toBe(row.text)
  expect(row.cells!.some(cell => cell.color === '#2b6cb0')).toBe(true)
  expect(row.cells!.some(cell => cell.color === '#0f766e')).toBe(true)
  expect(row.text).toMatch(/█+▒+░+ +14%$/)
})

test('the legend of the runs sits right under the context bar, before the plan windows', () => {
  const lines = usageLines({ ...windows(), contextWindow: 1_000_000, contextPercent: 14, categories: breakdown }, 28, NOW)

  expect(lines.slice(2, 4).map(l => l.text)).toEqual(['■ msgs 100k  ■ mcp 37k', '▒ buffer 33k'])
  expect(lines[4]!.text.startsWith('Session')).toBe(true)
})

test('the number of the context bar warns from 70% and alarms from 85%, whatever the runs', () => {
  const at = (contextPercent: number) =>
    usageLines({ contextWindow: 1_000_000, contextPercent, limits: [], categories: breakdown }, 28)[1]!.cells!.at(-1)!.color

  expect(at(60)).toBeUndefined()
  expect(at(70)).toBe('yellow')
  expect(at(85)).toBe('red')
})

test('without the breakdown the context bar is the plain one, as before', () => {
  const lines = usageLines({ contextTokens: 10_000, contextWindow: 200_000, contextPercent: 5, limits: [] }, 30)

  expect(lines[1]!.text).toBe(meter('', 5, 30))
  expect(lines[1]!.cells).toBeUndefined()
})

test('the rule inside a group is fainter than the one between groups', () => {
  const soft = softRule(12)

  expect(soft.text).toBe('┈'.repeat(12))
  expect(soft.color).toBe('#b36200')
  expect(rule(12).color).toBe('#ff8c00')
  expect(soft.text).not.toBe(rule(12).text)
  expect(rule(12).text).toBe('━'.repeat(12))
})

test('a titled rule carries the name of the section and fills the width', () => {
  const line = titledRule('Claude', 30)

  expect(line.text).toBe('━━ Claude ' + '━'.repeat(20))
  expect(line.text.length).toBe(30)
  expect(line.color).toBe('#ff8c00')
})

test('a titled rule never overflows a narrow band', () => {
  expect(titledRule('Claude', 8).text).toBe('━━ Claud')
  expect(titledRule('Claude', 10).text).toBe('━━ Claude ')
})

test('tokens are written short', () => {
  expect(formatTokens(950)).toBe('950')
  expect(formatTokens(87_400)).toBe('87k')
  expect(formatTokens(1_250_000)).toBe('1.3M')
})

test('the context warns from 70% and alarms from 85%', () => {
  expect(colorFor(40)).toBeUndefined()
  expect(colorFor(70)).toBe('yellow')
  expect(colorFor(85)).toBe('red')
})

test('the bar fills in proportion', () => {
  expect(bar(50, 10)).toBe('█████░░░░░')
  expect(bar(150, 4)).toBe('████')
})

test('a meter shows the bar and the number', () => {
  expect(meter('Weekly', 41, 24)).toBe('Weekly  ' + bar(41, 11) + '  41%')
  expect(meter('', 43, 20)).toBe(bar(43, 15) + '  43%')
  expect(meter('Session', undefined, 24)).toBe('Session ' + '░'.repeat(11) + '    —')
})

test('an API account shows empty plan meters; a plan fills them', () => {
  const api = usageLines(
    { contextTokens: 87_000, contextWindow: 200_000, contextPercent: 43, costUsd: 2.3, limits: [] },
    30,
  ).map(l => l.text)
  expect(api[0]).toBe('Context 87k / 200k')
  expect(api[1]).toBe(meter('', 43, 30))
  expect(api[2]).toBe(meter('Session', undefined, 30))
  expect(api[3]).toBe(meter('Weekly', undefined, 30))
  expect(api.length).toBe(4)

  const plan = usageLines(
    {
      contextTokens: 10_000,
      contextWindow: 200_000,
      contextPercent: 5,
      limits: [
        { kind: 'seven_day', percentUsed: 41 },
        { kind: 'five_hour', percentUsed: 23.4 },
      ],
    },
    30,
  ).map(l => l.text)
  expect(plan[2]).toBe(meter('Session', 23.4, 30))
  expect(plan[3]).toBe(meter('Weekly', 41, 30))
})

test('a window at 85% or more is red, with the number still readable', () => {
  const lines = usageLines(
    { contextWindow: 200_000, limits: [{ kind: 'seven_day', percentUsed: 91 }] },
    30,
  )
  const weekly = lines.find(l => l.text.startsWith('Weekly'))!
  expect(weekly.color).toBe('red')
  expect(weekly.text).toContain('91%')
})

test('before the first answer the context is a dash and lines never overflow', () => {
  const lines = usageLines({ contextWindow: 200_000, limits: [] }, 12)
  expect(lines[0].text.startsWith('Context —')).toBe(true)
  for (const line of lines) expect(line.text.length).toBeLessThanOrEqual(12)
})

test('the tick is green on every meter that has one, and nothing else on the row changes colour', () => {
  const lines = usageLines(windows(), 24, NOW)

  expect(lines[1].cells).toBeUndefined()
  for (const line of lines.slice(2, 4)) {
    const green = line.cells!.filter(cell => cell.color === 'green')
    expect(green).toEqual([{ text: '┃', color: 'green' }])
    expect(line.cells!.map(cell => cell.text).join('')).toBe(line.text)
    expect(line.cells!.filter(cell => cell.color !== 'green').every(cell => cell.color === line.color)).toBe(true)
  }
})

test('in the footnote and the legend the tick is green and the (*) bright yellow; the rest stays dim', () => {
  const note = paceNote(windows(), 30, NOW)
  const cells = note.flatMap(l => l.cells ?? [])

  expect(cells.filter(c => c.text === '(*)')).toEqual([{ text: '(*)', color: 'yellowBright' }])
  expect(cells.filter(c => c.color === 'green')).toEqual([{ text: '┃', color: 'green' }])
  expect(cells.filter(c => c.color === undefined).every(c => c.dimColor === true)).toBe(true)
  expect(note.map(l => (l.cells ?? [l]).map(c => c.text).join(''))).toEqual(note.map(l => l.text))

  const legend = usageLines(windows(), 32, NOW, true).slice(4)[0]!

  expect(legend.cells!.find(c => c.text === '(*)')).toEqual({ text: '(*)', color: 'yellowBright' })
})

test('a blank row sits under the context bar, under the legend of its runs, between the windows and after the last', () => {
  const data = { ...windows(), contextWindow: 1_000_000, contextPercent: 14, categories: breakdown }
  const rows = stackedLines(data, 28, NOW).map(l => (l.text.trim() === '' ? '' : l.text.slice(0, 5)))

  expect(rows).toEqual(['Conte', '███▒░'.slice(0, 1).repeat(0) + rows[1]!, '', '■ msg', '▒ buf', '', 'Sessi', '', 'Weekl', '', '┃ tim'])
})

test('with no legend of runs the first blank row still follows the context bar', () => {
  const rows = stackedLines(windows(), 28, NOW).map(l => (l.text.trim() === '' ? '' : l.text.slice(0, 5)))

  expect(rows.slice(2, 5)).toEqual(['', 'Sessi', ''])
})
