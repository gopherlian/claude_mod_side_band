/** Utilization is always a percentage, 0 to 100. */
export type CpuReading = { total: number; cores: number[] }

export type GpuReading = {
  name: string
  util: number
  memUsedMb?: number
  memTotalMb?: number
  temp?: number
}

export type NpuReading = { name: string; util: number }

/** What the monitor knows; an empty list or a missing cpu means "not detected". */
export type Hardware = {
  cpu?: CpuReading
  gpus: GpuReading[]
  npus: NpuReading[]
}

/** The rest of the machine; a missing field means "not detected". */
export type SystemStats = {
  ramPercent?: number
  swapPercent?: number
  diskPercent?: number
  downBps?: number
  upBps?: number
  /** Highest rate seen, in bytes per second: what a full network bar means. */
  netPeakBps?: number
  /** The running containers; undefined when docker is not there. */
  dockers?: Container[]
}

/** A running container and the networks it is on. */
export type Container = {
  name: string
  networks: string[]
  /** CPU use of the container, in percent; undefined until docker reports it. */
  cpu?: number
  /** True when the container asked docker for a GPU. */
  gpu?: boolean
}

export type GitStatus = {
  branch: string
  changed: number
  ahead: number
  behind: number
}
