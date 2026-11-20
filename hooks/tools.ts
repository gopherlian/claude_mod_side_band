import type { SessionStats } from './groups/types'
import { SPARK_SPAN_MS } from './sections/stats'

/**
 * Runs one tool call and keeps the session stats about it. Calls can overlap,
 * so a counter says how many are open and the running tool is cleared only
 * when the last one ends, whichever order they end in. Given the time it
 * started, the call is also kept for the chart of the last ten minutes.
 */
export const trackTool = async <T>(
  stats: SessionStats,
  tool: string,
  run: () => Promise<T>,
  at?: number,
): Promise<T> => {
  stats.toolCalls += 1
  stats.toolCounts = { ...stats.toolCounts, [tool]: (stats.toolCounts?.[tool] ?? 0) + 1 }
  if (at !== undefined) {
    stats.toolTimes = [...(stats.toolTimes ?? []).filter(time => at - time < SPARK_SPAN_MS), at]
  }
  stats.activeTools += 1
  stats.runningTool = tool
  try {
    return await run()
  } finally {
    stats.activeTools -= 1
    if (stats.activeTools === 0) stats.runningTool = undefined
  }
}
