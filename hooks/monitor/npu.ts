/**
 * Utilization of an NPU from its cumulative busy time (Intel's
 * `npu_busy_time_us`) between two samples; undefined with no earlier sample.
 */
export const npuUtil = (
  previousBusyUs: number | undefined,
  busyUs: number,
  elapsedMs: number,
): number | undefined => {
  if (previousBusyUs === undefined || elapsedMs <= 0) return undefined

  return Math.min(100, Math.max(0, ((busyUs - previousBusyUs) / (elapsedMs * 1000)) * 100))
}
