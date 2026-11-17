export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

/** How often every band shares its rate limits with the others. */
export const LIMITS_SYNC_MS = 8_000

/** The file the bands share, under the user's Claude Code directory. */
export const limitsPath = (home: string): string => `${home}/.claude/side-band-limits.json`

const endOf = (limit: Limit): number => {
  const at = limit.resetsAt === undefined ? Number.NaN : Date.parse(limit.resetsAt)

  return Number.isFinite(at) ? at : 0
}

const isLimit = (value: unknown): value is Limit => {
  if (typeof value !== 'object' || value === null) return false
  const { kind, percentUsed, resetsAt } = value as Record<string, unknown>

  return (
    typeof kind === 'string' &&
    typeof percentUsed === 'number' &&
    Number.isFinite(percentUsed) &&
    (resetsAt === undefined || typeof resetsAt === 'string')
  )
}

/** Reads the shared file's text; anything unreadable is "nothing shared". */
export const parseLimits = (text: string): Limit[] => {
  try {
    const parsed: unknown = JSON.parse(text)

    return Array.isArray(parsed) ? parsed.filter(isLimit) : []
  } catch {
    return []
  }
}

/**
 * One reading per window, from this session's limits and the shared ones.
 * A window already over is dropped. Of two readings of one window the higher
 * wins, because usage only grows until the window resets and a session that
 * has been idle holds an older, lower figure. A later reset means a new window,
 * which beats the old one whatever its figure.
 */
export const mergeLimits = (own: Limit[], shared: Limit[], now: number): Limit[] => {
  const best = new Map<string, Limit>()
  for (const limit of [...own, ...shared]) {
    if (limit.resetsAt !== undefined && endOf(limit) > 0 && endOf(limit) <= now) continue
    const held = best.get(limit.kind)
    if (
      held === undefined ||
      endOf(limit) > endOf(held) ||
      (endOf(limit) === endOf(held) && limit.percentUsed > held.percentUsed)
    ) {
      best.set(limit.kind, limit)
    }
  }
  const order = new Map(own.map((limit, index) => [limit.kind, index]))

  return [...best.values()].sort(
    (a, b) => (order.get(a.kind) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.kind) ?? Number.MAX_SAFE_INTEGER),
  )
}
