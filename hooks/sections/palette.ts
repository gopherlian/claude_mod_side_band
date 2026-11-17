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
