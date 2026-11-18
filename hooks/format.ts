const pad = (n: number) => String(n).padStart(2, '0')

/** `3d04h`, `1h23m`, `12m`, `42s`: the two biggest units that matter. */
export const formatDuration = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (days > 0) return `${days}d${pad(hours)}h`
  if (hours > 0) return `${hours}h${pad(minutes)}m`
  if (minutes > 0) return `${minutes}m`

  return `${total % 60}s`
}

/** `3d4h`, `1h23m`, `2h`, `12m`, `42s`: what is left, as short as it can be (two units at most, none empty). */
export const formatLeft = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (days > 0) return hours > 0 ? `${days}d${hours}h` : `${days}d`
  if (hours > 0) return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`
  if (minutes > 0) return `${minutes}m`

  return `${total % 60}s`
}

/** `m:ss`, for a running turn or a countdown. */
export const formatClock = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000))

  return `${Math.floor(total / 60)}:${pad(total % 60)}`
}

export const formatRate = (bytesPerSecond: number): string =>
  bytesPerSecond >= 1048576
    ? `${(bytesPerSecond / 1048576).toFixed(1)}M/s`
    : bytesPerSecond >= 1024
      ? `${Math.round(bytesPerSecond / 1024)}K/s`
      : `${Math.round(bytesPerSecond)}B/s`
