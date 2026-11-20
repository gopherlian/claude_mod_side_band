// Project and work: where the repository stands. Hidden outside a repository.
import type { Line } from '../sections/usage'
import { flushRight, wrap, wrapParts } from '../sections/wrap'
import type { Group, GroupContext } from './types'

/** The branch and its state, which sits at the right edge; `join` goes between the parts of the state. */
const rows = (ctx: GroupContext, join: string): Line[] => {
  const git = ctx.git
  if (!git) return []

  const state = [
    git.changed > 0 ? `${git.changed} changed` : 'clean',
    git.ahead > 0 ? `↑${git.ahead}` : '',
    git.behind > 0 ? `↓${git.behind}` : '',
  ].filter(Boolean)

  // In the strip the column keeps its height, so a row is cut there; stacked, what does not fit goes on further rows.
  if (ctx.budget !== undefined) {
    return [{ text: git.branch.slice(0, ctx.columns) }, { text: flushRight(state.join(join).slice(0, ctx.columns), ctx.columns), dimColor: true }]
  }

  return [
    ...wrap(git.branch, ctx.columns).map((text): Line => ({ text })),
    ...wrapParts(state, ctx.columns).map((text): Line => ({ text: flushRight(text, ctx.columns), dimColor: true })),
  ]
}

export const project: Group = {
  id: 'project',
  label: 'Project',
  priority: 2,
  lines: ctx => rows(ctx, ' · '),
  // In the strip the column is 12 cells: `3 changed ↑2` fits, with the dots it would not.
  strip: { min: 12, max: 24, lines: ctx => rows(ctx, ' ') },
}
