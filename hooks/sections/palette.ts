// One colour per resource, so a bar is told apart by its colour as well as its label.
// CPU and GPU keep the green and blue of the container bars. Orange is left out: it is
// the colour of the separators and the frame.

export const CPU_COLOR = 'green'
export const GPU_COLOR = 'blue'

export const RESOURCE_COLORS = {
  cpu: CPU_COLOR,
  gpu: GPU_COLOR,
  vram: 'cyan',
  npu: '#818cf8',
  ram: '#7e22ce',
  swap: '#ca8a04',
  disk: '#2dd4bf',
  down: '#a3e635',
  up: '#94a3b8',
} as const

export type Resource = keyof typeof RESOURCE_COLORS
