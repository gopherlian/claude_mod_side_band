// The hardware monitor section: one bar per resource, in percent.
import { formatRate } from '../format'
import type { Hardware } from '../monitor/types'
import { RESOURCE_COLORS } from './palette'
import type { Resource } from './palette'
import { bar, meter } from './usage'
import type { Line } from './usage'

/** A bar in the colour of its resource, whatever its fill. */
export const meterLine = (label: string, percent: number, columns: number, resource: Resource): Line => ({
  text: meter(label, percent, columns),
  color: RESOURCE_COLORS[resource],
})

const LABEL_WIDTH = 8
const RATE_WIDTH = 7

/**
 * A bar for a rate: full at `peakBps`, the rate written at its right. There is
 * no fixed top speed to measure against, so the scale is the highest seen.
 */
export const rateLine = (
  label: string,
  bps: number,
  peakBps: number,
  columns: number,
  resource?: Resource,
): Line => {
  const width = Math.max(4, columns - LABEL_WIDTH - 1 - RATE_WIDTH)
  const percent = peakBps > 0 ? (bps / peakBps) * 100 : 0

  return {
    text: `${label.padEnd(LABEL_WIDTH)}${bar(percent, width)} ${formatRate(bps).padStart(RATE_WIDTH)}`,
    ...(resource && { color: RESOURCE_COLORS[resource] }),
  }
}

/** The bars of the section; none when nothing was detected. */
export const monitorLines = (hardware: Hardware | undefined, columns: number): Line[] => {
  if (!hardware) return []
  const { cpu, gpus, npus } = hardware
  const lines: Line[] = []

  if (cpu) lines.push(meterLine('CPU', cpu.total, columns, 'cpu'))

  gpus.forEach((gpu, i) => {
    lines.push(meterLine(gpus.length > 1 ? `GPU${i}` : 'GPU', gpu.util, columns, 'gpu'))
    if (gpu.memUsedMb !== undefined && gpu.memTotalMb) {
      lines.push(
        meterLine(gpus.length > 1 ? `VRAM${i}` : 'VRAM', (gpu.memUsedMb / gpu.memTotalMb) * 100, columns, 'vram'),
      )
    }
  })

  npus.forEach((npu, i) => {
    lines.push(meterLine(npus.length > 1 ? `NPU${i}` : 'NPU', npu.util, columns, 'npu'))
  })

  return lines
}
