// The machine: percent bars for CPU, GPU, memory and disk, then rates and counts.
import { dockerLines } from '../sections/docker'
import { meterLine, monitorLines, rateLine } from '../sections/monitor'
import { softRule } from '../sections/usage'
import type { Line } from '../sections/usage'
import type { Group, GroupContext } from './types'

/** Containers drawn as bars; the rest are counted. */
const MAX_DOCKERS = 5

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
      lines.push(rateLine('Down', s.downBps, peak, ctx.columns, 'down'))
      lines.push(rateLine('Up', s.upBps, peak, ctx.columns, 'up'))
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
}
