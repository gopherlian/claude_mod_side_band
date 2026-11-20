// Small graphics for the Claude group: the model's name, the effort as pips, the tool calls as a chart.
import type { Cell } from './usage'

const MODEL_ID = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{6,8})?$/

/** `claude-sonnet-5-5` is `Sonnet 5.5`; a name that is not an id is left as it is. */
export const modelName = (model: string): string => {
  const found = MODEL_ID.exec(model)
  if (!found) return model
  const [, family = '', major = '', minor] = found

  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${minor === undefined ? major : `${major}.${minor}`}`
}

const EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max']
const PIP_ON = '#4dd0e1'
const PIP_OFF = '#4a5568'

/** The effort as five pips filled up to its level, then its word; an unknown level is only the word. */
export const effortCells = (effort: string): Cell[] => {
  const level = EFFORT_LEVELS.indexOf(effort) + 1
  if (level === 0) return [{ text: effort, dimColor: true }]

  return [
    { text: '●'.repeat(level), color: PIP_ON },
    ...(level < EFFORT_LEVELS.length ? [{ text: '○'.repeat(EFFORT_LEVELS.length - level), color: PIP_OFF }] : []),
    { text: ` ${effort}`, dimColor: true },
  ]
}

/** How far back the tool chart looks. */
export const SPARK_SPAN_MS = 10 * 60_000

const LEVELS = '▂▃▄▅▆▇█'

/**
 * The tool calls of the last ten minutes as `width` cells, the oldest on the
 * left: `·` where nothing ran, a taller bar the busier the slice was, scaled to
 * the busiest one.
 */
export const toolSpark = (times: number[], now: number, width: number): string => {
  if (width < 1) return ''
  const slice = SPARK_SPAN_MS / width
  const counts = Array<number>(width).fill(0)
  for (const at of times) {
    const age = now - at
    if (age < 0 || age >= SPARK_SPAN_MS) continue
    const slot = width - 1 - Math.floor(age / slice)
    counts[slot] = (counts[slot] ?? 0) + 1
  }
  const busiest = Math.max(...counts)

  return counts
    .map(count => (count === 0 ? '·' : LEVELS.charAt(Math.min(LEVELS.length - 1, Math.ceil((count / busiest) * LEVELS.length) - 1))))
    .join('')
}

/** `mcp__server__mem_save` is `mem_save`: the tool's own name without the server in front of it. */
export const shortToolName = (tool: string): string => (tool.startsWith('mcp__') ? (tool.split('__').pop() ?? tool) : tool)

/** The tools used this session, the most used first, ties by name; the same short name adds up. */
export const toolRanking = (counts: Record<string, number>): { name: string; count: number }[] => {
  const merged = new Map<string, number>()
  for (const [tool, count] of Object.entries(counts)) {
    merged.set(shortToolName(tool), (merged.get(shortToolName(tool)) ?? 0) + count)
  }

  return [...merged]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** The dots of a braille cell by column, bottom dot first. */
const DOTS = [
  [0x40, 0x04, 0x02, 0x01],
  [0x80, 0x20, 0x10, 0x08],
]

/**
 * The tool calls of the last ten minutes as a braille chart `rows` rows tall and `width` cells wide, top row first,
 * the oldest on the left. A cell holds two slices side by side and four dots of height, so the chart is fine-grained:
 * a slice is as tall as its calls next to the busiest slice, filled from the bottom; a quiet one is a baseline dot.
 */
export const toolBraille = (times: number[], now: number, width: number, rows: number): string[] => {
  if (width < 1 || rows < 1) return []
  const slices = width * 2
  const slice = SPARK_SPAN_MS / slices
  const counts = Array<number>(slices).fill(0)
  for (const at of times) {
    const age = now - at
    if (age < 0 || age >= SPARK_SPAN_MS) continue
    const slot = slices - 1 - Math.floor(age / slice)
    counts[slot] = (counts[slot] ?? 0) + 1
  }
  const busiest = Math.max(...counts)
  const heights = counts.map(count => (count === 0 ? 0 : Math.max(1, Math.round((count / busiest) * rows * 4))))

  return Array.from({ length: rows }, (_, row) => {
    const below = (rows - 1 - row) * 4

    return Array.from({ length: width }, (_, cell) => {
      let mask = 0
      for (const side of [0, 1]) {
        const height = heights[cell * 2 + side] ?? 0
        const lit = height === 0 ? (row === rows - 1 ? 1 : 0) : Math.min(4, Math.max(0, height - below))
        for (let dot = 0; dot < lit; dot += 1) mask |= DOTS[side]?.[dot] ?? 0
      }

      return String.fromCharCode(0x2800 + mask)
    }).join('')
  })
}

/** A thin bar `width` cells long: heavy line where it is full, light line where it is not, a half step between. */
export const thinBar = (fraction: number, width: number): { fill: string; track: string } => {
  const halves = Math.round(Math.min(1, Math.max(0, fraction)) * width * 2)
  const full = Math.floor(halves / 2)
  const half = halves % 2 === 1

  return { fill: '━'.repeat(full) + (half ? '╸' : ''), track: '─'.repeat(Math.max(0, width - full - (half ? 1 : 0))) }
}

/** Whether any tool call falls in the last ten minutes: with none, the chart has nothing to show. */
export const hasRecentCalls = (times: number[], now: number): boolean =>
  times.some(at => now - at >= 0 && now - at < SPARK_SPAN_MS)
