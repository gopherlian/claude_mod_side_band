// The containers: a group of their own, after the machine. Hidden where docker is not available.
import { dockerLines } from '../sections/docker'
import type { Line } from '../sections/usage'
import type { Group, GroupContext } from './types'

/** Containers drawn as bars; the rest are counted. */
const MAX_DOCKERS = 5

const rows = (ctx: GroupContext): Line[] => {
  const { dockers } = ctx.system
  if (dockers === undefined) return []

  const gpus = ctx.hardware?.gpus ?? []
  const gpuUtil = gpus.length > 0 ? Math.max(...gpus.map(gpu => gpu.util)) : undefined

  return [
    { text: dockers.length === 0 ? 'none running' : `${dockers.length} running`, dimColor: true },
    ...dockerLines(dockers, ctx.columns, MAX_DOCKERS, gpuUtil),
  ]
}

// No compact form: in the strip the System column counts the containers.
export const docker: Group = {
  id: 'docker',
  label: 'Docker',
  priority: 5,
  lines: rows,
}
