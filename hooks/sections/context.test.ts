import { expect, test } from 'claude-code/testing'

import { BUFFER_COLOR, ROLE_COLORS, compositionCells, compositionLegend, roleOf } from './context'
import type { Category } from './context'
import type { Cell } from './usage'

const categories: Category[] = [
  { name: 'Messages', tokens: 100_000, kind: 'used' },
  { name: 'System prompt', tokens: 6_000, kind: 'used' },
  { name: 'System tools', tokens: 15_000, kind: 'used' },
  { name: 'MCP tools', tokens: 37_000, kind: 'used' },
  { name: 'Memory files', tokens: 4_000, kind: 'used' },
  { name: 'Autocompact buffer', tokens: 33_000, kind: 'buffer' },
  { name: 'Free space', tokens: 809_000, kind: 'free' },
]

const text = (cells: { text: string }[]) => cells.map(cell => cell.text).join('')

test('a consumer of context is told by its name: messages, system, MCP, anything else', () => {
  expect(roleOf('Messages')).toBe('messages')
  expect(roleOf('System prompt')).toBe('system')
  expect(roleOf('System tools')).toBe('system')
  expect(roleOf('MCP tools')).toBe('mcp')
  expect(roleOf('Memory files')).toBe('other')
  expect(roleOf('Skills')).toBe('other')
})

test('the bar has one run per consumer in a fixed order, then the reserve hatched, then the free track', () => {
  const cells = compositionCells(categories, 20)!

  expect(text(cells)).toHaveLength(20)
  expect(cells.map(cell => cell.color)).toEqual([
    ROLE_COLORS.messages,
    ROLE_COLORS.system,
    ROLE_COLORS.mcp,
    ROLE_COLORS.other,
    BUFFER_COLOR,
    undefined,
  ])
  expect(cells[4]!.text).toMatch(/^▒+$/)
  expect(cells[5]!.text).toMatch(/^░+$/)
  expect(cells.slice(0, 4).every(cell => /^█+$/.test(cell.text))).toBe(true)
})

test('a consumer with tokens always gets a cell, however small', () => {
  const cells = compositionCells(categories, 12)!

  expect(text(cells)).toHaveLength(12)
  for (const cell of cells) expect(cell.text.length).toBeGreaterThanOrEqual(1)
})

test('the system prompt and the system tools share one run', () => {
  const cells = compositionCells(
    [
      { name: 'System prompt', tokens: 50_000, kind: 'used' },
      { name: 'System tools', tokens: 50_000, kind: 'used' },
      { name: 'Free space', tokens: 100_000, kind: 'free' },
    ],
    20,
  )!

  expect(cells.map(cell => cell.text)).toEqual(['█'.repeat(10), '░'.repeat(10)])
  expect(cells[0]!.color).toBe(ROLE_COLORS.system)
})

test('tools loaded on demand are outside the window and are not drawn', () => {
  const withDeferred = [...categories, { name: 'Deferred tools', tokens: 900_000, kind: 'deferred' as const }]

  expect(compositionCells(withDeferred, 20)).toEqual(compositionCells(categories, 20))
  expect(compositionLegend(withDeferred, 40)).toEqual(compositionLegend(categories, 40))
})

test('with nothing to show there is no composition', () => {
  expect(compositionCells(undefined, 20)).toBeUndefined()
  expect(compositionCells([], 20)).toBeUndefined()
  expect(compositionCells([{ name: 'Free space', tokens: 0, kind: 'free' }], 20)).toBeUndefined()
})

test('the legend names the runs, largest first, the reserve among them; free space is never listed', () => {
  const rows = compositionLegend(categories, 40).map(text)

  expect(rows).toEqual(['■ msgs 100k  ■ mcp 37k  ▒ buffer 33k', '■ sys 21k  ■ other 4k'])
  expect(rows.join(' ')).not.toMatch(/free/)
})

test('a legend square carries the colour of its run, the words are dim', () => {
  const [row] = compositionLegend(categories, 40) as [Cell[]]

  expect(row[0]).toEqual({ text: '■', color: ROLE_COLORS.messages })
  expect(row[1]).toEqual({ text: ' msgs 100k', dimColor: true })
})

test('the legend takes at most two rows and never passes the band; what does not fit is left out', () => {
  for (const columns of [12, 20, 28, 40]) {
    const rows = compositionLegend(categories, columns)

    expect(rows.length).toBeLessThanOrEqual(2)
    for (const row of rows) expect(text(row).length).toBeLessThanOrEqual(columns)
  }
  expect(compositionLegend(categories, 28).map(text)).toEqual(['■ msgs 100k  ■ mcp 37k', '▒ buffer 33k  ■ sys 21k'])
  expect(compositionLegend(undefined, 28)).toEqual([])
})
