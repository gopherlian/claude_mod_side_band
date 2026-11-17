import { clock } from './clock'
import { date } from './date'
import type { Widget } from './types'
import { weather } from './weather'

/** Display order, left to right and top to bottom. Add a widget by appending. */
export const widgets: Widget[] = [weather, clock, date]
