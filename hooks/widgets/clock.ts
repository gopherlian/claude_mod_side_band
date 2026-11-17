import type { Widget, WidgetContext } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

export const formatShortTime = (ms: number): string => {
  const d = new Date(ms)

  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const formatTime = (ms: number): string => {
  const d = new Date(ms)

  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const clock: Widget = {
  id: 'clock',
  chunks: ({ now }: WidgetContext) => [
    { text: formatTime(now), rank: 3, big: formatShortTime(now) },
  ],
}
