import { expect, test } from 'claude-code/testing'

import { FRAME_COLOR, FRAME_COLUMNS, frame, frameLines } from './frame'

test('rows go inside a heavy frame as wide as the band, each with a space of padding', () => {
  expect(frame(['ab', 'c'], 10)).toEqual([
    '┏━━━━━━━━┓',
    '┃ ab     ┃',
    '┃ c      ┃',
    '┗━━━━━━━━┛',
  ])
})

test('every row is padded so the right edge lines up', () => {
  const lines = frame(['x', 'a longer row'], 20)

  expect(lines.length).toBe(4)
  for (const line of lines) expect(line.length).toBe(20)
})

test('the frame takes four columns off what is inside, for the edges and the padding', () => {
  expect(FRAME_COLUMNS).toBe(4)
  expect(frame(['12345678'], 12)[1]).toBe('┃ 12345678 ┃')
})

test('nothing to frame draws nothing', () => {
  expect(frame([], 20)).toEqual([])
})

test('a row too long for the frame is cut, not left to push the edge out', () => {
  const lines = frame(['x'.repeat(30)], 12)

  expect(lines[1]).toBe('┃ ' + 'x'.repeat(8) + ' ┃')
})

test('the frame lines are orange on the edges and sides, and the inside keeps its own colour', () => {
  const lines = frameLines(['ab'], 10)

  expect(lines.map(l => l.text)).toEqual(frame(['ab'], 10))
  expect(lines[0]).toEqual({ text: '┏━━━━━━━━┓', color: FRAME_COLOR })
  expect(lines[2]).toEqual({ text: '┗━━━━━━━━┛', color: FRAME_COLOR })
  expect(lines[1]?.cells).toEqual([
    { text: '┃ ', color: FRAME_COLOR },
    { text: 'ab    ' },
    { text: ' ┃', color: FRAME_COLOR },
  ])
})
