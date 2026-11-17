import { expect, test } from 'claude-code/testing'

import { formatClock, formatDuration, formatRate } from '../format'
import { netRates, parseDf, parseDockerStats, parseDockers, parseGpuContainers, parseGitStatus, parseMeminfo, parseNetDev } from './system'

test('memory and swap are read from meminfo', () => {
  const text = 'MemTotal: 1000 kB\nMemAvailable: 250 kB\nSwapTotal: 400 kB\nSwapFree: 300 kB\n'
  expect(parseMeminfo(text)).toEqual({ ramPercent: 75, swapPercent: 25 })
  expect(parseMeminfo('SwapTotal: 0 kB\nSwapFree: 0 kB\n').swapPercent).toBeUndefined()
})

test('disk use comes from used over used plus available', () => {
  const df = 'Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/sdc 1000 300 700 30% /\n'
  expect(parseDf(df)).toBe(30)
  expect(parseDf('garbage')).toBeUndefined()
})

test('network rates ignore the loopback and use the elapsed time', () => {
  const dev = 'Inter-| Receive\n lo: 999 0 0 0 0 0 0 0 999 0\neth0: 2000 5 0 0 0 0 0 0 500 1\n'
  expect(parseNetDev(dev)).toEqual({ rx: 2000, tx: 500 })
  expect(netRates({ rx: 0, tx: 0 }, { rx: 2000, tx: 500 }, 2000)).toEqual({ down: 1000, up: 250 })
  expect(netRates({ rx: 0, tx: 0 }, { rx: 1, tx: 1 }, 0)).toBeUndefined()
})

test('git status gives branch, changes and distance to the remote', () => {
  const text = '## US-591-llm...origin/US-591-llm [ahead 2, behind 1]\n M a.py\n?? b.py\n'
  expect(parseGitStatus(text)).toEqual({ branch: 'US-591-llm', changed: 2, ahead: 2, behind: 1 })
  expect(parseGitStatus('## develop\n')).toEqual({ branch: 'develop', changed: 0, ahead: 0, behind: 0 })
  expect(parseGitStatus('## No commits yet on main\n')?.branch).toBe('main')
  expect(parseGitStatus('fatal: not a git repository')).toBeUndefined()
})

test('docker gives one container per line, with the networks it is on', () => {
  expect(parseDockers('api\tfront,back\n db \tback \n')).toEqual([
    { name: 'api', networks: ['front', 'back'] },
    { name: 'db', networks: ['back'] },
  ])
  expect(parseDockers('')).toEqual([])
})

test('a container line with no networks still counts', () => {
  expect(parseDockers('solo\t\nbare\n')).toEqual([
    { name: 'solo', networks: [] },
    { name: 'bare', networks: [] },
  ])
})

test('durations, clocks and rates are written short', () => {
  expect(formatDuration(42_000)).toBe('42s')
  expect(formatDuration(12 * 60_000)).toBe('12m')
  expect(formatDuration(83 * 60_000)).toBe('1h23m')
  expect(formatDuration((3 * 24 + 4) * 3_600_000)).toBe('3d04h')
  expect(formatClock(62_000)).toBe('1:02')
  expect(formatRate(512)).toBe('512B/s')
  expect(formatRate(2048)).toBe('2K/s')
  expect(formatRate(3 * 1048576)).toBe('3.0M/s')
})

test('docker stats give the CPU percent of each container by name', () => {
  const cpu = parseDockerStats('api\t12.50%\n db \t0.00%\nbroken\t--\n\n')
  expect(cpu.get('api')).toBe(12.5)
  expect(cpu.get('db')).toBe(0)
  expect(cpu.has('broken')).toBe(false)
})

test('only the containers that asked for a GPU are named, without the slash docker puts before a name', () => {
  const gpu = parseGpuContainers('/api\t1\n/db\t0\n/cv\t2\n')
  expect([...gpu]).toEqual(['api', 'cv'])
})
