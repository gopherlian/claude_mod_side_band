// What the band knows of the GentleAI harness: which step of its workflow the session is on, what is running, and how
// far the feature document has got. Everything here is a plain function of what the engine reports.

/** The steps of the SDD workflow, in order. */
export const SDD_STEPS = ['explore', 'propose', 'spec', 'design', 'tasks', 'apply', 'verify', 'archive']

/** A step of a workflow; `index` (1-based) and `of` only for a workflow that has an order. */
export type Step = { flow: string; name: string; index?: number; of?: number }

/** What the harness is doing, as far as the engine tells. */
export type HarnessState = {
  /** Subagents running now, oldest first. */
  running: { type: string; description: string }[]
  /** The step of the last subagent that belonged to a known workflow. */
  step?: Step
  /** The checklist of the project's feature document. */
  tasks?: { done: number; total: number; next?: string }
}

/** The step a subagent type belongs to; none for a type outside the harness's workflows. */
export const stepOf = (subagentType: string): Step | undefined => {
  const sdd = /^sdd-(.+)$/.exec(subagentType)
  if (sdd) {
    const name = sdd[1] ?? ''
    const at = SDD_STEPS.indexOf(name)

    return at < 0 ? { flow: 'SDD', name } : { flow: 'SDD', name, index: at + 1, of: SDD_STEPS.length }
  }
  if (/^jd-judge/.test(subagentType)) return { flow: 'judgment day', name: 'judging' }
  if (subagentType === 'jd-fix-agent') return { flow: 'judgment day', name: 'fixing' }
  const review = /^review-(.+)$/.exec(subagentType)
  if (review) return { flow: 'review', name: review[1] ?? '' }

  return undefined
}

/** A subagent starts: it is listed as running and, if it belongs to a workflow, sets the step. */
export const startAgent = (state: HarnessState, type: string, description: string): HarnessState => ({
  ...state,
  running: [...state.running, { type, description }],
  step: stepOf(type) ?? state.step,
})

/** A subagent ends: the oldest one of its type stops being listed. */
export const endAgent = (state: HarnessState, type: string): HarnessState => {
  const at = state.running.findIndex(agent => agent.type === type)

  return at < 0 ? state : { ...state, running: state.running.filter((_, i) => i !== at) }
}

/** The checkboxes under `## Tasks` of a feature document: how many are done, and the first that is not. */
export const parseTasks = (text: string): HarnessState['tasks'] => {
  const section = /^## Tasks\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text)?.[1] ?? ''
  const items = [...section.matchAll(/^\s*- \[( |x|X)\] (.+)$/gm)]
  if (items.length === 0) return undefined

  const open = items.find(item => item[1] === ' ')

  return {
    done: items.filter(item => item[1] !== ' ').length,
    total: items.length,
    next: open?.[2]?.replace(/\s+—\s+commit:.*$/, '').trim(),
  }
}

/** The newest feature document among the entries of `odd/tasks`. */
export const newestDocument = (entries: { name: string; kind: string; mtimeMs: number }[]): string | undefined =>
  entries
    .filter(entry => entry.kind === 'file' && entry.name.endsWith('.md'))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.name
