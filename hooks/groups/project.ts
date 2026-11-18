// Project and work: where the repository stands. Hidden outside a repository.
import type { Line } from '../sections/usage'
import type { Group, GroupContext } from './types'

/** The branch and its state; `join` goes between the parts of the state. */
const rows = (ctx: GroupContext, join: string): Line[] => {
  const git = ctx.git
  if (!git) return []

  const state = [
    git.changed > 0 ? `${git.changed} changed` : 'clean',
    git.ahead > 0 ? `↑${git.ahead}` : '',
    git.behind > 0 ? `↓${git.behind}` : '',
  ].filter(Boolean)

  return [
    { text: git.branch.slice(0, ctx.columns) },
    { text: state.join(join).slice(0, ctx.columns), dimColor: true },
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
