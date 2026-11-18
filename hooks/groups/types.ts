import type { GitStatus, Hardware, SystemStats } from '../monitor/types'
import type { Category } from '../sections/context'
import type { Line, UsageData } from '../sections/usage'
import type { UpdateState } from '../update'
import type { WeatherState } from '../widgets/types'

/** What the mod itself observes about the Claude session. */
export type SessionStats = {
  toolCalls: number
  /** Tool calls open right now; they can overlap. */
  activeTools: number
  /** The latest tool started, while any call is open. */
  runningTool?: string
  turnStartedAt?: number
  lastTurnMs?: number
  model?: string
  /** Model id of the last request, when the display name is not known. */
  stepModel?: string
  effort?: string
  /** What fills the context window, as the session reports it. */
  categories?: Category[]
  /** When each tool call of the last ten minutes started, oldest first; the tools chart is drawn from them. */
  toolTimes?: number[]
}

/** Everything a group may draw from; each group reads only its own part. */
export type GroupContext = {
  now: number
  /** Cells across the content, padding excluded. */
  columns: number
  /** Rows of the whole screen. */
  rows: number
  weather: WeatherState
  usage?: UsageData
  stats: SessionStats
  hardware?: Hardware
  system: SystemStats
  git?: GitStatus
  /** When the countdown ends, in `$.clock.now()` milliseconds. */
  timerEndsAt?: number
  /** Which version of the mod runs, and what became of a newer one; absent until it is read. */
  update?: UpdateState
  /** In the strip: the rows this column may fill, its title not counted. Absent where the band is stacked. */
  budget?: number
}

/** The compact form of a group, for the strip: a column that is `min` to `max` cells wide. */
export type Strip = {
  min: number
  max: number
  /**
   * The rows of the column, `ctx.columns` wide and at most `ctx.budget` tall, most important first, so that
   * cutting at the bottom always leaves something whole.
   */
  lines: (ctx: GroupContext) => Line[]
}

/**
 * A theme of the band. `priority` says what goes first when rows run short:
 * the highest number is dropped first, whole.
 */
export type Group = {
  id: string
  /** Names the section on the rule above it; none for the first group. */
  label?: string
  priority: number
  lines: (ctx: GroupContext) => Line[]
  /** What the blank row above the group's rule carries in the stacked band; blank where it gives nothing. */
  heading?: (ctx: GroupContext) => Line | undefined
  /** How the group draws as a column of the strip; a group without it is left out of the strip. */
  strip?: Strip
}
