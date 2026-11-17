import type { Container, GitStatus } from './types'

/** RAM and swap use from /proc/meminfo (kB). */
export const parseMeminfo = (text: string): { ramPercent?: number; swapPercent?: number } => {
  const get = (key: string): number | undefined => {
    const match = new RegExp(`^${key}:\\s+(\\d+)`, 'm').exec(text)

    return match ? Number(match[1]) : undefined
  }
  const total = get('MemTotal')
  const available = get('MemAvailable')
  const swapTotal = get('SwapTotal')
  const swapFree = get('SwapFree')

  return {
    ramPercent: total && available !== undefined ? (1 - available / total) * 100 : undefined,
    swapPercent: swapTotal ? (1 - (swapFree ?? 0) / swapTotal) * 100 : undefined,
  }
}

/** Disk use from the second line of `df -P`. */
export const parseDf = (text: string): number | undefined => {
  const line = text.trim().split('\n')[1]
  if (!line) return undefined
  const fields = line.trim().split(/\s+/)
  const used = Number(fields[2])
  const available = Number(fields[3])
  if (!(used >= 0) || !(available >= 0) || used + available === 0) return undefined

  return (used / (used + available)) * 100
}

export type NetTotals = { rx: number; tx: number }

/** Bytes received and sent, summed over every interface but the loopback. */
export const parseNetDev = (text: string): NetTotals => {
  let rx = 0
  let tx = 0
  for (const line of text.split('\n')) {
    const match = /^\s*([^:\s]+):\s*(.*)$/.exec(line)
    if (!match || match[1] === 'lo') continue
    const fields = match[2].trim().split(/\s+/).map(Number)
    rx += fields[0] || 0
    tx += fields[8] || 0
  }

  return { rx, tx }
}

export const netRates = (
  before: NetTotals,
  after: NetTotals,
  elapsedMs: number,
): { down: number; up: number } | undefined =>
  elapsedMs <= 0
    ? undefined
    : {
        down: Math.max(0, (after.rx - before.rx) / (elapsedMs / 1000)),
        up: Math.max(0, (after.tx - before.tx) / (elapsedMs / 1000)),
      }

/** Branch, changed files and ahead/behind from `git status --porcelain=v1 -b`. */
export const parseGitStatus = (text: string): GitStatus | undefined => {
  const lines = text.split('\n')
  const head = lines[0]
  if (!head?.startsWith('## ')) return undefined
  const rest = head.slice(3)

  const branch = rest.startsWith('No commits yet on ')
    ? rest.slice('No commits yet on '.length)
    : rest.startsWith('HEAD (no branch)')
      ? 'detached'
      : rest.split('...')[0].split(' ')[0]

  return {
    branch,
    changed: lines.slice(1).filter(line => line.trim() !== '').length,
    ahead: Number(/ahead (\d+)/.exec(rest)?.[1] ?? 0),
    behind: Number(/behind (\d+)/.exec(rest)?.[1] ?? 0),
  }
}

/** Containers, one per line of `docker ps --format {{.Names}}<tab>{{.Networks}}`. */
export const parseDockers = (text: string): Container[] =>
  text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
    .map(line => {
      const [name, networks = ''] = line.split('\t')

      return {
        name: name.trim(),
        networks: networks
          .split(',')
          .map(network => network.trim())
          .filter(network => network !== ''),
      }
    })

/** CPU percent per container from `docker stats --no-stream --format {{.Name}}<tab>{{.CPUPerc}}`. */
export const parseDockerStats = (text: string): Map<string, number> => {
  const cpu = new Map<string, number>()
  for (const line of text.split('\n')) {
    const [name, percent] = line.split('\t')
    const value = Number(percent?.trim().replace('%', ''))
    if (name?.trim() && percent?.trim() && !Number.isNaN(value)) cpu.set(name.trim(), value)
  }

  return cpu
}

/** Names of the containers that asked for a GPU, from `docker inspect --format {{.Name}}<tab>{{len .HostConfig.DeviceRequests}}`. */
export const parseGpuContainers = (text: string): Set<string> => {
  const names = new Set<string>()
  for (const line of text.split('\n')) {
    const [name, count] = line.split('\t')
    if (name?.trim() && Number(count?.trim()) > 0) names.add(name.trim().replace(/^\//, ''))
  }

  return names
}
