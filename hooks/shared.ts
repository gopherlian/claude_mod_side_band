// What the bands of all open sessions share about the machine: one reading of it and the weather, in one file.
import type { StatSnapshot } from './monitor/cpu'
import type { NetTotals } from './monitor/system'
import type { Hardware, SystemStats } from './monitor/types'
import type { WeatherState } from './widgets/types'

/** Bumped when the shape changes: a file of another version is ignored. */
export const SHARED_VERSION = 1

export type Shared = {
  v: typeof SHARED_VERSION
  /** When the machine was last read, in `$.clock.now()` milliseconds. */
  at?: number
  hardware?: Hardware
  system?: SystemStats
  /** The raw readings the rates are changes between, so whichever band reads continues the others' figures. */
  stat?: StatSnapshot
  net?: { totals: NetTotals; at: number }
  npu?: Record<string, { busyUs: number; at: number }>
  /** When the slow readings (containers) were last taken. */
  slowAt?: number
  weather?: WeatherState
  /** When the weather was last fetched. */
  weatherAt?: number
}

/** The file the bands share, next to the shared plan limits. */
export const sharedPath = (home: string): string => `${home}/.claude/side-band-state.json`

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** Reads the shared file's text; anything unreadable, or of another version, is "nothing shared". */
export const parseShared = (text: string): Shared => {
  try {
    const parsed: unknown = JSON.parse(text)
    if (!isObject(parsed) || parsed.v !== SHARED_VERSION) return { v: SHARED_VERSION }
    const read: Shared = { v: SHARED_VERSION }
    if (isNumber(parsed.at)) read.at = parsed.at
    if (isObject(parsed.hardware)) read.hardware = parsed.hardware as unknown as Hardware
    if (isObject(parsed.system)) read.system = parsed.system as SystemStats
    if (isObject(parsed.stat)) read.stat = parsed.stat as unknown as StatSnapshot
    if (isObject(parsed.net)) read.net = parsed.net as unknown as Shared['net']
    if (isObject(parsed.npu)) read.npu = parsed.npu as unknown as Shared['npu']
    if (isNumber(parsed.slowAt)) read.slowAt = parsed.slowAt
    if (isObject(parsed.weather)) read.weather = parsed.weather as unknown as WeatherState
    if (isNumber(parsed.weatherAt)) read.weatherAt = parsed.weatherAt

    return read
  } catch {
    return { v: SHARED_VERSION }
  }
}

/** A reading taken at `at` is fresh while it is younger than `everyMs`; one from the future is not. */
export const isFresh = (at: number | undefined, now: number, everyMs: number): boolean =>
  at !== undefined && now >= at && now - at < everyMs

/** `current` with what this band has to say put over it; what it leaves undefined stays as it was. */
export const mergeShared = (current: Shared, patch: Partial<Shared>): Shared => {
  const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined))

  return { ...current, ...defined, v: SHARED_VERSION }
}
