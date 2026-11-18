// The hardware monitor section: one bar per resource, in percent.
import { formatRate } from '../format'
import type { Hardware } from '../monitor/types'
import { RESOURCE_COLORS, RESOURCE_ICONS, RESOURCE_TEXT_COLORS } from './palette'
import type { Resource } from './palette'
import { bar, meter } from './usage'
import type { Cell, Line } from './usage'

/** `text` as three runs: the first `head` cells and the last `tail` cells in the lighter `light`, the bar between them in `color`. */
const brightEnds = (text: string, head: number, tail: number, color: string, light: string): Cell[] =>
  [
    { text: text.slice(0, head), color: light },
    { text: text.slice(head, text.length - tail), color },
    { text: text.slice(text.length - tail), color: light },
  ].filter(cell => cell.text !== '')

/** The icon of the resource, then its name: `LABEL_WIDTH` cells, so every bar of the group starts in one column. */
const labelOf = (label: string, resource: Resource): string => `${RESOURCE_ICONS[resource]} ${label}`.padEnd(LABEL_WIDTH)

/**
 * A bar in the colour of its resource, whatever its fill, after the resource's
 * icon and name; the icon, the name and the percent are a lighter shade of the
 * same colour.
 */
export const meterLine = (label: string, percent: number, columns: number, resource: Resource): Line => {
  const text = meter(labelOf(label, resource), percent, columns)
  const color = RESOURCE_COLORS[resource]

  return { text, color, cells: brightEnds(text, LABEL_WIDTH, 5, color, RESOURCE_TEXT_COLORS[resource]) }
}

/** The icon, a space and the longest name (`Download`). */
const LABEL_WIDTH = 10
const RATE_WIDTH = 7

/** A meter small enough to share a row: a 4-cell name, the bar, then the number, `width` cells in all. */
export const compactMeter = (label: string, percent: number, width: number, resource: Resource): Cell[] => {
  const name = `${label.slice(0, 4).padEnd(4)} `
  const number = `${Math.round(percent)}%`.padStart(4)

  return [
    { text: name, color: RESOURCE_TEXT_COLORS[resource] },
    { text: bar(percent, Math.max(2, width - name.length - number.length)), color: RESOURCE_COLORS[resource] },
    { text: number, color: RESOURCE_TEXT_COLORS[resource] },
  ]
}

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

  const head = resource ? labelOf(label, resource) : label.padEnd(LABEL_WIDTH)
  const text = `${head}${bar(percent, width)} ${formatRate(bps).padStart(RATE_WIDTH)}`
  if (!resource) return { text }
  const color = RESOURCE_COLORS[resource]

  return { text, color, cells: brightEnds(text, LABEL_WIDTH, RATE_WIDTH + 1, color, RESOURCE_TEXT_COLORS[resource]) }
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
