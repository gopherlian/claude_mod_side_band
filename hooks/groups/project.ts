// Project and work: where the repository stands. Hidden outside a repository.
import type { Line } from '../sections/usage'
import type { Group, GroupContext } from './types'

export const project: Group = {
  id: 'project',
  label: 'Project',
  priority: 2,
  lines: (ctx: GroupContext): Line[] => {
    const git = ctx.git
    if (!git) return []

    const state = [
      git.changed > 0 ? `${git.changed} changed` : 'clean',
      git.ahead > 0 ? `↑${git.ahead}` : '',
      git.behind > 0 ? `↓${git.behind}` : '',
    ].filter(Boolean)

    return [
      { text: git.branch.slice(0, ctx.columns) },
      { text: state.join(' · ').slice(0, ctx.columns), dimColor: true },
    ]
  },
}
