import type { GitStatus, Hardware, SystemStats } from '../monitor/types'
import type { Category } from '../sections/context'
import type { Line, UsageData } from '../sections/usage'
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
  /** This group's footnote is going to be drawn: point to it. Set by `arrange` alone. */
  noted?: boolean
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
  /**
   * A note for the foot of the band. It is drawn whole and only if the group
   * is shown and rows are left over, so it never takes the place of a widget.
   */
  footnote?: (ctx: GroupContext) => Line[]
}
