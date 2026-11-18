// Muted, darker colours: this section is read at a glance, not meant to shine.
// One colour per resource, so a bar is told apart by its colour as well as its label.
// CPU and GPU keep the green and blue of the container bars. Orange is left out: it is
// the colour of the separators and the frame.

export const CPU_COLOR = '#2f855a'
export const GPU_COLOR = '#2b6cb0'

export const RESOURCE_COLORS = {
  cpu: CPU_COLOR,
  gpu: GPU_COLOR,
  vram: '#0e7490',
  npu: '#4c51bf',
  ram: '#6b21a8',
  swap: '#8a6d0b',
  disk: '#0f766e',
  down: '#4d7c0f',
  up: '#64748b',
} as const

export type Resource = keyof typeof RESOURCE_COLORS

/** The same hues, lighter: the name and the number of a bar, so they read well beside its darker fill. */
export const RESOURCE_TEXT_COLORS: Record<Resource, string> = {
  cpu: '#68d391',
  gpu: '#63b3ed',
  vram: '#4dd0e1',
  npu: '#9aa5ff',
  ram: '#c084fc',
  swap: '#e0b83a',
  disk: '#5eead4',
  down: '#bef264',
  up: '#a0aec0',
}


/**
 * One icon per resource, drawn before its name: a one-cell text symbol, never
 * one Unicode counts as an emoji (a terminal may draw those two cells wide,
 * over the name). It takes the resource's lighter colour, as the name does.
 */
export const RESOURCE_ICONS: Record<Resource, string> = {
  cpu: '▦',
  gpu: '▣',
  vram: '▤',
  npu: '◈',
  ram: '≡',
  swap: '⇄',
  disk: '◉',
  down: '↓',
  up: '↑',
}
