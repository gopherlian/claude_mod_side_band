// What fills the context window, drawn: a run of colour per consumer, then the reserve, then the free track.
import { formatTokens } from './usage'
import type { Cell } from './usage'

/** One row of the breakdown the session reports. `deferred` rows are tools loaded on demand: outside the window. */
export type Category = { name: string; tokens: number; kind?: 'used' | 'free' | 'buffer' | 'deferred' }

export type Role = 'messages' | 'system' | 'mcp' | 'other'

/** The order the runs are drawn in, so a colour keeps its place from one second to the next. */
const ROLES: Role[] = ['messages', 'system', 'mcp', 'other']

/** Muted like the system bars; orange is left out, it is the colour of the separators. */
export const ROLE_COLORS: Record<Role, string> = {
  messages: '#2b6cb0',
  system: '#6b21a8',
  mcp: '#0f766e',
  other: '#8a6d0b',
}

/** The compaction reserve: what the window keeps back before the session compacts itself. */
export const BUFFER_COLOR = '#64748b'

const ROLE_NAMES: Record<Role, string> = { messages: 'msgs', system: 'sys', mcp: 'mcp', other: 'other' }

/** Which run a consumer belongs to, told by its name. */
export const roleOf = (name: string): Role => {
  const lower = name.toLowerCase()
  if (lower.startsWith('message')) return 'messages'
  if (lower.startsWith('system')) return 'system'
  if (lower.includes('mcp')) return 'mcp'

  return 'other'
}

type Key = Role | 'buffer' | 'free'
type Share = { key: Key; tokens: number }

/** The runs of the window in drawing order, with their tokens; consumers of one role are added together. */
const shares = (categories: Category[] | undefined): Share[] => {
  const inWindow = (categories ?? []).filter(category => category.kind !== 'deferred' && category.tokens > 0)
  const sum = (pick: (category: Category) => boolean) =>
    inWindow.filter(pick).reduce((total, category) => total + category.tokens, 0)

  return [
    ...ROLES.map(role => ({
      key: role,
      tokens: sum(category => (category.kind ?? 'used') === 'used' && roleOf(category.name) === role),
    })),
    { key: 'buffer' as const, tokens: sum(category => category.kind === 'buffer') },
    { key: 'free' as const, tokens: sum(category => category.kind === 'free') },
  ].filter(share => share.tokens > 0)
}

/** Cells for each share of `width`: in proportion, at least one for every share, summing to `width`. */
const allocate = (parts: Share[], width: number): number[] => {
  const total = parts.reduce((sum, part) => sum + part.tokens, 0)
  const exact = parts.map(part => (part.tokens / total) * width)
  const cells = exact.map(Math.floor)
  const order = exact.map((value, i) => ({ i, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest)
  const give = (i: number, by: number) => {
    cells[i] = (cells[i] ?? 0) + by
  }
  for (let left = width - cells.reduce((sum, n) => sum + n, 0), at = 0; left > 0; left--, at++) {
    give(order[at % order.length]?.i ?? 0, 1)
  }
  cells.forEach((count, i) => {
    if (count > 0) return
    give(cells.indexOf(Math.max(...cells)), -1)
    give(i, 1)
  })

  return cells
}

/**
 * The context bar as runs of one colour each, `width` cells in all, or nothing
 * where the session reported no breakdown. Consumers are blocks, the reserve is
 * hatched and the free space is the empty track.
 */
export const compositionCells = (categories: Category[] | undefined, width: number): Cell[] | undefined => {
  const parts = shares(categories)
  if (parts.length === 0 || width < parts.length) return undefined

  const counts = allocate(parts, width)

  return parts.map(({ key }, i): Cell => {
    const count = counts[i] ?? 0

    return key === 'free'
      ? { text: '░'.repeat(count) }
      : key === 'buffer'
        ? { text: '▒'.repeat(count), color: BUFFER_COLOR }
        : { text: '█'.repeat(count), color: ROLE_COLORS[key] }
  })
}

const LEGEND_GAP = '  '
const LEGEND_ROWS = 2

/**
 * Up to two rows that name the runs of the bar: a square in the run's colour,
 * its short name and its tokens, largest first. What does not fit is left out.
 */
export const compositionLegend = (categories: Category[] | undefined, columns: number): Cell[][] => {
  const items = shares(categories)
    .filter((share): share is Share & { key: Role | 'buffer' } => share.key !== 'free')
    .sort((a, b) => b.tokens - a.tokens)
    .map(share => {
      const words = ` ${share.key === 'buffer' ? 'buffer' : ROLE_NAMES[share.key]} ${formatTokens(share.tokens)}`

      return {
        width: 1 + words.length,
        cells: [
          share.key === 'buffer' ? { text: '▒', color: BUFFER_COLOR } : { text: '■', color: ROLE_COLORS[share.key] },
          { text: words, dimColor: true },
        ] as Cell[],
      }
    })

  const rows: { width: number; cells: Cell[] }[] = []
  for (const item of items) {
    const fits = (row: { width: number }) => row.width + LEGEND_GAP.length + item.width <= columns
    const row = rows.find(fits)
    if (row) {
      row.cells.push({ text: LEGEND_GAP }, ...item.cells)
      row.width += LEGEND_GAP.length + item.width
    } else if (rows.length < LEGEND_ROWS && item.width <= columns) {
      rows.push({ width: item.width, cells: [...item.cells] })
    }
  }

  return rows.map(row => row.cells)
}
