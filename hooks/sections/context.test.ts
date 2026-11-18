import { expect, test } from 'claude-code/testing'

import { BUFFER_COLOR, ROLE_COLORS, compositionCells, roleOf } from './context'
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

test('the bar has one run per consumer in a fixed order, then the reserve hatched, then the thin free track', () => {
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
  expect(cells[5]!.text).toMatch(/^─+$/)
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

  expect(cells.map(cell => cell.text)).toEqual(['█'.repeat(10), '─'.repeat(10)])
  expect(cells[0]!.color).toBe(ROLE_COLORS.system)
})

test('tools loaded on demand are outside the window and are not drawn', () => {
  const withDeferred = [...categories, { name: 'Deferred tools', tokens: 900_000, kind: 'deferred' as const }]

  expect(compositionCells(withDeferred, 20)).toEqual(compositionCells(categories, 20))
})

test('with nothing to show there is no composition', () => {
  expect(compositionCells(undefined, 20)).toBeUndefined()
  expect(compositionCells([], 20)).toBeUndefined()
  expect(compositionCells([{ name: 'Free space', tokens: 0, kind: 'free' }], 20)).toBeUndefined()
})
