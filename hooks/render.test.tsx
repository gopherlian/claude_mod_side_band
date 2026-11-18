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

/** What the band last asked `$.ui.open` for. */
let opened: Record<string, unknown> = {}

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
  on('ui.open', (_, e) => {
    opened = e as unknown as Record<string, unknown>

    return { value: { isPlaced: true } }
  })
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
  const tree = await draw($, on, 30)

  // 30 body columns, less the padding on both sides, is 26 for the frame.
  expect(holderOf(tree, /^┏━{24}┓$/)).toBeDefined()
  expect(holderOf(tree, /^☁  · ↑24° ↓15° · rain 0%$/)?.props?.justifyContent).toBe('center')
  expect(holderOf(tree, /^UV 3$/)?.props?.justifyContent).toBe('center')
  // Every other line stays where it was.
  expect(holderOf(tree, /Overcast/)).toBeDefined()
  expect(holderOf(tree, /Overcast/)?.props?.justifyContent).toBeUndefined()
  expect(holderOf(tree, /^tools 0$/)?.props?.justifyContent).toBeUndefined()
})

test('in a wide band the outlook stays on one row, centered under the frame', async ($, on) => {
  const tree = await draw($, on, 80)
  const holder = holderOf(tree, /^☁  · ↑24° ↓15° · rain 0% · UV 3$/)

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

test('a docked band stacks its groups in one column', async ($, on) => {
  const tree = await draw($, on, 104, { scroll: { offset: 0, bodyRows: 60 } })

  expect(holderOf(tree, /━━ Claude/)?.props?.flexDirection).toBe('column')
  expect(holderOf(tree, /━━ Claude/)).toBe(holderOf(tree, /┏━/))
})

test('where the pane is not docked the groups stand side by side, on the same rows', async ($, on) => {
  const tree = await draw($, on, 104, { placement: 'inline', scroll: { offset: 0, bodyRows: 8 } })

  expect(holderOf(tree, /━━ Claude/)?.props?.flexDirection).toBe('row')
  expect(holderOf(tree, /━━ Claude/)).toBe(holderOf(tree, /┏━/))
})

test('a widget is drawn as the strip too', async ($, on) => {
  const tree = await draw($, on, 104, { placement: 'widget', scroll: { offset: 0, bodyRows: 8 } })

  expect(holderOf(tree, /━━ Claude/)).toBe(holderOf(tree, /┏━/))
})

test('a strip too narrow for two columns draws the time alone', async ($, on) => {
  const tree = await draw($, on, 40, { placement: 'inline', scroll: { offset: 0, bodyRows: 5 } })

  expect(holderOf(tree, /Claude/)).toBeUndefined()
  expect(holderOf(tree, /┏━/)).toBeDefined()
})

test('the strip is as tall as the rows the pane has and no taller', async ($, on) => {
  const tree = await draw($, on, 104, { placement: 'inline', scroll: { offset: 0, bodyRows: 6 } })
  const rows = (tree.children ?? []).filter(child => typeof child !== 'string')

  expect(rows.length).toBeLessThanOrEqual(6)
})

test('a band opened by the command asks for the strip rows and a twelfth of the width', async ($, on) => {
  await draw($, on, 40)
  await $.command.run({
    command: 'band',
    args: 'open',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 212 },
  })

  expect(opened.rows).toBe(8)
  expect(opened.columns).toBe(28 + 4)
})

const NOW = Date.parse('2026-11-16T10:00:00Z')

/** What another band left in the shared file, taken `age` milliseconds ago. */
const sharedBy = (age: number, weatherAge = 1000) =>
  JSON.stringify({
    v: 1,
    at: NOW - age,
    hardware: { cpu: { total: 77, cores: [] }, gpus: [], npus: [] },
    system: { ramPercent: 42, swapPercent: 0, diskPercent: 9, downBps: 1000, upBps: 500, netPeakBps: 2_000_000, dockers: [] },
    slowAt: NOW - age,
    weather: { status: 'ready', place: 'Valencia', temperature: 31, summary: 'Clear' },
    weatherAt: NOW - weatherAge,
  })

/** Draws the band with `shared` in the file the bands trade, and says what it wrote back. */
const drawShared = async ($: Parameters<typeof draw>[0], on: Parameters<typeof draw>[1], shared: string) => {
  const writes: string[] = []
  on('env.get', () => ({ value: '/home/test' }))
  on('fs.read', (_, e) => ({ value: String((e as { path?: string }).path).endsWith('state.json') ? shared : '[]' }))
  on('fs.write', (_, e) => {
    writes.push(String((e as { text?: string }).text ?? ''))

    return { value: undefined }
  })
  const tree = await draw($, on, 40, { scroll: { offset: 0, bodyRows: 200 } })

  return { text: textsOf(tree).join('\n'), writes }
}

test('a band whose turn comes while the shared reading is fresh shows it instead of reading the machine', async ($, on) => {
  const { text } = await drawShared($, on, sharedBy(2000))

  expect(text).toMatch(/CPU[^%]*77%/)
  expect(text).toMatch(/RAM[^%]*42%/)
  expect(text).toMatch(/Disk[^%]*9%/)
})

test('the weather another band fetched is shown, and not fetched again while it is fresh', async ($, on) => {
  const { text } = await drawShared($, on, sharedBy(2000))

  expect(text).toContain('31°C')
})

test('a fresh shared reading is not written over: the band that adopts it leaves the file alone', async ($, on) => {
  const { writes } = await drawShared($, on, sharedBy(2000))

  expect(writes.filter(w => w.includes('"hardware"'))).toEqual([])
})

test('a stale shared reading is not shown: the band reads for itself', async ($, on) => {
  const { text, writes } = await drawShared($, on, sharedBy(60_000, 60 * 60_000))

  expect(text).not.toMatch(/CPU[^%]*77%/)
  expect(text).not.toMatch(/RAM[^%]*42%/)
  // What it read, it shares: the file carries its reading and the weather it fetched.
  const state = JSON.parse(writes.filter(w => w.includes('"v":1')).at(-1) ?? '{}')
  expect(state.v).toBe(1)
  expect(state.at).toBe(NOW)
  expect(state.weather.status).toBe('ready')
})

test('a shared file that is not ours is ignored without an error', async ($, on) => {
  const { text } = await drawShared($, on, 'not json at all')

  expect(text).not.toMatch(/RAM[^%]*42%/)
  expect(text).toContain('Claude')
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
    // Only the shared limits matter here; the shared machine state is written too, to its own file.
    if (String((e as { path?: string }).path).endsWith('limits.json')) written = String((e as { text?: string }).text ?? '')

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
