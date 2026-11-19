import { expect, test } from 'claude-code/testing'

import { wrap, wrapCells, wrapParts } from './wrap'

test('words are packed into rows no wider than the band', () => {
  expect(wrap('one two three four', 9)).toEqual(['one two', 'three', 'four'])
  expect(wrap('one two three four', 100)).toEqual(['one two three four'])
  expect(wrap('one two', 7)).toEqual(['one two'])
})

test('a word longer than the band is cut instead of overflowing', () => {
  expect(wrap('abcdefghij kl', 4)).toEqual(['abcd', 'efgh', 'ij', 'kl'])
})

test('nothing to wrap, or no room, gives no rows', () => {
  expect(wrap('', 10)).toEqual([])
  expect(wrap('   ', 10)).toEqual([])
  expect(wrap('word', 0)).toEqual([])
})

test('parts are packed whole, joined by the separator, and a part wider than the band is cut', () => {
  expect(wrapParts(['↑24° ↓15°', 'rain 30%', 'UV 6'], 20)).toEqual(['↑24° ↓15° · rain 30%', 'UV 6'])
  expect(wrapParts(['a', 'b', 'c'], 100)).toEqual(['a · b · c'])
  expect(wrapParts(['abcdef', 'g'], 4)).toEqual(['abcd', 'ef', 'g'])
  expect(wrapParts(['', 'a'], 10)).toEqual(['a'])
  expect(wrapParts(['a'], 0)).toEqual([])
})

test('a coloured row wraps at its spaces and every run keeps its colour', () => {
  const cells = [{ text: '1h00m' }, { text: ' · ', dimColor: true }, { text: '$3.00', color: 'green' }, { text: ' · $3.00/h', dimColor: true }]
  const rows = wrapCells(cells, 9).map(row => row.map(cell => cell.text).join(''))

  expect(rows).toEqual(['1h00m', '$3.00', '$3.00/h'])
  expect(wrapCells(cells, 100).map(row => row.map(cell => cell.text).join(''))).toEqual(['1h00m · $3.00 · $3.00/h'])
  expect(wrapCells(cells, 9)[1]).toEqual([{ text: '$3.00', color: 'green' }])
  expect(wrapCells([{ text: 'abcdefgh', color: 'red' }], 3).map(row => row[0]!.text)).toEqual(['abc', 'def', 'gh'])
  expect(wrapCells(cells, 0)).toEqual([])
})
