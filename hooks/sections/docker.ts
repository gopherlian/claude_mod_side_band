// The containers: one bar each, grouped by the networks they share.
import type { Container } from '../monitor/types'
import { CPU_COLOR, GPU_COLOR } from './palette'
import { softRule } from './usage'
import type { Cell, Line } from './usage'

/** A bar never gets shorter than this; the name gives way first. */
const MIN_BAR = 2

/** What is left of a bar that is not filled. */
const TRACK_COLOR = '#3c3c3c'

/** Half cells of `width` a percent fills: at least one when there is any load, never more than the bar. */
const halvesOf = (percent: number | undefined, width: number): number =>
  !percent || percent <= 0 ? 0 : Math.min(width * 2, Math.max(1, Math.round((percent / 100) * width * 2)))

/** A bar of `width` cells for `percent`: `▬` in `color`, a `╸` for a half cell, then the thin track. */
const barCells = (percent: number | undefined, width: number, color: string): Cell[] => {
  const halves = halvesOf(percent, width)
  const full = Math.floor(halves / 2)
  const half = halves % 2 === 1

  return [
    { text: '▬'.repeat(full) + (half ? '╸' : ''), color },
    { text: '─'.repeat(width - full - (half ? 1 : 0)), color: TRACK_COLOR },
  ].filter(cell => cell.text !== '')
}

/** What a container uses, in percent. A missing value draws an empty bar. */
export type Load = { cpu?: number; gpu?: number }

/**
 * One container: two bars that take what the name leaves of the width, then the
 * name. The first is the CPU, in green, the second the GPU, in blue, each filled
 * in proportion to its percent. A width too short for two bars is the CPU alone.
 */
export const containerLine = (name: string, columns: number, load: Load = {}): Line => {
  const shown = name.slice(0, Math.max(0, columns - MIN_BAR - 1))
  const width = Math.max(MIN_BAR, columns - shown.length - 1)
  const two = width >= 2 * MIN_BAR + 1
  const cpuWidth = two ? Math.floor((width - 1) / 2) : width

  const cells: Cell[] = barCells(load.cpu, cpuWidth, CPU_COLOR)
  if (two) cells.push({ text: ' ' }, ...barCells(load.gpu, width - 1 - cpuWidth, GPU_COLOR))
  cells.push({ text: ` ${shown}` })
  const text = cells.map(cell => cell.text).join('')

  return { text: text.slice(0, columns), cells }
}

/**
 * Containers that share a network, directly or through another container on
 * two networks, go in one group. Groups and the containers in them keep the
 * order docker listed them in. One without a network joins the others like it.
 */
export const groupByNetwork = (containers: Container[]): Container[][] => {
  const parent = new Map<string, string>()
  const find = (network: string): string => {
    const up = parent.get(network) ?? network
    if (up === network) return network
    const root = find(up)
    parent.set(network, root)

    return root
  }
  const networksOf = (container: Container): string[] => (container.networks.length > 0 ? container.networks : [''])

  for (const container of containers) {
    const [head, ...rest] = networksOf(container)
    for (const network of rest) parent.set(find(network), find(head))
  }

  const groups = new Map<string, Container[]>()
  for (const container of containers) {
    const key = find(networksOf(container)[0])
    groups.set(key, [...(groups.get(key) ?? []), container])
  }

  return [...groups.values()]
}

/**
 * The bars of the containers, at most `max` of them, a faint rule between
 * groups of different networks and a count of those left out. `gpuUtil` is the
 * whole GPU's use: docker does not split it, so each container that asked for a
 * GPU shows it. Where every
 * container shares a network there is no separator at all.
 */
export const dockerLines = (containers: Container[], columns: number, max: number, gpuUtil?: number): Line[] => {
  const lines: Line[] = []
  let left = max

  for (const group of groupByNetwork(containers)) {
    if (left <= 0) break
    if (lines.length > 0) lines.push(softRule(columns))
    const shown = group.slice(0, left)
    for (const container of shown) {
      lines.push(containerLine(container.name, columns, { cpu: container.cpu, gpu: container.gpu ? gpuUtil : undefined }))
    }
    left -= shown.length
  }
  if (containers.length > max) lines.push({ text: `+${containers.length - max} more`, dimColor: true })

  return lines
}
