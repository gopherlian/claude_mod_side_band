import { expect, test } from 'claude-code/testing'

import { containerLine, dockerLines, groupByNetwork } from './docker'
import { CPU_COLOR, GPU_COLOR } from './palette'

const c = (name: string, ...networks: string[]) => ({ name, networks })
const texts = (lines: { text: string }[]) => lines.map(l => l.text)

test('a container is a bar and its name, filling the width', () => {
  expect(containerLine('api', 20).text).toBe('▀'.repeat(16) + ' api')
})

test('the longer the name, the shorter the bar', () => {
  const barOf = (text: string) => text.split(' ')[0].length
  const short = containerLine('db', 30).text
  const long = containerLine('gateway-dev-workspace', 40).text

  expect(short.length).toBe(30)
  expect(long.length).toBe(40)
  expect(barOf(containerLine('gateway-dev-workspace', 30).text)).toBeLessThan(barOf(short))
})

test('a name too long for the width is cut, a bar stays and the line never overflows', () => {
  const line = containerLine('x'.repeat(50), 20).text

  expect(line.length).toBe(20)
  expect(line.startsWith('▀▀ x')).toBe(true)
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

  expect(texts(lines)).toEqual([containerLine('a', 20).text, containerLine('b', 20).text])
})

test('several networks put a faint grey line between the groups', () => {
  const lines = dockerLines([c('a', 'x'), c('b', 'y')], 20, 5)

  expect(texts(lines)).toEqual([containerLine('a', 20).text, '─'.repeat(20), containerLine('b', 20).text])
  expect(lines[1].color).toBe('#3a3a3a')
})

test('the cap counts containers, not separators, and the rest are counted', () => {
  const lines = dockerLines([c('a', 'x'), c('b', 'x'), c('c', 'y'), c('d', 'y')], 20, 3)

  expect(texts(lines)).toEqual([
    containerLine('a', 20).text,
    containerLine('b', 20).text,
    '─'.repeat(20),
    containerLine('c', 20).text,
    '+1 more',
  ])
  expect(lines[4].dimColor).toBe(true)
})

const runs = (load: { cpu?: number; gpu?: number }) =>
  containerLine('api', 20, load).cells!.filter(cell => cell.text.includes('▀'))
const filledCells = (load: { cpu?: number; gpu?: number }, half: 'color' | 'backgroundColor', color: string) =>
  runs(load)
    .filter(cell => cell[half] === color)
    .reduce((sum, cell) => sum + cell.text.length, 0)

test('the top half of the bar is the CPU in green and the bottom half the GPU in blue, in proportion', () => {
  // 16 cells of bar: 50% is 8, 25% is 4.
  const load = { cpu: 50, gpu: 25 }

  expect(filledCells(load, 'color', CPU_COLOR)).toBe(8)
  expect(filledCells(load, 'backgroundColor', GPU_COLOR)).toBe(4)
  expect(runs(load).reduce((sum, cell) => sum + cell.text.length, 0)).toBe(16)
})

test('a bar with no load is empty, a trickle still shows one cell and a full load fills it', () => {
  expect(filledCells({}, 'color', CPU_COLOR) + filledCells({}, 'backgroundColor', GPU_COLOR)).toBe(0)
  expect(filledCells({ cpu: 0.4 }, 'color', CPU_COLOR)).toBe(1)
  expect(filledCells({ cpu: 250, gpu: 100 }, 'color', CPU_COLOR)).toBe(16)
  expect(filledCells({ cpu: 250, gpu: 100 }, 'backgroundColor', GPU_COLOR)).toBe(16)
})

test('only a container that asked for a GPU shows the GPU use', () => {
  const lines = dockerLines(
    [
      { name: 'cv', networks: ['n'], cpu: 10, gpu: true },
      { name: 'db', networks: ['n'], cpu: 10, gpu: false },
    ],
    20,
    5,
    100,
  )
  const blue = (i: number) =>
    lines[i].cells!.filter(c => c.backgroundColor === GPU_COLOR).reduce((sum, c) => sum + c.text.length, 0)

  expect(blue(0)).toBe(17)
  expect(blue(1)).toBe(0)
})
