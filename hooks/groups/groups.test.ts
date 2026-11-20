import { expect, test } from 'claude-code/testing'

import { bigText } from '../bigdigits'
import { formatShortTime } from '../widgets/clock'
import { containerLine } from '../sections/docker'
import { creditLines } from '../sections/credit'
import { RESOURCE_ICONS } from '../sections/palette'
import { rule, softRule } from '../sections/usage'
import { harness } from './harness'
import { arrange, groups } from './index'
import { project } from './project'
import { session } from './session'
import { system } from './system'
import { seasonById } from '../season'
import { time } from './time'
import type { GroupContext } from './types'

const NOW = Date.parse('2026-11-16T10:00:00Z')

const ctx = (over: Partial<GroupContext> = {}): GroupContext => ({
  now: NOW,
  columns: 30,
  rows: 50,
  weather: {
    status: 'ready',
    place: 'Valencia',
    temperature: 18,
    summary: 'Clear',
    forecast: { max: 24, min: 15, rainPercent: 30, uv: 6, sunrise: '07:12', sunset: '18:44' },
  },
  stats: { toolCalls: 0, activeTools: 0 },
  system: {},
  ...over,
})

test('the time, temperature and place sit inside a frame; the outlook and timer stay outside', () => {
  const texts = time.lines(ctx({ columns: 50, timerEndsAt: NOW + 62_000 })).map(l => l.text)
  const top = texts.findIndex(t => t.startsWith('┏'))
  const bottom = texts.findIndex(t => t.startsWith('┗'))
  const inside = texts.slice(top + 1, bottom).join('\n')

  expect(top).toBe(0)
  expect(bottom).toBeGreaterThan(top + 1)
  for (const line of texts.slice(top, bottom + 1)) expect(line.length).toBe(50)
  expect(texts[top]).toBe('┏' + '━'.repeat(48) + '┓')
  expect(texts[bottom]).toBe('┗' + '━'.repeat(48) + '┛')
  expect(inside).toContain('18°C')
  expect(inside).toContain('Valencia')
  expect(inside).toMatch(/\d\d:\d\d|[█▀▄]/)

  const after = texts.slice(bottom + 1)
  expect(after.some(t => t.includes('rain 30%'))).toBe(true)
  expect(after).toContain('⧗ Timer 1:02')
  expect(inside).not.toContain('rain')
  expect(inside).not.toContain('Timer')
})

test('in the frame the time is centered and the weather text goes below it', () => {
  const texts = time.lines(ctx({ columns: 50, rows: 100 })).map(l => l.text)
  const big = bigText(formatShortTime(NOW), 3)
  const pad = ' '.repeat(Math.floor((46 - big[0].length) / 2))
  const bottom = texts.findIndex(t => t.startsWith('┗'))

  expect(texts.slice(1, 4)).toEqual(big.map(row => '┃ ' + (pad + row).padEnd(46) + ' ┃'))
  expect(texts.slice(4, bottom).join('\n')).toContain('18°C')
  expect(texts.slice(1, 4).join('\n')).not.toContain('18°C')
  for (const line of texts.slice(0, bottom + 1)) expect(line.length).toBe(50)
})

test('the time group shows the outlook and a running timer', () => {
  const texts = time.lines(ctx({ timerEndsAt: NOW + 62_000 })).map(l => l.text)
  expect(texts).toContain('↑24° ↓15° · rain 30% · UV 6')
  expect(texts.join('\n')).not.toMatch(/07:12|18:44/)
  expect(texts).toContain('⧗ Timer 1:02')
  expect(time.lines(ctx({ timerEndsAt: NOW - 1 })).some(l => l.text === '⧗ Timer done')).toBe(true)
})

test('the timer row is centred and led by an hourglass that is not an emoji', () => {
  const running = time.lines(ctx({ timerEndsAt: NOW + 62_000 })).at(-1)!
  const done = time.lines(ctx({ timerEndsAt: NOW - 1 })).at(-1)!

  expect(running).toEqual({ text: '⧗ Timer 1:02', align: 'center' })
  expect(done).toEqual({ text: '⧗ Timer done', color: 'green', align: 'center' })
  expect(/\p{Extended_Pictographic}/u.test('⧗')).toBe(false)
})

const withIcon = (over: Partial<GroupContext> = {}) =>
  ctx({ ...over, weather: { ...ctx().weather, icon: '☂' } })

test('the weather icon leads the rain row, set apart by two spaces and a dot', () => {
  const joined = '↑24° ↓15° · rain 30% · UV 6'
  const rows = (columns: number) => time.lines(withIcon({ columns })).map(l => l.text)

  expect(rows(60)).toContain('☂  · ' + joined)
  expect(rows(joined.length + 5)).toContain('☂  · ' + joined)

  const narrow = rows(joined.length + 4)
  expect(narrow).not.toContain('☂  · ' + joined)
  expect(narrow).toContain('☂  · ↑24° ↓15° · rain 30%')
  expect(narrow).toContain('UV 6')
})

test('without an icon the outlook is exactly as before', () => {
  const texts = time.lines(ctx({ columns: 60 })).map(l => l.text)
  expect(texts.some(t => t.includes('☀') || t.includes('☂'))).toBe(false)
  expect(texts).toContain('↑24° ↓15° · rain 30% · UV 6')
})

test('the outlook shares one row when it fits and keeps two when it does not, with no sunrise or sunset', () => {
  const joined = '↑24° ↓15° · rain 30% · UV 6'
  const rows = (columns: number) => time.lines(ctx({ columns })).map(l => l.text)

  expect(rows(60)).toContain(joined)
  expect(rows(60)).not.toContain('UV 6')
  expect(rows(60).join('\n')).not.toMatch(/07:12|18:44/)
  expect(rows(joined.length)).toContain(joined)

  const narrow = rows(joined.length - 1)
  expect(narrow).not.toContain(joined)
  expect(narrow).toContain('↑24° ↓15° · rain 30%')
  expect(narrow).toContain('UV 6')
})

test('the outlook is always centered, on one row or split in two', () => {
  const joined = '↑24° ↓15° · rain 30% · UV 6'
  const outlook = (columns: number) => time.lines(ctx({ columns })).filter(l => /rain|UV/.test(l.text))

  const wide = outlook(60)
  expect(wide.length).toBe(1)
  expect(wide[0].align).toBe('center')

  const narrow = outlook(joined.length - 1)
  expect(narrow.map(l => l.text)).toEqual(['↑24° ↓15° · rain 30%', 'UV 6'])
  expect(narrow.map(l => l.align)).toEqual(['center', 'center'])
  expect(narrow.every(l => l.dimColor === true)).toBe(true)

  const onlyUv = time.lines(
    ctx({ weather: { status: 'ready', place: 'Valencia', temperature: 18, summary: 'Clear', forecast: { uv: 6 } } }),
  )
  expect(onlyUv.find(l => l.text === 'UV 6')?.align).toBe('center')
})

const busy = (over: Partial<GroupContext> = {}) =>
  ctx({
    usage: {
      contextWindow: 200_000,
      contextTokens: 50_000,
      contextPercent: 25,
      costUsd: 3,
      startedAt: NOW - 3_600_000,
      limits: [{ kind: 'five_hour', percentUsed: 10, resetsAt: new Date(NOW + 2 * 3_600_000).toISOString() }],
    },
    stats: {
      toolCalls: 7,
      activeTools: 1,
      runningTool: 'Bash',
      turnStartedAt: NOW - 42_000,
      toolTimes: [NOW - 30_000, NOW - 20_000, NOW - 5 * 60_000],
      toolCounts: { Bash: 4, Read: 2, mcp__engram__mem_save: 1 },
      model: 'claude-sonnet-5-5',
      effort: 'medium',
      categories: [
        { name: 'Messages', tokens: 30_000, kind: 'used' },
        { name: 'System tools', tokens: 12_000, kind: 'used' },
        { name: 'Autocompact buffer', tokens: 33_000, kind: 'buffer' },
        { name: 'Free space', tokens: 125_000, kind: 'free' },
      ],
    },
    columns: 30,
    ...over,
  })

test('the session group draws the cost, the tools chart, the turn and the model, and no reset rows', () => {
  const lines = session.lines(busy()).map(l => l.text)

  expect(lines.some(l => l.startsWith('↻'))).toBe(false)
  expect(lines.find(l => l.startsWith('Session'))).toMatch(/2h$/)
  expect(lines.find(l => l.startsWith('Session'))).toContain('┃')
  expect(lines.some(l => l.startsWith('┃ time elapsed'))).toBe(false)
  expect(lines).toContain('Cost $3.00  $3.00/h')
  expect(lines).toContain('Time 1h00m')
  expect(lines).toContain('tools 7 calls ▸ Bash')
  // Under the header a braille chart across the whole band, three rows tall; then one thin-barred row per tool.
  const head = lines.findIndex(l => l.startsWith('tools'))
  // A blank row before the chart and another after it.
  expect(lines[head + 1]).toBe(' ')
  for (const row of lines.slice(head + 2, head + 5)) expect(row).toMatch(/^[\u2800-\u28ff]{30}$/)
  expect(lines[head + 5]).toBe(' ')
  const list = lines.slice(head + 6, -3)
  expect(list.slice(0, 3)).toEqual([
    expect.stringMatching(/^▸ Bash {5}━+╸?─* 4$/),
    expect.stringMatching(/^ {2}Read {5}━+╸?─* 2$/),
    expect.stringMatching(/^ {2}mem_save ━+╸?─* 1$/),
  ])
  expect(lines).toContain('turn 0:42')
  expect(lines).toContain('Sonnet 5.5 ●●○○○ medium')
  expect(lines[lines.length - 2]).toBe('─'.repeat(30))
  expect(lines.every(l => l.length <= 30)).toBe(true)
})

test('what fills the context is drawn under the bar, never listing the free space or the reserve as a consumer', () => {
  const lines = session.lines(busy()).map(l => l.text)

  expect(lines.slice(2, 4)).toEqual(['▒ buffer 33k  ■ msgs 30k', '■ sys 12k'])
  expect(lines.join('\n')).not.toMatch(/free|autocompact/i)
})

test('the cost is green and the effort pips are lit up to its level', () => {
  const rows = session.lines(busy())
  const cost = rows.find(l => l.text.startsWith('Cost'))!
  const model = rows.find(l => l.text.startsWith('Sonnet'))!

  expect(cost.cells!.find(c => c.text === '$3.00')!.color).toBeDefined()
  expect(cost.cells!.map(c => c.text).join('')).toBe(cost.text)
  expect(model.cells!.map(c => c.text).join('')).toBe(model.text)
  expect(model.cells!.some(c => c.text === '●●')).toBe(true)
})

test('the last turn is shown once it ends, and a quiet session has an empty chart', () => {
  const rows = session
    .lines(busy({ stats: { toolCalls: 0, activeTools: 0, lastTurnMs: 74_000 } }))
    .map(l => l.text)

  expect(rows).toContain('last 1:14')
  expect(rows).toContain('tools 0 calls · last 10 min')
  // With no call in the last ten minutes there is no chart, and no blank rows for it.
  expect(rows.some(row => /^[\u2800-\u28ff]+$/.test(row))).toBe(false)
  expect(rows[rows.indexOf('tools 0 calls · last 10 min') + 1]).toBe('──────────────────────────────')
  expect(rows.some(l => l.startsWith('turn'))).toBe(false)
})

test('the cost per hour comes after three minutes of session', () => {
  const young = session.lines(busy({ usage: { ...busy().usage!, startedAt: NOW - 60_000 } })).map(l => l.text)

  expect(young).toContain('Cost $3.00')
  expect(young).toContain('Time 1m')
})

const paced = (over: Partial<GroupContext> = {}) =>
  ctx({
    usage: {
      contextWindow: 200_000,
      contextTokens: 10_000,
      contextPercent: 5,
      limits: [{ kind: 'five_hour', percentUsed: 41, resetsAt: new Date(NOW + 4_140_000).toISOString() }],
    },
    ...over,
  })

test('the stacked band has no footnote: no sentence about the tick and no faint rule at its foot', () => {
  const texts = arrange(paced(), 500).map(l => l.text)

  expect(texts.some(t => t.includes('pace'))).toBe(false)
  expect(texts.some(t => t.includes('time elapsed') || t.includes('(*)'))).toBe(false)
  expect(texts.at(-1)).not.toBe(softRule(30).text)
  expect(texts.at(-1)).not.toBe(rule(30).text)
})

test('the project group is hidden outside a repository', () => {
  expect(project.lines(ctx())).toEqual([])
  const lines = project.lines(ctx({ git: { branch: 'TASK-12', changed: 3, ahead: 1, behind: 0 } })).map(l => l.text)
  expect(lines).toEqual(['TASK-12', '3 changed · ↑1'])
})

test('the system group adds memory, disk, network and docker to the bars', () => {
  const texts = system
    .lines(ctx({ system: { ramPercent: 50, diskPercent: 30, downBps: 524288, upBps: 2048, netPeakBps: 1048576, dockers: [{ name: 'api', networks: ['n'] }, { name: 'db', networks: ['n'] }] } }))
    .map(l => l.text)
  expect(texts.some(t => t.startsWith('≡ RAM   ') && t.includes('50%'))).toBe(true)
  expect(texts.some(t => t.startsWith('◉ Disk  ') && t.includes('30%'))).toBe(true)
  // The arrows say which way: what comes in and what goes out.
  const down = texts.find(t => t.startsWith('↓ Down  '))!
  expect(down).toMatch(/^↓ Down  [█▏▎▍▌▋▊▉─]{14}  512K\/s$/)
  expect(texts.some(t => t.startsWith('↑ Up    ') && t.endsWith('   2K/s'))).toBe(true)
  expect(texts.some(t => /Download|Upload/.test(t))).toBe(false)
  expect(texts[texts.indexOf(down) - 1]).toBe('─'.repeat(30))
  expect(texts).toContain('docker · 2 running')
  expect(texts).toContain(containerLine('api', 30).text)
  expect(texts).toContain(containerLine('db', 30).text)
  expect(texts.some(t => t.startsWith('●'))).toBe(false)
  // One network: the only inner separators are the two before the network and docker blocks.
  expect(texts.filter(t => /^─+$/.test(t)).length).toBe(2)
  expect(texts[texts.indexOf('docker · 2 running') - 1]).toBe('─'.repeat(30))
  expect(texts.some(t => t.includes('Swap'))).toBe(false)
})

test('when rows run short the highest priority number is dropped first, whole', () => {
  const full = ctx({
    git: { branch: 'US-1', changed: 0, ahead: 0, behind: 0 },
    system: { ramPercent: 10 },
    usage: { contextWindow: 200_000, limits: [] },
  })
  const ids = (rows: number) => {
    const lines = arrange(full, rows)
    return groups.filter(g => g.lines(full).length > 0 && g.lines(full).every(l => lines.some(x => x.text === l.text))).map(g => g.id)
  }
  expect(ids(200)).toEqual(['time', 'session', 'project', 'system'])
  // Each boundary between groups takes two rows: a blank one and the rule that names the group.
  const base = time.lines(full).length + session.lines(full).length + project.lines(full).length
  const noSystem = arrange(full, base + 4)
  expect(noSystem.some(l => l.text.includes('RAM'))).toBe(false)
  expect(noSystem.some(l => l.text === 'US-1')).toBe(true)
  const noProject = arrange(full, base + 3)
  expect(noProject.some(l => l.text === 'US-1')).toBe(false)
  expect(noProject.some(l => l.text.startsWith('━━ Claude'))).toBe(true)
  const onlyTime = arrange(full, 1)
  expect(onlyTime.length).toBe(time.lines(full).length)
})

test('every group but the time one is named, on the line that separates it from the one above', () => {
  const full = ctx({
    git: { branch: 'US-1', changed: 0, ahead: 0, behind: 0 },
    system: { ramPercent: 10 },
    usage: { contextWindow: 200_000, limits: [] },
  })
  const lines = arrange(full, 200)
  const texts = lines.map(l => l.text)

  expect(groups.map(g => g.label)).toEqual([undefined, 'Claude', 'GentleAI', 'Project', 'System'])
  expect(texts[0].startsWith('┏')).toBe(true)
  expect(texts.filter(t => t.startsWith('━━ ')).map(t => t.replace(/ ━+$/, ''))).toEqual([
    '━━ Claude',
    '━━ Project',
    '━━ System',
  ])
  expect(texts.every(t => t.length <= 30)).toBe(true)
  expect(lines.filter(l => l.text.startsWith('━━ ')).every(l => l.color === '#a05800')).toBe(true)
  // Each boundary is a blank row and then the rule that names the section.
  const own = groups.reduce((sum, g) => sum + g.lines(full).length, 0)
  expect(lines.length).toBe(own + 6)
})

test('every separator inside a group is the faint one, so none is mistaken for a group boundary', () => {
  const rich = ctx({
    git: { branch: 'US-1', changed: 0, ahead: 0, behind: 0 },
    usage: { contextWindow: 200_000, limits: [] },
    stats: { toolCalls: 0, activeTools: 0, model: 'Sonnet' },
    system: {
      ramPercent: 10,
      downBps: 1,
      upBps: 1,
      dockers: [
        { name: 'a', networks: ['x'] },
        { name: 'b', networks: ['y'] },
      ],
    },
  })
  const texts = arrange(rich, 200).map(l => l.text)

  // Claude after the bars and before the model, System before the network and docker blocks, docker between networks.
  expect(texts.filter(t => /^─+$/.test(t)).length).toBe(5)
  expect(texts.filter(t => t.startsWith('━━ ')).length).toBe(3)
  expect(texts.filter(t => /^━+$/.test(t))).toEqual([])
  expect(texts.some(t => t.startsWith('┄'))).toBe(false)
})

test('a blank row sits right before the rule that names a group, and nowhere else but around the tools chart', () => {
  const full = ctx({
    git: { branch: 'US-1', changed: 0, ahead: 0, behind: 0 },
    system: { ramPercent: 10 },
    usage: { contextWindow: 200_000, limits: [] },
  })
  const texts = arrange(full, 200).map(l => l.text)
  const braille = (t: string | undefined) => /^[\u2800-\u28ff]+$/.test(t ?? '')
  const blanks = texts.flatMap((t, i) => (t.trim() === '' && !braille(texts[i - 1]) && !braille(texts[i + 1]) ? [i] : []))
  const rules = texts.flatMap((t, i) => (t.startsWith('━━ ') ? [i] : []))

  expect(rules.length).toBe(3)
  expect(blanks).toEqual(rules.map(i => i - 1))
})

test('a group dropped for lack of rows takes its name with it', () => {
  const full = ctx({
    git: { branch: 'US-1', changed: 0, ahead: 0, behind: 0 },
    system: { ramPercent: 10 },
    usage: { contextWindow: 200_000, limits: [] },
  })
  const rows = time.lines(full).length + session.lines(full).length + project.lines(full).length + 4
  const texts = arrange(full, rows).map(l => l.text)

  expect(texts.some(t => t.startsWith('━━ System'))).toBe(false)
  expect(texts.some(t => t.startsWith('━━ Project'))).toBe(true)
})

test('docker lists at most five names and counts the rest; none running is said', () => {
  const many = system
    .lines(ctx({ system: { dockers: ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(name => ({ name, networks: ['n'] })) } }))
    .map(l => l.text)
  expect(many.filter(t => t.startsWith('▀')).length).toBe(5)
  expect(many).toContain('+2 more')
  expect(many[0]).toBe('docker · 7 running')

  expect(system.lines(ctx({ system: { dockers: [] } })).map(l => l.text)).toContain('docker · none running')
  expect(system.lines(ctx()).some(l => l.text.startsWith('docker'))).toBe(false)
})

test('the credit goes last, right under an untitled orange rule with no blank row around it, whole, only where rows are left over', () => {
  const c = paced()
  const credit = creditLines(30)
  const plain = arrange(c, 500)
  const full = arrange(c, 500, groups, credit)

  expect(credit.length).toBe(1)
  expect(full.slice(plain.length)).toEqual([rule(30), ...credit])
  expect(rule(30).text).toBe('━'.repeat(30))
  expect(full.slice(0, plain.length)).toEqual(plain)
  expect(arrange(c, full.length, groups, credit)).toEqual(full)
  expect(arrange(c, full.length - 1, groups, credit)).toEqual(arrange(c, full.length - 1))
})

test('the credit never costs a widget a row', () => {
  const c = paced({ columns: 40 })
  const credit = creditLines(40)

  for (let available = 5; available <= 90; available++) {
    const plain = arrange(c, available)
    const credited = arrange(c, available, groups, credit)

    if (credited.length === plain.length) {
      expect(credited).toEqual(plain)
      continue
    }
    expect(credited.slice(0, plain.length)).toEqual(plain)
    expect(credited.slice(plain.length)).toEqual([rule(40), ...credit])
  }
})

test('with no credit given, arrange draws what it drew before', () => {
  const c = paced()

  expect(arrange(c, 500, groups, [])).toEqual(arrange(c, 500))
})

test('the blank row above the Claude rule carries the version, right-aligned; the other blank rows stay empty', () => {
  const full = ctx({
    git: { branch: 'US-1', changed: 0, ahead: 0, behind: 0 },
    system: { ramPercent: 10 },
    usage: { contextWindow: 200_000, limits: [] },
    update: { status: 'current', version: '1.2.3' },
  })
  const lines = arrange(full, 200)
  const claude = lines.findIndex(l => l.text.startsWith('━━ Claude'))

  expect(lines[claude - 1]).toEqual({ text: ' '.repeat(24) + 'v1.2.3', dimColor: true })
  const others = lines.filter((l, i) => i !== claude - 1 && l.text.trim() === '')
  expect(others).toEqual([{ text: ' ' }, { text: ' ' }])
  // Without a reading of the version the row is blank, as before.
  const bare = arrange({ ...full, update: undefined }, 200)
  expect(bare[claude - 1]).toEqual({ text: ' ' })
})

test('every resource of the system group has its icon before its name, and every bar starts in the same column', () => {
  const texts = system
    .lines(
      ctx({
        hardware: {
          cpu: { total: 20, cores: [] },
          gpus: [{ name: 'g', util: 50, memUsedMb: 1, memTotalMb: 2 }],
          npus: [{ name: 'n', util: 5 }],
        },
        system: { ramPercent: 50, swapPercent: 10, diskPercent: 30, downBps: 1, upBps: 1, netPeakBps: 1048576 },
      }),
    )
    .map(l => l.text)
    .filter(t => !/^─+$/.test(t))

  expect(texts.map(t => t.slice(0, 8))).toEqual([
    '▦ CPU   ',
    '▣ GPU   ',
    '▤ VRAM  ',
    '◈ NPU   ',
    '≡ RAM   ',
    '⇄ Swap  ',
    '◉ Disk  ',
    '↓ Down  ',
    '↑ Up    ',
  ])
  // The bar starts in the same column on every row, the network ones too.
  expect(texts.map(t => t.search(/[█▏▎▍▌▋▊▉─]/))).toEqual(texts.map(() => 8))
  expect(texts.every(t => t.length === 30)).toBe(true)
})

test('a numbered name keeps a space before its bar', () => {
  const texts = system
    .lines(ctx({ hardware: { gpus: [{ name: 'a', util: 1, memUsedMb: 1, memTotalMb: 2 }, { name: 'b', util: 2 }], npus: [] } }))
    .map(l => l.text)

  expect(texts[1]!.slice(0, 8)).toBe('▤ VRAM0 ')
})

test('no system icon is an emoji: a terminal may draw one two cells wide, over the name', () => {
  const icons = Object.values(RESOURCE_ICONS)

  expect(icons.filter(icon => /\p{Extended_Pictographic}/u.test(icon))).toEqual([])
  expect(icons.every(icon => [...icon].length === 1)).toBe(true)
})

const wordsOf = (rows: { text: string }[]) => rows.map(l => l.text).join(' ')

test('a narrow band keeps every weather item: what does not fit on a row goes on the next', () => {
  const full = ctx({
    columns: 24,
    rows: 40,
    weather: {
      status: 'ready',
      place: 'Valencia',
      temperature: 18,
      summary: 'Partly cloudy',
      feelsLike: 17,
      humidity: 56,
      wind: 20,
      forecast: { max: 24, min: 15, rainPercent: 30, uv: 6 },
    },
  })
  const text = wordsOf(time.lines(full))

  for (const item of ['18°C', 'Partly cloudy', 'Valencia', 'feels 17°', '56%', '20 km/h', 'Mon 16 Nov']) {
    expect(text).toContain(item)
  }
  for (const line of time.lines(full)) expect(line.text.length).toBeLessThanOrEqual(24)
})

test('the outlook is never cut: on a band narrower than its parts they take a row each', () => {
  const text = wordsOf(time.lines(ctx({ columns: 12 })).filter(l => !/[┏┃┗]/.test(l.text)))

  for (const item of ['↑24° ↓15°', 'rain 30%', 'UV 6']) expect(text).toContain(item)
})

test('the cost row goes on a second row where it does not fit, whole and not cut', () => {
  const rows = session.lines(busy({ columns: 12 })).map(l => l.text)
  const joined = rows.join('\n')

  expect(joined).toContain('$3.00')
  expect(joined).toContain('$3.00/h')
  for (const row of rows) expect(row.length).toBeLessThanOrEqual(12)
})

test('the tools, turn and model rows lose nothing on a narrow band', () => {
  const joined = session.lines(busy({ columns: 12 })).map(l => l.text).join('\n')

  expect(joined).toContain('tools')
  expect(joined).toContain('turn 0:42')
  expect(joined).toContain('Sonnet 5.5')
})

test('a long branch name and its state wrap onto further rows instead of being cut', () => {
  const git = { branch: 'feature/a-very-long-branch-name', changed: 3, ahead: 1, behind: 0 }
  const rows = project.lines(ctx({ columns: 12, git })).map(l => l.text)

  expect(rows.join('')).toContain('feature/a-very-long-branch-name'.replace(/ /g, ''))
  expect(rows.join(' ')).toContain('3 changed')
  expect(rows.join(' ')).toContain('↑1')
  for (const row of rows) expect(row.length).toBeLessThanOrEqual(12)
})

test('on a day of a season the border of the frame is decorated; on any other day it is as it was', () => {
  const plain = time.lines(ctx({ columns: 40 }))
  const dressed = time.lines(ctx({ columns: 40, season: 'navidad' }))

  expect(plain[0]!.text).toBe('┏' + '━'.repeat(38) + '┓')
  expect(dressed[0]!.text).not.toBe(plain[0]!.text)
  expect(dressed[0]!.text.length).toBe(40)
  // Only blank cells take the motif: with it taken out, the rows are as they were.
  const motif = new RegExp(`[${seasonById('navidad').motif!.join('')}]`, 'gu')
  const framed = (rows: { text: string }[]) => rows.slice(1, rows.findIndex(l => l.text.startsWith('┗')) + 1).map(l => l.text)
  expect(framed(dressed).map(t => t.replace(motif, ' '))).toEqual(framed(plain))
  // The real date picks the season when none is forced.
  const winter = time.lines(ctx({ columns: 40, now: new Date(2026, 11, 24, 12).getTime() }))
  expect(winter[0]!.text).not.toBe(plain[0]!.text)
})

test('a day of a season leaves a blank row between the frame and the outlook; 9 October has its greeting there instead', () => {
  const lines = (id?: string, budget?: number, over: Partial<GroupContext> = {}) =>
    time.lines(ctx({ columns: 40, season: id as never, budget, ...over }))
  const below = (rows: { text: string }[]) => rows.slice(rows.findIndex(l => l.text.startsWith('┗')) + 1).map(l => l.text)

  for (const id of ['valentine', 'summer', 'halloween', 'nochebuena', 'navidad', 'reyes']) {
    const dressed = lines(id)
    expect(dressed.length).toBe(lines().length + 1)
    expect(below(dressed)[0]).toBe(' ')
    expect(below(dressed)[1]).toContain('rain 30%')
  }

  const donis = lines('donis')
  expect(donis.length).toBe(lines().length + 1)
  const greeting = donis.find(l => l.text === '♥ San Donís')!
  expect(greeting.align).toBe('center')
  expect(below(donis)[0]).toBe('♥ San Donís')
  expect(below(donis)[1]).toContain('rain 30%')
  expect(below(donis).filter(t => t === ' ')).toHaveLength(0)

  // Without an outlook there is nothing to set apart; with no season the rows are as they were.
  const noOutlook = { weather: { status: 'ready', place: 'Valencia', temperature: 18, summary: 'Clear' } } as Partial<GroupContext>
  expect(lines('navidad', undefined, noOutlook).length).toBe(lines(undefined, undefined, noOutlook).length)
  expect(below(lines())[0]).toContain('rain 30%')
  // The strip counts its rows: there neither the blank row nor the greeting is drawn.
  for (const id of ['navidad', 'donis']) expect(lines(id, 8).length).toBe(lines(undefined, 8).length)
})

test('a faint rule sets the cost, the tools and the turn apart inside the Claude group', () => {
  const rows = session.lines(busy()).map(l => l.text)
  const rule = '─'.repeat(30)
  const at = (prefix: string) => rows.findIndex(l => l.startsWith(prefix))

  expect(rows[at('tools') - 1]).toBe(rule)
  expect(rows[at('turn') - 1]).toBe(rule)
  expect(rows[at('Cost') - 1]).toBe(rule)
  // Cost and time stay together, in one block.
  expect(rows[at('Cost') + 1]).toBe('Time 1h00m')
  // No rule when a block is missing: a quiet session with no turn has none at its foot.
  const quiet = session.lines(busy({ stats: { toolCalls: 0, activeTools: 0 } })).map(l => l.text)
  expect(quiet[quiet.length - 1]).not.toBe(rule)
})

const harnessCtx = (over: Partial<GroupContext['harness'] & object> = {}): GroupContext =>
  ctx({
    columns: 34,
    harness: {
      running: [{ type: 'sdd-apply', description: 'apply task 3: strip layout' }],
      step: { flow: 'SDD', name: 'apply', index: 6, of: 8 },
      tasks: { done: 2, total: 5, next: 'T3 strip layout' },
      ...over,
    },
  })

test('the GentleAI group is not drawn where the harness is not installed', () => {
  expect(harness.lines(ctx())).toEqual([])
  expect(harness.strip!.lines(ctx())).toEqual([])
  expect(harness.label).toBe('GentleAI')
})

test('the GentleAI group shows the step as pips, what runs now, and the tasks as a bar', () => {
  const rows = harness.lines(harnessCtx()).map(l => l.text)

  expect(rows[0]).toBe('Step  ●●●●●●○○ 6/8 apply')
  expect(rows[1]).toBe('Now   ▸ apply task 3: strip layout')
  expect(rows[2]).toMatch(/^Tasks ━+╸?─+ 2\/5$/)
  expect(rows.every(row => row.length <= 34)).toBe(true)
})

test('with several agents running the first is named and the rest counted', () => {
  const rows = harness
    .lines(harnessCtx({ running: [{ type: 'a', description: 'one' }, { type: 'b', description: 'two' }, { type: 'c', description: 'three' }] }))
    .map(l => l.text)

  expect(rows[1]).toBe('Now   ▸ one +2')
})

test('with nothing running the next task is shown dim, and with no task either a dash', () => {
  const next = harness.lines(harnessCtx({ running: [] }))[1]!
  expect(next.text).toBe('Now   · T3 strip layout')
  expect(next.cells!.at(-1)!.dimColor).toBe(true)

  expect(harness.lines(harnessCtx({ running: [], tasks: undefined, step: undefined })).map(l => l.text)).toEqual([
    'Step  ○○○○○○○○ -',
    'Now   -',
  ])
})

test('a step outside an ordered workflow is its flow and its name', () => {
  const rows = harness.lines(harnessCtx({ step: { flow: 'judgment day', name: 'judging' } })).map(l => l.text)

  expect(rows[0]).toBe('Step  judgment day · judging')
})

test('in the strip the GentleAI rows are cut to the budget and never pass the width', () => {
  const rows = harness.strip!.lines({ ...harnessCtx(), columns: 28, budget: 2 })

  expect(rows).toHaveLength(2)
  expect(rows.every(row => row.text.length <= 28)).toBe(true)
})

test('what the harness is doing is read whole: it goes over as many rows as it needs, under its own text', () => {
  const task = 'apply task 3: lay the strip out and keep every column inside its width'
  const rows = harness
    .lines({ ...harnessCtx({ running: [{ type: 'sdd-apply', description: task }, { type: 'b', description: 'x' }] }), columns: 28 })
    .map(l => l.text)
  const now = rows.slice(rows.findIndex(row => row.startsWith('Now')), rows.findIndex(row => row.startsWith('Tasks')))

  expect(now.length).toBeGreaterThan(2)
  expect(now[0]!.startsWith('Now   ▸ ')).toBe(true)
  for (const row of now.slice(1)) expect(row.startsWith(' '.repeat(8))).toBe(true)
  expect(now.every(row => row.length <= 28)).toBe(true)
  expect(now.map(row => row.trim()).join(' ').replace(/^Now\s+▸ /, '')).toBe(`${task} +1`)
})

test('the tools chart is not drawn when no call fell in the last ten minutes, but the list of tools stays', () => {
  const old = busy({ stats: { ...busy().stats, toolTimes: [NOW - 11 * 60_000] } })
  const rows = session.lines(old).map(l => l.text)
  const head = rows.findIndex(l => l.startsWith('tools'))

  expect(rows.some(row => /^[\u2800-\u28ff]+$/.test(row))).toBe(false)
  expect(rows[head + 1]).toMatch(/^▸ Bash /)
  expect(session.strip!.lines({ ...old, budget: 20 }).some(line => /^[\u2800-\u28ff]+$/.test(line.text))).toBe(false)
})
