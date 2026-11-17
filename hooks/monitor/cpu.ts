import type { CpuReading } from './types'

/** Cumulative jiffies of one CPU line of /proc/stat. */
export type CpuTimes = { idle: number; total: number }

export type StatSnapshot = { all: CpuTimes; cores: CpuTimes[] }

/** Parses /proc/stat: the `cpu` line, then one `cpuN` line per core. */
export const parseStat = (text: string): StatSnapshot | undefined => {
  let all: CpuTimes | undefined
  const cores: CpuTimes[] = []

  for (const line of text.split('\n')) {
    const match = /^cpu(\d*)\s+(.+)$/.exec(line)
    if (!match) continue

    const fields = match[2].trim().split(/\s+/).map(Number)
    const times = {
      idle: fields[3] + (fields[4] ?? 0),
      total: fields.slice(0, 8).reduce((sum, n) => sum + (n || 0), 0),
    }
    if (match[1] === '') all = times
    else cores[Number(match[1])] = times
  }

  return all ? { all, cores: cores.filter(Boolean) } : undefined
}

const busy = (before: CpuTimes, after: CpuTimes): number => {
  const total = after.total - before.total
  if (total <= 0) return 0
  const idle = after.idle - before.idle

  return Math.min(100, Math.max(0, (1 - idle / total) * 100))
}

/** Utilization between two snapshots. */
export const cpuUsage = (before: StatSnapshot, after: StatSnapshot): CpuReading => ({
  total: busy(before.all, after.all),
  cores: after.cores.map((core, i) => (before.cores[i] ? busy(before.cores[i], core) : 0)),
})
