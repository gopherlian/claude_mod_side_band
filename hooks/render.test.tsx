import { expect, test } from 'claude-code/testing'

const WEATHER = JSON.stringify({
  current: { temperature_2m: 23, apparent_temperature: 21, relative_humidity_2m: 43, wind_speed_10m: 5, weather_code: 3 },
  daily: {
    temperature_2m_max: [24],
    temperature_2m_min: [15],
    precipitation_probability_max: [0],
    uv_index_max: [3],
    sunrise: ['2026-11-16T07:46'],
    sunset: ['2026-11-16T17:45'],
  },
})

const PANE = {
  plugin: 'side-band',
  component: 'Pane',
  requestId: 'side-band',
  surface: 'terminal',
  props: {
    title: 'Band',
    isFocused: false,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 60 },
    view: {},
  },
} as const

type Drawn = { type: string; props?: Record<string, unknown>; children?: (Drawn | string)[] }

/** The element that holds the Text with these words: where that line sits. */
const holderOf = (node: Drawn, words: RegExp): Drawn | undefined => {
  for (const child of node.children ?? []) {
    if (typeof child === 'string') continue
    if (child.type === 'Text' && (child.children ?? []).some(c => typeof c === 'string' && words.test(c))) return node
    const found = holderOf(child, words)
    if (found) return found
  }

  return undefined
}

/** Draws the band in a body `bodyColumns` wide, with the weather already in. */
const draw = async (
  $: Parameters<Parameters<typeof test>[1]>[0],
  on: Parameters<Parameters<typeof test>[1]>[1],
  bodyColumns: number,
  paneProps: Record<string, unknown> = {},
) => {
  // Nothing sits beneath the mod: each hook here stands for the engine.
  on('command.register', () => ({ value: { command: 'band' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('http.fetch', () => ({ value: { ok: true, status: 200, text: WEATHER } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('clock.now', () => ({ value: Date.parse('2026-11-16T10:00:00Z') }))
  on('clock.every', () => ({ value: 1 }))
  on('clock.after', () => ({ value: 1 }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '' } }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, props: { ...PANE.props, bodyColumns, ...paneProps } })
  const tree = (await ui.drawn()) as unknown as Drawn
  await ui.unmount()

  return tree
}

test('in a narrow band the two outlook rows are drawn centered', async ($, on) => {
  const tree = await draw($, on, 40)

  // 40 body columns, less the padding on both sides, is 36 for the frame.
  expect(holderOf(tree, /^┏━{34}┓$/)).toBeDefined()
  expect(holderOf(tree, /^☁ ↑24° ↓15° · rain 0%$/)?.props?.justifyContent).toBe('center')
  expect(holderOf(tree, /^UV 3 · 07:46–17:45$/)?.props?.justifyContent).toBe('center')
  // Every other line stays where it was.
  expect(holderOf(tree, /Overcast/)).toBeDefined()
  expect(holderOf(tree, /Overcast/)?.props?.justifyContent).toBeUndefined()
  expect(holderOf(tree, /^tools 0$/)?.props?.justifyContent).toBeUndefined()
})

test('in a wide band the outlook stays on one row, centered under the frame', async ($, on) => {
  const tree = await draw($, on, 80)
  const holder = holderOf(tree, /^☁ ↑24° ↓15° · rain 0% · UV 3 · 07:46–17:45$/)

  expect(holderOf(tree, /^┏━{74}┓$/)).toBeDefined()
  expect(holder).toBeDefined()
  expect(holder?.props?.justifyContent).toBe('center')
})

test('a docked band with room draws every group', async ($, on) => {
  const tree = await draw($, on, 40, { scroll: { offset: 0, bodyRows: 200 } })

  expect(holderOf(tree, /Claude/)).toBeDefined()
})

test('a docked band in a short window keeps every group, to be scrolled', async ($, on) => {
  const tree = await draw($, on, 40, { scroll: { offset: 0, bodyRows: 5 } })

  expect(holderOf(tree, /Claude/)).toBeDefined()
})

test('a band that cannot scroll still drops groups to fit its rows', async ($, on) => {
  const tree = await draw($, on, 40, { placement: 'inline', scroll: { offset: 0, bodyRows: 5 } })

  expect(holderOf(tree, /Claude/)).toBeUndefined()
})

/** Every line of text in the drawn tree. */
const textsOf = (node: Drawn): string[] =>
  (node.children ?? []).flatMap(child =>
    typeof child === 'string' ? [child] : textsOf(child),
  )

test('an idle band shows the higher five-hour figure another band shared', async ($, on) => {
  const NOW = Date.parse('2026-11-16T10:00:00Z')
  const resetsAt = new Date(NOW + 3_600_000).toISOString()
  let written = ''
  on('env.get', () => ({ value: '/home/test' }))
  on('fs.read', () => ({ value: JSON.stringify([{ kind: 'five_hour', percentUsed: 21, resetsAt }]) }))
  on('fs.write', (_, e) => {
    written = String((e as { text?: string }).text ?? '')

    return { value: undefined }
  })
  on('session.usage', () => ({
    value: {
      startedAt: NOW - 60_000,
      context: { tokens: 99_000, window: 1_000_000, percent: 10 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 18, resetsAt }],
    },
  }))

  const tree = await draw($, on, 40)
  const text = textsOf(tree).join('\n')

  expect(text).toMatch(/Session[^%]*21%/)
  expect(text).not.toMatch(/Session[^%]*18%/)
  expect(written).toBe('')
})
