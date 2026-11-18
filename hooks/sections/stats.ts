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
