import { expect, test } from 'claude-code/testing'

import { containerLines, dockerLines, groupByNetwork } from './docker'
import { CPU_COLOR, GPU_COLOR } from './palette'

const c = (name: string, ...networks: string[]) => ({ name, networks })
const first = (name: string, columns: number) => containerLines(name, columns)[0]!.text
const texts = (lines: { text: string }[]) => lines.map(l => l.text)

test('a container is its CPU bar and its name, filling the width', () => {
  expect(first('api', 20)).toBe('─'.repeat(16) + ' api')
})

test('the longer the name, the shorter the bar', () => {
  const barOf = (text: string) => text.split(' ')[0].length
  const short = first('db', 30)
  const long = first('gateway-dev-workspace', 40)

  expect(short.length).toBe(30)
  expect(long.length).toBe(40)
  expect(barOf(first('gateway-dev-workspace', 30))).toBeLessThan(barOf(short))
})

test('a name too long for the width is cut, a bar stays and the line never overflows', () => {
  const line = first('x'.repeat(50), 20)

  expect(line.length).toBe(20)
  expect(line.startsWith('── x')).toBe(true)
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

  expect(texts(lines)).toEqual([first('a', 20), first('b', 20)])
})

test('several networks put a faint grey line between the groups', () => {
  const lines = dockerLines([c('a', 'x'), c('b', 'y')], 20, 5)

  expect(texts(lines)).toEqual([first('a', 20), '─'.repeat(20), first('b', 20)])
  expect(lines[1].color).toBe('#3a3a3a')
})

test('the cap counts containers, not separators, and the rest are counted', () => {
  const lines = dockerLines([c('a', 'x'), c('b', 'x'), c('c', 'y'), c('d', 'y')], 20, 3)

  expect(texts(lines)).toEqual([
    first('a', 20),
    first('b', 20),
    '─'.repeat(20),
    first('c', 20),
    '+1 more',
  ])
  expect(lines[4].dimColor).toBe(true)
})

/** Half cells filled in `color` over all the rows of the container: a `▬` is two, a `╸` one. */
const halves = (load: { cpu?: number; gpu?: number }, color: string) =>
  containerLines('api', 20, load)
    .flatMap(line => line.cells!)
    .filter(cell => cell.color === color)
    .reduce((sum, cell) => sum + [...cell.text].reduce((n, ch) => n + (ch === '▬' ? 2 : ch === '╸' ? 1 : 0), 0), 0)

test('the CPU bar is green and the GPU bar, under it, blue, in proportion, on a thin track', () => {
  // Each bar is 16 cells (32 halves): 50% is 16, 25% is 8.
  const rows = containerLines('api', 20, { cpu: 50, gpu: 25 })

  expect(rows.map(row => row.text)).toEqual(['▬'.repeat(8) + '─'.repeat(8) + ' api', '▬▬▬▬' + '─'.repeat(12)])
  expect(halves({ cpu: 50, gpu: 25 }, CPU_COLOR)).toBe(16)
  expect(halves({ cpu: 50, gpu: 25 }, GPU_COLOR)).toBe(8)
})

test('a bar with no load is empty, a trickle still shows a half cell and a full load fills it', () => {
  expect(halves({ cpu: 0, gpu: 0 }, CPU_COLOR) + halves({ cpu: 0, gpu: 0 }, GPU_COLOR)).toBe(0)
  expect(halves({ cpu: 0.4 }, CPU_COLOR)).toBe(1)
  expect(halves({ cpu: 250, gpu: 100 }, CPU_COLOR)).toBe(32)
  expect(halves({ cpu: 250, gpu: 100 }, GPU_COLOR)).toBe(32)
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
  const blue = (i: number) => lines[i]!.cells!.filter(c => c.color === GPU_COLOR).reduce((sum, c) => sum + c.text.length, 0)

  expect(lines).toHaveLength(3)
  expect(blue(0)).toBe(0)
  expect(blue(1)).toBe(17)
  expect(lines[2]!.text.endsWith(' db')).toBe(true)
})
