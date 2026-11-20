import { expect, test } from 'claude-code/testing'

import type { SessionStats } from './groups/types'
import { trackTool } from './tools'

const fresh = (): SessionStats => ({ toolCalls: 0, activeTools: 0 })

/** A call that stays open until the test lets it finish. */
const gate = () => {
  let release!: () => void
  const done = new Promise<void>(resolve => {
    release = resolve
  })
  return { done, release }
}

test('a tool is running while its call is open and cleared after', async () => {
  const stats = fresh()
  const call = gate()
  const running = trackTool(stats, 'Bash', () => call.done)

  expect(stats.toolCalls).toBe(1)
  expect(stats.runningTool).toBe('Bash')

  call.release()
  await running

  expect(stats.runningTool).toBeUndefined()
  expect(stats.activeTools).toBe(0)
})

test('a tool that ends first does not clear the one still running', async () => {
  const stats = fresh()
  const first = gate()
  const second = gate()
  const a = trackTool(stats, 'Read', () => first.done)
  const b = trackTool(stats, 'Grep', () => second.done)

  expect(stats.toolCalls).toBe(2)
  expect(stats.activeTools).toBe(2)

  first.release()
  await a

  expect(stats.activeTools).toBe(1)
  expect(stats.runningTool).toBeDefined()

  second.release()
  await b

  expect(stats.activeTools).toBe(0)
  expect(stats.runningTool).toBeUndefined()
})

test('a failing call still counts as finished and the error goes on', async () => {
  const stats = fresh()

  await expect(
    trackTool(stats, 'Bash', async () => {
      throw new Error('boom')
    }),
  ).rejects.toThrow('boom')

  expect(stats.toolCalls).toBe(1)
  expect(stats.activeTools).toBe(0)
  expect(stats.runningTool).toBeUndefined()
})

test('what the call resolves to is handed back unchanged', async () => {
  const result = { ok: true }

  expect(await trackTool(fresh(), 'Bash', async () => result)).toBe(result)
})

test('each call is remembered with its time, and the times older than the chart are forgotten', async () => {
  const stats: SessionStats = { toolCalls: 0, activeTools: 0 }
  const NOW = 100 * 60_000

  await trackTool(stats, 'Read', async () => 1, NOW - 11 * 60_000)
  await trackTool(stats, 'Bash', async () => 2, NOW - 60_000)
  await trackTool(stats, 'Edit', async () => 3, NOW)

  expect(stats.toolCalls).toBe(3)
  expect(stats.toolTimes).toEqual([NOW - 60_000, NOW])
})

test('without a time a call is counted and nothing is charted', async () => {
  const stats: SessionStats = { toolCalls: 0, activeTools: 0 }

  await trackTool(stats, 'Read', async () => 1)

  expect(stats.toolCalls).toBe(1)
  expect(stats.toolTimes).toBeUndefined()
})

test('each tool is counted by its name', async () => {
  const stats = fresh()

  await trackTool(stats, 'Bash', async () => 1)
  await trackTool(stats, 'Bash', async () => 1)
  await trackTool(stats, 'Read', async () => 1)

  expect(stats.toolCounts).toEqual({ Bash: 2, Read: 1 })
})
