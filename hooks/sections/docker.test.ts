import { expect, test } from 'claude-code/testing'

import { containerLines, dockerLines, groupByNetwork } from './docker'
import { CPU_COLOR, GPU_COLOR } from './palette'

const c = (name: string, ...networks: string[]) => ({ name, networks })
/** The rows of a container with no GPU: its name, then its CPU bar. */
const rowsOf = (name: string, columns: number) => containerLines(name, columns).map(line => line.text)
const texts = (lines: { text: string }[]) => lines.map(l => l.text)

test('a container is its name, right-aligned and dim, over its CPU bar across the whole width', () => {
  const rows = containerLines('api', 20)

  expect(rows.map(row => row.text)).toEqual([' '.repeat(17) + 'api', '─'.repeat(20)])
  expect(rows[0]!.dimColor).toBe(true)
})

test('a name too long for the width is cut, and no row ever passes the width', () => {
  const rows = containerLines('x'.repeat(50), 20, { cpu: 50, gpu: 50 })

  expect(rows[0]!.text).toBe('x'.repeat(20))
  for (const row of rows) expect(row.text.length).toBe(20)
})

test('containers that share a network go together, in the order they come', () => {
  const groups = groupByNetwork([c('a', 'front'), c('b', 'back'), c('c', 'front'), c('d', 'back')])

  expect(groups.map(group => group.map(x => x.name))).toEqual([['a', 'c'], ['b', 'd']])
})

test('all on one network are one group', () => {
  expect(groupByNetwork([c('a', 'net'), c('b', 'net')]).length).toBe(1)
  expect(groupByNetwork([]).length).toBe(0)
})

test('a container on two networks joins the groups of both', () => {
  const groups = groupByNetwork([c('a', 'front'), c('b', 'back'), c('proxy', 'front', 'back'), c('z', 'other')])

  expect(groups.map(group => group.map(x => x.name))).toEqual([['a', 'b', 'proxy'], ['z']])
})

test('containers with no network are kept together rather than dropped', () => {
  expect(groupByNetwork([c('a'), c('b')]).map(group => group.length)).toEqual([2])
})

test('one network gives just the bars, with nothing between them', () => {
  const lines = dockerLines([c('a', 'net'), c('b', 'net')], 20, 5)

  expect(texts(lines)).toEqual([...rowsOf('a', 20), ...rowsOf('b', 20)])
})

test('several networks put a faint grey line between the groups', () => {
  const lines = dockerLines([c('a', 'x'), c('b', 'y')], 20, 5)

  expect(texts(lines)).toEqual([...rowsOf('a', 20), '─'.repeat(20), ...rowsOf('b', 20)])
  expect(lines[2].color).toBe('#3a3a3a')
})

test('the cap counts containers, not separators, and the rest are counted', () => {
  const lines = dockerLines([c('a', 'x'), c('b', 'x'), c('c', 'y'), c('d', 'y')], 20, 3)

  expect(texts(lines)).toEqual([
    ...rowsOf('a', 20),
    ...rowsOf('b', 20),
    '─'.repeat(20),
    ...rowsOf('c', 20),
    '+1 more',
  ])
  expect(lines[7].dimColor).toBe(true)
})

/** Half cells filled in `color` over all the rows of the container: a `▬` is two, a `╸` one. */
const halves = (load: { cpu?: number; gpu?: number }, color: string) =>
  containerLines('api', 20, load)
    .flatMap(line => line.cells ?? [])
    .filter(cell => cell.color === color)
    .reduce((sum, cell) => sum + [...cell.text].reduce((n, ch) => n + (ch === '▬' ? 2 : ch === '╸' ? 1 : 0), 0), 0)

test('the CPU bar is green and the GPU bar, under it, blue, in proportion, on a thin track', () => {
  // Each bar is 20 cells (40 halves): 50% is 20, 25% is 10.
  const rows = containerLines('api', 20, { cpu: 50, gpu: 25 })

  expect(rows.map(row => row.text)).toEqual([
    ' '.repeat(17) + 'api',
    '▬'.repeat(10) + '─'.repeat(10),
    '▬'.repeat(5) + '─'.repeat(15),
  ])
  expect(halves({ cpu: 50, gpu: 25 }, CPU_COLOR)).toBe(20)
  expect(halves({ cpu: 50, gpu: 25 }, GPU_COLOR)).toBe(10)
})

test('a bar with no load is empty, a trickle still shows a half cell and a full load fills it', () => {
  expect(halves({ cpu: 0, gpu: 0 }, CPU_COLOR) + halves({ cpu: 0, gpu: 0 }, GPU_COLOR)).toBe(0)
  expect(halves({ cpu: 0.4 }, CPU_COLOR)).toBe(1)
  expect(halves({ cpu: 250, gpu: 100 }, CPU_COLOR)).toBe(40)
  expect(halves({ cpu: 250, gpu: 100 }, GPU_COLOR)).toBe(40)
})

test('only a container that asked for a GPU has a GPU bar, and it has its own row', () => {
  const lines = dockerLines(
    [
      { name: 'cv', networks: ['n'], cpu: 10, gpu: true },
      { name: 'db', networks: ['n'], cpu: 10, gpu: false },
    ],
    20,
    5,
    100,
  )
  const blue = (i: number) => (lines[i]!.cells ?? []).filter(c => c.color === GPU_COLOR).reduce((sum, c) => sum + c.text.length, 0)

  expect(lines).toHaveLength(5)
  expect(blue(0)).toBe(0)
  expect(blue(2)).toBe(20)
  expect(lines[3]!.text.endsWith('db')).toBe(true)
  expect(blue(4)).toBe(0)
})
