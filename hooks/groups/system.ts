// The machine: percent bars for CPU, GPU, memory and disk, then rates and counts.
import { formatRate } from '../format'
import { dockerLines } from '../sections/docker'
import { compactMeter, meterLine, monitorLines, rateLine } from '../sections/monitor'
import { RESOURCE_TEXT_COLORS } from '../sections/palette'
import type { Resource } from '../sections/palette'
import { softRule } from '../sections/usage'
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

export const system: Group = {
  id: 'system',
  label: 'System',
  priority: 3,
  lines: (ctx: GroupContext): Line[] => {
    const lines = monitorLines(ctx.hardware, ctx.columns)
    const s = ctx.system
    const gpus = ctx.hardware?.gpus ?? []
    const gpuUtil = gpus.length > 0 ? Math.max(...gpus.map(g => g.util)) : undefined

    if (s.ramPercent !== undefined) lines.push(meterLine('RAM', s.ramPercent, ctx.columns, 'ram'))
    if (s.swapPercent !== undefined) lines.push(meterLine('Swap', s.swapPercent, ctx.columns, 'swap'))
    if (s.diskPercent !== undefined) lines.push(meterLine('Disk', s.diskPercent, ctx.columns, 'disk'))
    if (s.downBps !== undefined && s.upBps !== undefined) {
      const peak = s.netPeakBps ?? Math.max(s.downBps, s.upBps)
      if (lines.length > 0) lines.push(softRule(ctx.columns))
      lines.push(rateLine('Download', s.downBps, peak, ctx.columns, 'down'))
      lines.push(rateLine('Upload', s.upBps, peak, ctx.columns, 'up'))
    }
    if (s.dockers !== undefined) {
      if (lines.length > 0) lines.push(softRule(ctx.columns))
      lines.push({
        text: (s.dockers.length === 0 ? 'docker · none running' : `docker · ${s.dockers.length} running`).slice(0, ctx.columns),
        dimColor: true,
      })
      lines.push(...dockerLines(s.dockers, ctx.columns, MAX_DOCKERS, gpuUtil))
    }

    return lines
  },
  // In the strip: two resources to a row, the rates on one row and the containers counted.
  strip: {
    min: 28,
    max: 40,
    lines: (ctx: GroupContext): Line[] => {
      const s = ctx.system
      const lines: Line[] = []
      const meters = percents(ctx)
      const left = Math.floor((ctx.columns - 1) / 2)
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
      if (s.downBps !== undefined && s.upBps !== undefined) {
        lines.push(
          joined([
            { text: `↓ ${formatRate(s.downBps)}`, color: RESOURCE_TEXT_COLORS.down },
            { text: '  ' },
            { text: `↑ ${formatRate(s.upBps)}`, color: RESOURCE_TEXT_COLORS.up },
          ]),
        )
      }
      if (s.dockers !== undefined) {
        lines.push({
          text: (s.dockers.length === 0 ? 'docker · none running' : `docker · ${s.dockers.length} running`).slice(0, ctx.columns),
          dimColor: true,
        })
      }

      return lines.slice(0, ctx.budget ?? Number.POSITIVE_INFINITY)
    },
  },
}
