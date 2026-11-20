import { expect, test } from 'claude-code/testing'

import { effortCells, hasRecentCalls, modelName, shortToolName, thinBar, toolBraille, toolRanking, toolSpark } from './stats'
import type { Cell } from './usage'

const MIN = 60_000
const NOW = Date.parse('2026-11-16T10:00:00Z')

test('a model id is shortened to its name and version; a name is left as it is', () => {
  expect(modelName('claude-sonnet-5-5')).toBe('Sonnet 5.5')
  expect(modelName('claude-opus-5-5-20260101')).toBe('Opus 5.5')
  expect(modelName('claude-fable-5-2')).toBe('Fable 5.2')
  expect(modelName('claude-haiku-5')).toBe('Haiku 5')
  expect(modelName('Opus 5.5')).toBe('Opus 5.5')
  expect(modelName('Sonnet')).toBe('Sonnet')
  expect(modelName('gpt-4o')).toBe('gpt-4o')
})

test('the effort is five pips filled up to its level, then its word', () => {
  expect(effortCells('low').map(c => c.text).join('')).toBe('●○○○○ low')
  expect(effortCells('medium').map(c => c.text).join('')).toBe('●●○○○ medium')
  expect(effortCells('high').map(c => c.text).join('')).toBe('●●●○○ high')
  expect(effortCells('xhigh').map(c => c.text).join('')).toBe('●●●●○ xhigh')
  expect(effortCells('max').map(c => c.text).join('')).toBe('●●●●● max')
})

test('the filled pips are lit, the empty ones faint, and the word is dim', () => {
  const [lit, faint, word] = effortCells('medium') as [Cell, Cell, Cell]

  expect(lit.text).toBe('●●')
  expect(faint.text).toBe('○○○')
  expect(lit.color).toBeDefined()
  expect(faint.color).toBeDefined()
  expect(lit.color).not.toBe(faint.color)
  expect(word).toEqual({ text: ' medium', dimColor: true })
})

test('an effort that is not a known level is only its word', () => {
  expect(effortCells('turbo')).toEqual([{ text: 'turbo', dimColor: true }])
})

test('the tool chart has one cell a minute, the oldest on the left, a dot for a quiet minute', () => {
  expect(toolSpark([], NOW, 10)).toBe('··········')

  const spark = toolSpark([NOW - 30_000, NOW - 20_000, NOW - 10_000, NOW - 5 * MIN - 30_000], NOW, 10)
  expect(spark).toHaveLength(10)
  expect(spark[9]).toBe('█')
  expect(spark[4]).not.toBe('·')
  expect(spark.replace(/[^·]/g, '')).toHaveLength(8)
})

test('the chart is scaled to its busiest minute and the calls older than the chart are not counted', () => {
  const calls = [...Array(8).fill(NOW - 30_000), NOW - 3 * MIN - 1000, NOW - 11 * MIN]

  const spark = toolSpark(calls, NOW, 10)
  expect(spark[9]).toBe('█')
  expect(spark[6]).toBe('▂')
  expect(spark.replace(/[^·]/g, '')).toHaveLength(8)
})

test('the chart is as wide as asked and shows the whole ten minutes in fewer cells', () => {
  expect(toolSpark([NOW - 1000], NOW, 5)).toHaveLength(5)
  expect(toolSpark([NOW - 1000], NOW, 0)).toBe('')
})

test('an MCP tool is shown by its own name, without its server', () => {
  expect(shortToolName('mcp__engram__mem_save')).toBe('mem_save')
  expect(shortToolName('Bash')).toBe('Bash')
})

test('the tools are ranked by use, ties by name, and the same short name adds up', () => {
  expect(toolRanking({ Read: 2, Bash: 5, Edit: 2, mcp__a__find: 1, mcp__b__find: 1 })).toEqual([
    { name: 'Bash', count: 5 },
    { name: 'Edit', count: 2 },
    { name: 'find', count: 2 },
    { name: 'Read', count: 2 },
  ])
  expect(toolRanking({})).toEqual([])
})

test('the braille chart is as wide as asked, top row first, with a baseline of dots where nothing ran', () => {
  const quiet = toolBraille([], NOW, 6, 3)
  expect(quiet).toEqual(['⠀⠀⠀⠀⠀⠀', '⠀⠀⠀⠀⠀⠀', '⣀⣀⣀⣀⣀⣀'])

  // One call in the last slice is the busiest: it fills the right column of the last cell, four dots a row.
  const one = toolBraille([NOW - 1000], NOW, 6, 3)
  expect(one.map(row => row.length)).toEqual([6, 6, 6])
  expect(one[0]!.at(-1)).toBe('⢸')
  // On the bottom row the quiet slice beside it leaves its baseline dot.
  expect(one[2]!.at(-1)).toBe('⣸')
  expect(one[2]![0]).toBe('⣀')
  expect(toolBraille([NOW - 1000], NOW, 0, 3)).toEqual([])
})

test('a thin bar is heavy line where full, light where not, and steps by halves of a cell', () => {
  expect(thinBar(0, 4)).toEqual({ fill: '', track: '────' })
  expect(thinBar(0.5, 4)).toEqual({ fill: '━━', track: '──' })
  expect(thinBar(0.375, 4)).toEqual({ fill: '━╸', track: '──' })
  expect(thinBar(1, 4)).toEqual({ fill: '━━━━', track: '' })
})

test('there are recent calls only when one fell in the last ten minutes', () => {
  expect(hasRecentCalls([], NOW)).toBe(false)
  expect(hasRecentCalls([NOW - 11 * MIN], NOW)).toBe(false)
  expect(hasRecentCalls([NOW - 11 * MIN, NOW - 1000], NOW)).toBe(true)
  expect(hasRecentCalls([NOW + 5000], NOW)).toBe(false)
})
