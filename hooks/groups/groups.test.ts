import { expect, test } from 'claude-code/testing'

import { bigText } from '../bigdigits'
import { formatShortTime } from '../widgets/clock'
import { containerLine } from '../sections/docker'
import { rateMeter } from '../sections/monitor'
import { creditLines } from '../sections/credit'
import { formatRate } from '../format'
import { footRule } from '../sections/usage'
import { arrange, groups } from './index'
import { project } from './project'
import { session } from './session'
import { system } from './system'
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
  expect(after).toContain('Timer 1:02')
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
  expect(texts).toContain('↑24° ↓15° · rain 30%')
  expect(texts).toContain('Timer 1:02')
  expect(time.lines(ctx({ timerEndsAt: NOW - 1 })).some(l => l.text === 'Timer done')).toBe(true)
})

const withIcon = (over: Partial<GroupContext> = {}) =>
  ctx({ ...over, weather: { ...ctx().weather, icon: '☂' } })

test('the weather icon leads the rain row and costs one cell plus a space', () => {
  const joined = '↑24° ↓15° · rain 30% · UV 6 · 07:12–18:44'
  const rows = (columns: number) => time.lines(withIcon({ columns })).map(l => l.text)

  expect(rows(60)).toContain('☂ ' + joined)
  expect(rows(joined.length + 2)).toContain('☂ ' + joined)

  const narrow = rows(joined.length + 1)
  expect(narrow).not.toContain('☂ ' + joined)
  expect(narrow).toContain('☂ ↑24° ↓15° · rain 30%')
  expect(narrow.join('\n')).not.toContain('UV 6')
})

test('without an icon the outlook is exactly as before', () => {
  const texts = time.lines(ctx({ columns: 60 })).map(l => l.text)
  expect(texts.some(t => t.includes('☀') || t.includes('☂'))).toBe(false)
  expect(texts).toContain('↑24° ↓15° · rain 30% · UV 6 · 07:12–18:44')
})

test('the outlook shares one row when it fits, and keeps today alone when it does not', () => {
  const joined = '↑24° ↓15° · rain 30% · UV 6 · 07:12–18:44'
  const rows = (columns: number) => time.lines(ctx({ columns })).map(l => l.text)

  expect(rows(60)).toContain(joined)
  expect(rows(60)).not.toContain('UV 6 · 07:12–18:44')
  expect(rows(joined.length)).toContain(joined)

  const narrow = rows(joined.length - 1)
  expect(narrow).not.toContain(joined)
  expect(narrow).toContain('↑24° ↓15° · rain 30%')
  expect(narrow.join('\n')).not.toContain('UV 6')
})

test('the outlook is always one row, centered and dim', () => {
  const joined = '↑24° ↓15° · rain 30% · UV 6 · 07:12–18:44'
  const outlook = (columns: number) => time.lines(ctx({ columns })).filter(l => /rain|UV/.test(l.text))

  const wide = outlook(60)
  expect(wide.length).toBe(1)
  expect(wide[0].align).toBe('center')

  const narrow = outlook(joined.length - 1)
  expect(narrow.map(l => l.text)).toEqual(['↑24° ↓15° · rain 30%'])
  expect(narrow.map(l => l.align)).toEqual(['center'])
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

test('the session group draws the bars, then the cost, the model and the tools chart: no rules, no reset rows', () => {
  const lines = session.lines(busy()).map(l => l.text)

  expect(lines.some(l => l.startsWith('↻'))).toBe(false)
  expect(lines.find(l => l.startsWith('Session'))).toMatch(/2h$/)
  expect(lines.find(l => l.startsWith('Session'))).toContain('┃')
  expect(lines.some(l => l.startsWith('┃ time elapsed'))).toBe(false)
  expect(lines).toContain('1h00m · $3.00 · $3.00/h')
  expect(lines.find(l => l.startsWith('tools'))).toMatch(/^tools [·▂▃▄▅▆▇█]{10} 7 ▸ Bash$/)
  // 30 columns are too few for the turn beside the model; 40 are enough.
  expect(lines).toContain('Sonnet 5.5 ●●○○○ medium')
  expect(session.lines(busy({ columns: 40 })).map(l => l.text)).toContain('Sonnet 5.5 ●●○○○ medium · turn 0:42')
  expect(lines.map(l => l.split(' ')[0])).toEqual(['Context', 'Session', 'Weekly', '1h00m', 'Sonnet', 'tools'])
  expect(lines.some(l => l.startsWith('┈'))).toBe(false)
  expect(lines.every(l => l.length <= 30)).toBe(true)
})

test('what fills the context is drawn in the bar beside its label, with no legend under it', () => {
  const lines = session.lines(busy())

  expect(lines[0]!.text).toMatch(/^Context █+▒+─+ +25%$/)
  expect(lines[0]!.cells!.some(cell => cell.color === '#2b6cb0')).toBe(true)
  expect(lines.some(l => l.text.includes('■'))).toBe(false)
  expect(lines.map(l => l.text).join('\n')).not.toMatch(/free|autocompact|buffer/i)
})

test('the cost is green and the effort pips are lit up to its level', () => {
  const rows = session.lines(busy())
  const cost = rows.find(l => l.text.startsWith('1h00m'))!
  const model = rows.find(l => l.text.startsWith('Sonnet'))!

  expect(cost.cells!.find(c => c.text === '$3.00')!.color).toBeDefined()
  expect(cost.cells!.map(c => c.text).join('')).toBe(cost.text)
  expect(model.cells!.map(c => c.text).join('')).toBe(model.text)
  expect(model.cells!.some(c => c.text === '●●')).toBe(true)
})

test('the last turn is shown once it ends, alone where no model is known, and a quiet session has an empty chart', () => {
  const rows = session
    .lines(busy({ stats: { toolCalls: 0, activeTools: 0, lastTurnMs: 74_000 } }))
    .map(l => l.text)

  expect(rows).toContain('last 1:14')
  expect(rows).toContain('tools ·········· 0')
  expect(rows.some(l => l.startsWith('turn'))).toBe(false)
})

test('the cost per hour comes after three minutes of session', () => {
  const young = session.lines(busy({ usage: { ...busy().usage!, startedAt: NOW - 60_000 } })).map(l => l.text)

  expect(young).toContain('1m · $3.00')
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

test('the session group has a footnote that explains the tick', () => {
  const note = session.footnote!(paced()).map(l => l.text)

  expect(note).toEqual(['fill past ┃ (time) = over pace'])
  expect(session.footnote!(ctx())).toEqual([])
})

const bare = () => groups.map(group => ({ ...group, footnote: undefined }))

test('footnotes go at the foot after a short rule, whole, only where rows are left over', () => {
  const c = paced()
  const note = session.footnote!(c)
  const full = arrange(c, 500)
  const without = arrange(c, 500, bare())

  expect(note.length).toBe(1)
  expect(full.slice(-note.length)).toEqual(note)
  expect(full.slice(-note.length - 1, -note.length)).toEqual([footRule(30)])
  expect(full.length).toBe(without.length + note.length + 1)
  expect(arrange(c, full.length)).toEqual(full)
  expect(arrange(c, full.length - 1)).toEqual(without)
})

test('the stacked band has no legend row of the tick and no (*): only the footnote explains it', () => {
  const texts = arrange(paced(), 500).map(l => l.text)

  expect(texts.some(t => t.startsWith('┃ time elapsed'))).toBe(false)
  expect(texts.some(t => t.includes('(*)'))).toBe(false)
  expect(texts.some(t => t.startsWith('fill past ┃'))).toBe(true)
})

test('a footnote never costs a widget a row: what drops is what dropped without it', () => {
  const c = paced({ columns: 40 })
  const note = session.footnote!(c)

  for (let available = 5; available <= 80; available++) {
    const without = arrange(c, available, bare())
    const withNote = arrange(c, available)

    if (withNote.length === without.length) {
      expect(withNote).toEqual(without)
      continue
    }
    expect(withNote.length).toBe(without.length + note.length + 1)
    expect(withNote.slice(0, without.length)).toEqual(without)
    expect(withNote.slice(without.length)).toEqual([footRule(40), ...note])
  }
})

test('a group that was dropped leaves its footnote out too', () => {
  const kept = { id: 'kept', priority: 1, lines: () => [{ text: 'kept' }] }
  const dropped = { id: 'dropped', priority: 2, lines: () => [{ text: 'dropped' }], footnote: () => [{ text: 'its note' }] }

  expect(arrange(ctx(), 10, [kept, dropped]).map(l => l.text)).toEqual([
    'kept',
    '━'.repeat(30),
    'dropped',
    '┈'.repeat(10),
    'its note',
  ])
  expect(arrange(ctx(), 1, [kept, dropped]).map(l => l.text)).toEqual(['kept'])
})

test('the project group is hidden outside a repository', () => {
  expect(project.lines(ctx())).toEqual([])
  const lines = project.lines(ctx({ git: { branch: 'TASK-12', changed: 3, ahead: 1, behind: 0 } })).map(l => l.text)
  expect(lines).toEqual(['TASK-12 · 3 changed ↑1'])
  const row = project.lines(ctx({ git: { branch: 'TASK-12', changed: 3, ahead: 1, behind: 0 } }))[0]!
  expect(row.cells).toEqual([{ text: 'TASK-12' }, { text: ' · 3 changed ↑1', dimColor: true }])
  // Too narrow for one row: the branch, and the state under it.
  expect(project.lines(ctx({ columns: 12, git: { branch: 'TASK-12', changed: 0, ahead: 0, behind: 0 } })).map(l => l.text)).toEqual([
    'TASK-12',
    'clean',
  ])
})

test('the system group adds memory, disk, network and docker to the bars, with no rule between them', () => {
  const texts = system
    .lines(ctx({ system: { ramPercent: 50, diskPercent: 30, downBps: 524288, upBps: 2048, netPeakBps: 1048576, dockers: [{ name: 'api', networks: ['n'] }, { name: 'db', networks: ['n'] }] } }))
    .map(l => l.text)

  // 30 columns are too few for two meters to a row: one each, and the rates as text.
  expect(texts[0]).toMatch(/^RAM  [█▏▎▍▌▋▊▉─]+ 50%$/)
  expect(texts[1]).toMatch(/^Disk [█▏▎▍▌▋▊▉─]+ 30%$/)
  expect(texts[2]).toBe(`↓ ${formatRate(524288)}  ↑ ${formatRate(2048)}`)
  expect(texts.slice(3)).toEqual(['docker · 2 running', containerLine('api', 30).text, containerLine('db', 30).text])
  expect(texts.some(t => t.startsWith('┈'))).toBe(false)
  expect(texts.some(t => t.startsWith('Swap'))).toBe(false)
})

test('where the band is wide enough the meters go two to a row and the rates are small bars', () => {
  const lines = system.lines(
    ctx({
      columns: 41,
      hardware: { cpu: { total: 34, cores: [] }, gpus: [{ name: 'g', util: 62, memUsedMb: 1, memTotalMb: 2 }], npus: [] },
      system: { ramPercent: 58, diskPercent: 71, downBps: 524288, upBps: 2048, netPeakBps: 1048576 },
    }),
  )
  const texts = lines.map(l => l.text)

  expect(texts.map(t => t.replace(/[█▏▎▍▌▋▊▉─]+/g, '#'))).toEqual([
    'CPU  # 34% GPU  # 62%',
    'VRAM # 50% RAM  # 58%',
    'Disk # 71%',
    `↓ # ${formatRate(524288).padStart(7)} ↑ # ${formatRate(2048).padStart(7)}`,
  ])
  expect(texts[3]).toBe([...rateMeter('↓', 524288, 1048576, 20, 'down'), { text: ' ' }, ...rateMeter('↑', 2048, 1048576, 20, 'up')].map(c => c.text).join(''))
  for (const line of lines) {
    expect(line.text).toHaveLength(41)
    expect(line.cells!.map(c => c.text).join('')).toBe(line.text)
  }
})

test('when rows run short the highest priority number is dropped first, whole', () => {
  const full = ctx({
    git: { branch: 'US-1', changed: 0, ahead: 0, behind: 0 },
    system: { ramPercent: 10 },
    usage: { contextWindow: 200_000, limits: [] },
  })
  const ids = (rows: number) => {
    const lines = arrange(full, rows)
    return groups.filter(g => g.lines(full).every(l => lines.some(x => x.text === l.text))).map(g => g.id)
  }
  expect(ids(200)).toEqual(['time', 'session', 'project', 'system'])
  // Each boundary between groups takes one row: the rule.
  const base = time.lines(full).length + session.lines(full).length + project.lines(full).length
  const noSystem = arrange(full, base + 2)
  expect(noSystem.some(l => l.text.startsWith('RAM'))).toBe(false)
  expect(noSystem.some(l => l.text.startsWith('US-1'))).toBe(true)
  const noProject = arrange(full, base + 1)
  expect(noProject.some(l => l.text.startsWith('US-1'))).toBe(false)
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

  expect(groups.map(g => g.label)).toEqual([undefined, 'Claude', 'Project', 'System'])
  expect(texts[0].startsWith('┏')).toBe(true)
  expect(texts.filter(t => t.startsWith('━━ ')).map(t => t.replace(/ ━+$/, ''))).toEqual([
    '━━ Claude',
    '━━ Project',
    '━━ System',
  ])
  expect(texts.every(t => t.length <= 30)).toBe(true)
  expect(lines.filter(l => l.text.startsWith('━━ ')).every(l => l.color === '#ff8c00')).toBe(true)
  // Each boundary is the rule that names the section, no blank row.
  const own = groups.reduce((sum, g) => sum + g.lines(full).length, 0)
  expect(lines.length).toBe(own + 3)
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

  // Only docker keeps one, between containers of different networks.
  expect(texts.filter(t => /^┈+$/.test(t)).length).toBe(1)
  expect(texts.filter(t => t.startsWith('━━ ')).length).toBe(3)
  expect(texts.filter(t => /^━+$/.test(t))).toEqual([])
  expect(texts.some(t => t.startsWith('┄'))).toBe(false)
})

test('no blank row anywhere: the titled rule alone sets a group apart', () => {
  const full = ctx({
    git: { branch: 'US-1', changed: 0, ahead: 0, behind: 0 },
    system: { ramPercent: 10 },
    usage: { contextWindow: 200_000, limits: [] },
  })
  const texts = arrange(full, 200).map(l => l.text)
  const blanks = texts.flatMap((t, i) => (t.trim() === '' ? [i] : []))
  const rules = texts.flatMap((t, i) => (t.startsWith('━━ ') ? [i] : []))

  expect(blanks).toEqual([])
  expect(rules.length).toBe(3)
  for (const at of rules) expect(texts[at - 1]!.startsWith('━━ ')).toBe(false)
})

test('a group dropped for lack of rows takes its name with it', () => {
  const full = ctx({
    git: { branch: 'US-1', changed: 0, ahead: 0, behind: 0 },
    system: { ramPercent: 10 },
    usage: { contextWindow: 200_000, limits: [] },
  })
  const rows = time.lines(full).length + session.lines(full).length + project.lines(full).length + 2
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

test('the credit goes last, after a short rule, whole, only where rows are left over', () => {
  const c = paced()
  const credit = creditLines(30)
  const plain = arrange(c, 500)
  const full = arrange(c, 500, groups, credit)

  expect(credit.length).toBeGreaterThan(1)
  expect(full.slice(-credit.length)).toEqual(credit)
  expect(full.slice(-credit.length - 1, -credit.length)).toEqual([footRule(30)])
  expect(full.slice(0, plain.length)).toEqual(plain)
  expect(full.length).toBe(plain.length + credit.length + 1)
  expect(arrange(c, full.length, groups, credit)).toEqual(full)
  expect(arrange(c, full.length - 1, groups, credit)).toEqual(arrange(c, full.length - 1))
})

test('the credit never costs a widget or a footnote a row', () => {
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
    expect(credited.slice(plain.length)).toEqual([footRule(40), ...credit])
  }
})

test('with no credit given, arrange draws what it drew before', () => {
  const c = paced()

  expect(arrange(c, 500, groups, [])).toEqual(arrange(c, 500))
})
