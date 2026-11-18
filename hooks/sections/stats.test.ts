import { expect, test } from 'claude-code/testing'

import { effortCells, modelName, toolSpark } from './stats'
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
