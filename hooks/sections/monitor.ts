// The hardware monitor section: small meters that share a row, in percent and in rates.
import { formatRate } from '../format'
import { RESOURCE_COLORS, RESOURCE_TEXT_COLORS } from './palette'
import type { Resource } from './palette'
import { bar } from './usage'
import type { Cell } from './usage'

/**
 * A meter small enough to share a row: the name (four cells and a space, more for a numbered `VRAM0`), the bar
 * in the resource's colour, then the number, `width` cells in all. The name and number are the lighter shade.
 */
export const compactMeter = (label: string, percent: number, width: number, resource: Resource): Cell[] => {
  const name = `${label.padEnd(4)} `
  const number = `${Math.round(percent)}%`.padStart(4)

  return [
    { text: name, color: RESOURCE_TEXT_COLORS[resource] },
    { text: bar(percent, Math.max(2, width - name.length - number.length)), color: RESOURCE_COLORS[resource] },
    { text: number, color: RESOURCE_TEXT_COLORS[resource] },
  ]
}

const RATE_WIDTH = 7

/**
 * A meter for a rate, `width` cells: an arrow, a bar full at `peakBps` and the rate. There is no fixed top
 * speed to measure against, so the scale is the highest seen.
 */
export const rateMeter = (arrow: string, bps: number, peakBps: number, width: number, resource: Resource): Cell[] => {
  const percent = peakBps > 0 ? (bps / peakBps) * 100 : 0

  return [
    { text: `${arrow} `, color: RESOURCE_TEXT_COLORS[resource] },
    { text: bar(percent, Math.max(2, width - 3 - RATE_WIDTH)), color: RESOURCE_COLORS[resource] },
    { text: ` ${formatRate(bps).padStart(RATE_WIDTH)}`, color: RESOURCE_TEXT_COLORS[resource] },
  ]
}
