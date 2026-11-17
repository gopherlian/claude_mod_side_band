import { expect, test } from 'claude-code/testing'

import { wrap } from './wrap'

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
