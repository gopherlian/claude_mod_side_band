import { expect, test } from 'claude-code/testing'

import { bigText } from '../bigdigits'
import { formatShortTime } from '../widgets/clock'
import { containerLine } from '../sections/docker'
import { rateLine } from '../sections/monitor'
import { creditLines } from '../sections/credit'
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
  expect(texts).toContain('UV 6 · 07:12–18:44')
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
  expect(narrow).toContain('UV 6 · 07:12–18:44')
})

test('without an icon the outlook is exactly as before', () => {
  const texts = time.lines(ctx({ columns: 60 })).map(l => l.text)
  expect(texts.some(t => t.includes('☀') || t.includes('☂'))).toBe(false)
  expect(texts).toContain('↑24° ↓15° · rain 30% · UV 6 · 07:12–18:44')
})

test('the outlook shares one row when it fits and keeps two when it does not', () => {
  const joined = '↑24° ↓15° · rain 30% · UV 6 · 07:12–18:44'
  const rows = (columns: number) => time.lines(ctx({ columns })).map(l => l.text)

  expect(rows(60)).toContain(joined)
  expect(rows(60)).not.toContain('UV 6 · 07:12–18:44')
  expect(rows(joined.length)).toContain(joined)

  const narrow = rows(joined.length - 1)
  expect(narrow).not.toContain(joined)
  expect(narrow).toContain('↑24° ↓15° · rain 30%')
  expect(narrow).toContain('UV 6 · 07:12–18:44')
})

test('the outlook is always centered, on one row or split in two', () => {
  const joined = '↑24° ↓15° · rain 30% · UV 6 · 07:12–18:44'
  const outlook = (columns: number) => time.lines(ctx({ columns })).filter(l => /rain|UV/.test(l.text))

  const wide = outlook(60)
  expect(wide.length).toBe(1)
  expect(wide[0].align).toBe('center')

  const narrow = outlook(joined.length - 1)
  expect(narrow.map(l => l.text)).toEqual(['↑24° ↓15° · rain 30%', 'UV 6 · 07:12–18:44'])
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
  expect(lines).toContain('┃ time elapsed in the window')
  expect(lines).toContain('1h00m · $3.00 · $3.00/h')
  expect(lines.find(l => l.startsWith('tools'))).toMatch(/^tools [·▂▃▄▅▆▇█]{10} 7 ▸ Bash$/)
  expect(lines).toContain('turn 0:42')
  expect(lines).toContain('Sonnet 5.5 ●●○○○ medium')
  expect(lines[lines.length - 2]).toBe('┈'.repeat(30))
  expect(lines.every(l => l.length <= 30)).toBe(true)
})

test('what fills the context is drawn under the bar, never listing the free space or the reserve as a consumer', () => {
  const lines = session.lines(busy()).map(l => l.text)

  expect(lines.slice(2, 4)).toEqual(['▒ buffer 33k  ■ msgs 30k', '■ sys 12k'])
  expect(lines.join('\n')).not.toMatch(/free|autocompact/i)
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

test('the last turn is shown once it ends, and a quiet session has an empty chart', () => {
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

  expect(note[0]).toMatch(/^\(\*\) If ┃ is inside the fill/)
  expect(session.footnote!(ctx())).toEqual([])
})

const bare = () => groups.map(group => ({ ...group, footnote: undefined }))

test('footnotes go at the foot after a blank row and a short rule, whole, only where rows are left over', () => {
  const c = paced()
  const note = session.footnote!(c)
  const full = arrange(c, 500)
  const without = arrange(c, 500, bare())

  expect(note.length).toBeGreaterThan(1)
  expect(full.slice(-note.length)).toEqual(note)
  expect(full.slice(-note.length - 2, -note.length)).toEqual([{ text: ' ' }, footRule(30)])
  expect(full.length).toBe(without.length + note.length + 2)
  expect(arrange(c, full.length)).toEqual(full)
  expect(arrange(c, full.length - 1)).toEqual(without)
})

test('the legend carries the (*) only where its note is drawn', () => {
  const c = paced()
  const texts = (lines: { text: string }[]) => lines.map(l => l.text)

  expect(texts(arrange(c, 500))).toContain('┃ time elapsed (*)')
  expect(texts(arrange(paced({ columns: 40 }), 500))).toContain('┃ time elapsed in the window (*)')
  expect(texts(arrange(c, 500, bare()))).toContain('┃ time elapsed in the window')
  expect(texts(arrange(c, 500, bare())).some(t => t.includes('(*)'))).toBe(false)
})

test('a footnote never costs a widget a row: what drops is what dropped without it', () => {
  // Wide enough for the legend to keep its wording with the mark in; below that
  // it shortens, which is the one other difference a drawn note makes.
  const c = paced({ columns: 40 })
  const note = session.footnote!(c)
  const strip = (text: string) => text.replace(/ \(\*\)$/, '')
  const unmark = (line: { text: string; cells?: { text: string }[] }) => ({
    ...line,
    text: strip(line.text),
    ...(line.cells && {
      cells: line.cells
        .filter(cell => cell.text !== '(*)')
        .map(cell => ({ ...cell, text: line.cells!.some(c => c.text === '(*)') ? cell.text.replace(/ $/, '') : cell.text })),
    }),
  })

  for (let available = 5; available <= 80; available++) {
    const without = arrange(c, available, bare())
    const withNote = arrange(c, available)

    if (withNote.length === without.length) {
      expect(withNote).toEqual(without)
      continue
    }
    expect(withNote.length).toBe(without.length + note.length + 2)
    expect(withNote.slice(0, without.length).map(unmark)).toEqual(without)
    expect(withNote.slice(without.length)).toEqual([{ text: ' ' }, footRule(40), ...note])
    expect(withNote.filter(l => l.text.endsWith(' (*)'))).toHaveLength(1)
  }
})

test('a group that was dropped leaves its footnote out too', () => {
  const kept = { id: 'kept', priority: 1, lines: () => [{ text: 'kept' }] }
  const dropped = { id: 'dropped', priority: 2, lines: () => [{ text: 'dropped' }], footnote: () => [{ text: 'its note' }] }

  expect(arrange(ctx(), 10, [kept, dropped]).map(l => l.text)).toEqual([
    'kept',
    ' ',
    '━'.repeat(30),
    'dropped',
    ' ',
    '┈'.repeat(10),
    'its note',
  ])
  expect(arrange(ctx(), 1, [kept, dropped]).map(l => l.text)).toEqual(['kept'])
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
  expect(texts.some(t => t.startsWith('RAM') && t.includes('50%'))).toBe(true)
  expect(texts.some(t => t.startsWith('Disk') && t.includes('30%'))).toBe(true)
  const down = rateLine('Down', 524288, 1048576, 30).text
  expect(texts).toContain(down)
  expect(texts).toContain(rateLine('Up', 2048, 1048576, 30).text)
  expect(down).toBe('Down    ' + '█'.repeat(7) + '░'.repeat(7) + '  512K/s')
  expect(texts[texts.indexOf(down) - 1]).toBe('┈'.repeat(30))
  expect(texts.some(t => t.includes('↓') || t.includes('↑'))).toBe(false)
  expect(texts).toContain('docker · 2 running')
  expect(texts).toContain(containerLine('api', 30).text)
  expect(texts).toContain(containerLine('db', 30).text)
  expect(texts.some(t => t.startsWith('●'))).toBe(false)
  // One network: the only inner separators are the two before the network and docker blocks.
  expect(texts.filter(t => t.startsWith('┈')).length).toBe(2)
  expect(texts[texts.indexOf('docker · 2 running') - 1]).toBe('┈'.repeat(30))
  expect(texts.some(t => t.startsWith('Swap'))).toBe(false)
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
  // Each boundary between groups takes two rows: a blank one and the rule.
  const base = time.lines(full).length + session.lines(full).length + project.lines(full).length
  const noSystem = arrange(full, base + 4)
  expect(noSystem.some(l => l.text.startsWith('RAM'))).toBe(false)
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

  expect(groups.map(g => g.label)).toEqual([undefined, 'Claude', 'Project', 'System'])
  expect(texts[0].startsWith('┏')).toBe(true)
  expect(texts.filter(t => t.startsWith('━━ ')).map(t => t.replace(/ ━+$/, ''))).toEqual([
    '━━ Claude',
    '━━ Project',
    '━━ System',
  ])
  expect(texts.every(t => t.length <= 30)).toBe(true)
  expect(lines.filter(l => l.text.startsWith('━━ ')).every(l => l.color === '#ff8c00')).toBe(true)
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

  // Claude before the model, System before the network and docker blocks, docker between networks.
  expect(texts.filter(t => /^┈+$/.test(t)).length).toBe(4)
  expect(texts.filter(t => t.startsWith('━━ ')).length).toBe(3)
  expect(texts.filter(t => /^━+$/.test(t))).toEqual([])
  expect(texts.some(t => t.startsWith('┄'))).toBe(false)
})

test('a blank row sits between one group and the next, never at the edges', () => {
  const full = ctx({
    git: { branch: 'US-1', changed: 0, ahead: 0, behind: 0 },
    system: { ramPercent: 10 },
    usage: { contextWindow: 200_000, limits: [] },
  })
  const texts = arrange(full, 200).map(l => l.text)
  const blanks = texts.flatMap((t, i) => (t.trim() === '' ? [i] : []))
  const rules = texts.flatMap((t, i) => (t.startsWith('━━ ') ? [i] : []))

  expect(blanks.length).toBe(3)
  expect(blanks).toEqual(rules.map(i => i - 1))
  expect(texts[0].trim()).not.toBe('')
  expect(texts[texts.length - 1].trim()).not.toBe('')
  // Inside a group nothing is added: the system group keeps its own plain rules and no blank.
  const system = texts.slice(rules[2])
  expect(system.some(t => t.trim() === '')).toBe(false)
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

test('the credit goes last, after a blank row and a short rule, whole, only where rows are left over', () => {
  const c = paced()
  const credit = creditLines(30)
  const plain = arrange(c, 500)
  const full = arrange(c, 500, groups, credit)

  expect(credit.length).toBeGreaterThan(1)
  expect(full.slice(-credit.length)).toEqual(credit)
  expect(full.slice(-credit.length - 2, -credit.length)).toEqual([{ text: ' ' }, footRule(30)])
  expect(full.slice(0, plain.length)).toEqual(plain)
  expect(full.length).toBe(plain.length + credit.length + 2)
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
    expect(credited.slice(plain.length)).toEqual([{ text: ' ' }, footRule(40), ...credit])
  }
})

test('with no credit given, arrange draws what it drew before', () => {
  const c = paced()

  expect(arrange(c, 500, groups, [])).toEqual(arrange(c, 500))
})
