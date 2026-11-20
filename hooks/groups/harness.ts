// The GentleAI harness: which step of its workflow the session is on, what is running, how far the feature has got.
// Shown only where the harness is installed.
import type { HarnessState, Step } from '../harness'
import { thinBar } from '../sections/stats'
import { wrap } from '../sections/wrap'
import type { Cell, Line } from '../sections/usage'
import type { Group, GroupContext } from './types'

const PIP_ON = '#4dd0e1'
const PIP_OFF = '#4a5568'
const TASKS_COLOR = '#68d391'
const LABEL_WIDTH = 6

const joined = (cells: Cell[], columns: number): Line => {
  const text = cells.map(cell => cell.text).join('')

  return text.length <= columns ? { text, cells } : { text: text.slice(0, columns), dimColor: true }
}

/** The step: pips filled up to its place in an ordered workflow, then `n/of` and its name; else the flow and the name. */
const stepRow = (step: Step, columns: number): Line => {
  const label: Cell = { text: 'Step'.padEnd(LABEL_WIDTH), dimColor: true }
  if (step.index === undefined || step.of === undefined) {
    return joined([label, { text: `${step.flow} · ${step.name}` }], columns)
  }

  return joined(
    [
      label,
      { text: '●'.repeat(step.index), color: PIP_ON },
      { text: '○'.repeat(step.of - step.index), color: PIP_OFF },
      { text: ` ${step.index}/${step.of} ${step.name}` },
    ],
    columns,
  )
}

/** The text of `Now` over as many rows as it takes: the first after the label, the rest under the text. */
const wrapped = (marker: Cell, text: string, tail: string, columns: number, dim: boolean): Line[] => {
  const indent = LABEL_WIDTH + marker.text.length
  const parts = wrap(text, Math.max(1, columns - indent))
  const last = parts.length - 1

  return parts.map((part, i) =>
    joined(
      [
        i === 0 ? { text: 'Now'.padEnd(LABEL_WIDTH), dimColor: true } : { text: ' '.repeat(LABEL_WIDTH) },
        i === 0 ? marker : { text: ' '.repeat(marker.text.length) },
        { text: part, dimColor: dim },
        ...(i === last && tail ? [{ text: tail, dimColor: true }] : []),
      ],
      columns,
    ),
  )
}

/** What is running now, whole over as many rows as it needs: the oldest agent's task, `+N` for the others. Else the
 * next task, else `idle`. */
const nowRows = (state: HarnessState, columns: number): Line[] => {
  const [first] = state.running
  if (first) {
    const many = state.running.length > 1 ? ` +${state.running.length - 1}` : ''

    return wrapped({ text: '▸ ', color: PIP_ON }, first.description || first.type, many, columns, false)
  }
  const next = state.tasks?.next
  if (next) return wrapped({ text: '· ', dimColor: true }, next, '', columns, true)

  return [joined([{ text: 'Now'.padEnd(LABEL_WIDTH), dimColor: true }, { text: 'idle', dimColor: true }], columns)]
}

/** The feature document's checklist: a bar and `done/total`. */
const tasksRow = (state: HarnessState, columns: number): Line[] => {
  const { tasks } = state
  if (!tasks) return []

  const count = ` ${tasks.done}/${tasks.total}`
  const width = columns - LABEL_WIDTH - count.length
  const { fill, track } = thinBar(tasks.done / tasks.total, width)

  return [
    joined(
      [
        { text: 'Tasks'.padEnd(LABEL_WIDTH), dimColor: true },
        ...(width >= 4 ? [{ text: fill, color: TASKS_COLOR }, { text: track, color: PIP_OFF }] : []),
        { text: count },
      ],
      columns,
    ),
  ]
}

const rows = (ctx: GroupContext): Line[] => {
  const { harness } = ctx
  if (!harness) return []

  return [...(harness.step ? [stepRow(harness.step, ctx.columns)] : []), ...nowRows(harness, ctx.columns), ...tasksRow(harness, ctx.columns)]
}

export const harness: Group = {
  id: 'harness',
  label: 'GentleAI',
  priority: 4,
  lines: rows,
  strip: { min: 28, max: 40, lines: ctx => rows(ctx).slice(0, ctx.budget ?? Number.POSITIVE_INFINITY) },
}
