// The demonstration `/band demo` turns on: made-up readings for every element the band can draw, so all of it can be
// seen working on any machine. The figures move a little each second, the way real ones do.
import type { GroupContext } from './groups/types'

/** The part of what a band draws that the demonstration replaces; the clock and the size stay the band's own. */
export type Demo = Pick<GroupContext, 'weather' | 'usage' | 'stats' | 'hardware' | 'system' | 'git' | 'timerEndsAt'>

/** A value that drifts around `base` by up to `swing`, once every `period` seconds, so the bars move. */
const drift = (now: number, base: number, swing: number, period: number): number =>
  Math.max(0, Math.min(100, base + swing * Math.sin((now / 1000 / period) * 2 * Math.PI)))

/** A timer that always shows minutes left: it restarts every half hour. */
const timerEnd = (now: number): number => {
  const span = 30 * 60_000

  return now - (now % span) + span
}

/** The tool calls of the last ten minutes, busier now and then, so the chart has shape. */
const toolTimes = (now: number): number[] =>
  [9.5, 8.4, 8.1, 6.0, 5.6, 5.5, 5.2, 5.0, 3.5, 2.8, 2.3, 1.7, 0.7, 0.4].map(minutes => now - minutes * 60_000)

export const demo = (now: number): Demo => ({
  weather: {
    status: 'ready',
    place: 'Valencia',
    temperature: 22,
    feelsLike: 20,
    humidity: 56,
    wind: 20,
    summary: 'Overcast',
    icon: '☁',
    forecast: { max: 24, min: 15, rainPercent: 3, uv: 3, sunrise: '07:47', sunset: '17:45' },
  },
  usage: {
    contextTokens: 265_000,
    contextWindow: 1_000_000,
    contextPercent: 26,
    costUsd: 4.82,
    startedAt: now - 95 * 60_000,
    limits: [
      { kind: 'five_hour', percentUsed: 41, resetsAt: new Date(now + 69 * 60_000).toISOString() },
      { kind: 'seven_day', percentUsed: 23, resetsAt: new Date(now + 84 * 3_600_000).toISOString() },
    ],
  },
  stats: {
    toolCalls: 37,
    activeTools: 1,
    runningTool: 'Bash',
    turnStartedAt: now - 42_000,
    model: 'Opus 5.5',
    effort: 'high',
    toolTimes: toolTimes(now),
    categories: [
      { name: 'System prompt', tokens: 6_000, kind: 'used' },
      { name: 'System tools', tokens: 15_000, kind: 'used' },
      { name: 'MCP tools', tokens: 37_000, kind: 'used' },
      { name: 'Memory files', tokens: 4_000, kind: 'used' },
      { name: 'Messages', tokens: 203_000, kind: 'used' },
      { name: 'Free space', tokens: 702_000, kind: 'free' },
      { name: 'Autocompact buffer', tokens: 33_000, kind: 'buffer' },
    ],
  },
  hardware: {
    cpu: { total: drift(now, 34, 12, 7), cores: [] },
    gpus: [{ name: 'RTX 4090', util: drift(now, 62, 20, 11), memUsedMb: 9830, memTotalMb: 24576 }],
    npus: [],
  },
  system: {
    ramPercent: drift(now, 58, 3, 17),
    swapPercent: 7,
    diskPercent: 71,
    downBps: 3_400_000 + 2_000_000 * Math.sin((now / 1000 / 5) * 2 * Math.PI),
    upBps: 410_000,
    netPeakBps: 12_000_000,
    dockers: [
      { name: 'model-service', networks: ['app'], cpu: drift(now, 38, 15, 9), gpu: true },
      { name: 'admin-ui', networks: ['app'], cpu: 12 },
      { name: 'postgres', networks: ['db'], cpu: 5 },
    ],
  },
  git: { branch: 'feat-7', changed: 3, ahead: 2, behind: 0 },
  timerEndsAt: timerEnd(now),
})
