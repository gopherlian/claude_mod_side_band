// The containers: one bar each, grouped by the networks they share.
import type { Container } from '../monitor/types'
import { CPU_COLOR, GPU_COLOR } from './palette'
import { blank, softRule } from './usage'
import type { Cell, Line } from './usage'

/** A bar never gets shorter than this. */
const MIN_BAR = 2

/** The rule over a group of containers and the name of its network: a very faint blue, apart from the grey inner rules. */
export const NETWORK_COLOR = '#3d5a80'

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

/** What a container uses, in percent. A GPU that is not given is not drawn. */
export type Load = { cpu?: number; gpu?: number }

/**
 * One container: its name, dim and right-aligned, on a row of its own; under it
 * its CPU bar, in green, across the whole width and, when the container has a
 * GPU, a second bar of the same length in blue. Each is filled in proportion
 * to its percent.
 */
export const containerLines = (name: string, columns: number, load: Load = {}): Line[] => {
  const shown = name.slice(0, Math.max(0, columns))
  const width = Math.max(MIN_BAR, columns)
  const row = (cells: Cell[]): Line => ({ text: cells.map(cell => cell.text).join(''), cells })
  const title = ' '.repeat(Math.max(0, columns - shown.length)) + shown

  return [
    { text: title, dimColor: true },
    row(barCells(load.cpu, width, CPU_COLOR)),
    ...(load.gpu !== undefined ? [row(barCells(load.gpu, width, GPU_COLOR))] : []),
  ]
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

/** The networks of a group, in the order they come, each once, joined by ` · `; empty for containers with none. */
const networkNames = (group: Container[]): string =>
  [...new Set(group.flatMap(container => container.networks))].filter(Boolean).join(' · ')

/**
 * The rule over a group of containers, with the name of its network at the left (`── app ───────`), the whole of it
 * in a very faint blue; without a name, or where the name would not fit, a plain faint grey rule.
 */
export const networkRule = (name: string, columns: number): Line => {
  const shown = name.slice(0, Math.max(0, columns - 6))
  if (!shown) return softRule(columns)

  const head = `── ${shown} `
  const tail = '─'.repeat(Math.max(0, columns - head.length))

  return {
    text: head + tail,
    color: NETWORK_COLOR,
    cells: [{ text: head + tail, color: NETWORK_COLOR }],
  }
}

/**
 * The containers, at most `max`: each its name, its CPU bar and, for one that has a GPU, a GPU bar, a blank row between
 * two of a group and, where there is more than one group (a network each), over every group a faint rule that names
 * its network, after a blank row; and a count of those left out. `gpuUtil` is the
 * whole GPU's use: docker does not split it, so each container that asked for a GPU shows it.
 */
export const dockerLines = (containers: Container[], columns: number, max: number, gpuUtil?: number): Line[] => {
  const lines: Line[] = []
  let left = max

  const groups = groupByNetwork(containers)
  for (const group of groups) {
    if (left <= 0) break
    // With several groups, each opens with a rule that names its network, a blank row above all but the first.
    if (groups.length > 1) {
      if (lines.length > 0) lines.push(blank())
      lines.push(networkRule(networkNames(group), columns))
    }
    const shown = group.slice(0, left)
    shown.forEach((container, i) => {
      // A blank row sets each container apart from the one above it in its group.
      if (i > 0) lines.push(blank())
      lines.push(...containerLines(container.name, columns, { cpu: container.cpu, gpu: container.gpu ? gpuUtil : undefined }))
    })
    left -= shown.length
  }
  if (containers.length > max) lines.push({ text: `+${containers.length - max} more`, dimColor: true })

  return lines
}
