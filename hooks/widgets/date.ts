import type { Widget, WidgetContext } from './types'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export const formatDate = (ms: number): string => {
  const d = new Date(ms)

  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export const date: Widget = {
  id: 'date',
  chunks: ({ now }: WidgetContext) => [{ text: formatDate(now), rank: 4 }],
}
