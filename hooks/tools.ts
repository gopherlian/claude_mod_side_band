import type { SessionStats } from './groups/types'

/**
 * Runs one tool call and keeps the session stats about it. Calls can overlap,
 * so a counter says how many are open and the running tool is cleared only
 * when the last one ends, whichever order they end in.
 */
export const trackTool = async <T>(stats: SessionStats, tool: string, run: () => Promise<T>): Promise<T> => {
  stats.toolCalls += 1
  stats.activeTools += 1
  stats.runningTool = tool
  try {
    return await run()
  } finally {
    stats.activeTools -= 1
    if (stats.activeTools === 0) stats.runningTool = undefined
  }
}
