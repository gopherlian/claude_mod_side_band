// The machine: percent bars for CPU, GPU, memory and disk, then the network and the containers.
import { formatRate } from '../format'
import { dockerLines } from '../sections/docker'
import { compactMeter, rateMeter } from '../sections/monitor'
import { RESOURCE_TEXT_COLORS } from '../sections/palette'
import type { Resource } from '../sections/palette'
import type { Cell, Line } from '../sections/usage'
import type { Group, GroupContext } from './types'

/** Containers drawn as bars; the rest are counted. */
const MAX_DOCKERS = 5

/** The resources that have a percent, in the order they are drawn: processors first, then memory and disk. */
const percents = (ctx: GroupContext): { label: string; percent: number; resource: Resource }[] => {
  const { hardware, system: s } = ctx
  const gpus = hardware?.gpus ?? []
  const npus = hardware?.npus ?? []

  return [
    ...(hardware?.cpu ? [{ label: 'CPU', percent: hardware.cpu.total, resource: 'cpu' as const }] : []),
    ...gpus.flatMap((gpu, i) => [
      { label: gpus.length > 1 ? `GPU${i}` : 'GPU', percent: gpu.util, resource: 'gpu' as const },
      ...(gpu.memUsedMb !== undefined && gpu.memTotalMb
        ? [{ label: gpus.length > 1 ? `VRAM${i}` : 'VRAM', percent: (gpu.memUsedMb / gpu.memTotalMb) * 100, resource: 'vram' as const }]
        : []),
    ]),
    ...npus.map((npu, i) => ({ label: npus.length > 1 ? `NPU${i}` : 'NPU', percent: npu.util, resource: 'npu' as const })),
    ...(s.ramPercent !== undefined ? [{ label: 'RAM', percent: s.ramPercent, resource: 'ram' as const }] : []),
    ...(s.swapPercent !== undefined ? [{ label: 'Swap', percent: s.swapPercent, resource: 'swap' as const }] : []),
    ...(s.diskPercent !== undefined ? [{ label: 'Disk', percent: s.diskPercent, resource: 'disk' as const }] : []),
  ]
}

const joined = (cells: Cell[]): Line => ({ text: cells.map(cell => cell.text).join(''), cells })

/** Below this many cells a half row would leave its bar too short to read, so each resource takes a row. */
const MIN_PAIR_COLUMNS = 31

/** The percent meters: two to a row where the band is wide enough, else one to a row. */
const meterRows = (ctx: GroupContext, isPaired: boolean): Line[] => {
  const meters = percents(ctx)
  const left = Math.floor((ctx.columns - 1) / 2)
  if (!isPaired) return meters.map(m => joined(compactMeter(m.label, m.percent, ctx.columns, m.resource)))

  const lines: Line[] = []
  for (let i = 0; i < meters.length; i += 2) {
    const a = meters[i]!
    const b = meters[i + 1]
    lines.push(
      joined(
        b
          ? [
              ...compactMeter(a.label, a.percent, left, a.resource),
              { text: ' ' },
              ...compactMeter(b.label, b.percent, ctx.columns - left - 1, b.resource),
            ]
          : compactMeter(a.label, a.percent, ctx.columns, a.resource),
      ),
    )
  }

  return lines
}

/** The network rates on one row: as two small bars where they fit, against the highest rate seen, else as text. */
const netRow = (ctx: GroupContext, withBars: boolean): Line | undefined => {
  const s = ctx.system
  if (s.downBps === undefined || s.upBps === undefined) return undefined
  if (!withBars) {
    return joined([
      { text: `↓ ${formatRate(s.downBps)}`, color: RESOURCE_TEXT_COLORS.down },
      { text: '  ' },
      { text: `↑ ${formatRate(s.upBps)}`, color: RESOURCE_TEXT_COLORS.up },
    ])
  }
  const peak = s.netPeakBps ?? Math.max(s.downBps, s.upBps)
  const left = Math.floor((ctx.columns - 1) / 2)

  return joined([
    ...rateMeter('↓', s.downBps, peak, left, 'down'),
    { text: ' ' },
    ...rateMeter('↑', s.upBps, peak, ctx.columns - left - 1, 'up'),
  ])
}

/** `docker · 3 running`, dim. */
const dockerCount = (ctx: GroupContext, dockers: unknown[]): Line => ({
  text: (dockers.length === 0 ? 'docker · none running' : `docker · ${dockers.length} running`).slice(0, ctx.columns),
  dimColor: true,
})

export const system: Group = {
  id: 'system',
  label: 'System',
  priority: 3,
  // Stacked: the meters, two to a row where they fit, the network on one row, then the containers.
  lines: (ctx: GroupContext): Line[] => {
    const s = ctx.system
    const isPaired = ctx.columns >= MIN_PAIR_COLUMNS
    const gpus = ctx.hardware?.gpus ?? []
    const gpuUtil = gpus.length > 0 ? Math.max(...gpus.map(g => g.util)) : undefined
    const net = netRow(ctx, isPaired)
    const lines = [...meterRows(ctx, isPaired), ...(net ? [net] : [])]

    if (s.dockers !== undefined) {
      lines.push(dockerCount(ctx, s.dockers), ...dockerLines(s.dockers, ctx.columns, MAX_DOCKERS, gpuUtil))
    }

    return lines
  },
  // In the strip: two resources to a row, the rates on one row and the containers counted.
  strip: {
    min: 28,
    max: 40,
    lines: (ctx: GroupContext): Line[] => {
      const s = ctx.system
      const net = netRow(ctx, false)
      const lines = [
        ...meterRows(ctx, true),
        ...(net ? [net] : []),
        ...(s.dockers !== undefined ? [dockerCount(ctx, s.dockers)] : []),
      ]

      return lines.slice(0, ctx.budget ?? Number.POSITIVE_INFINITY)
    },
  },
}
