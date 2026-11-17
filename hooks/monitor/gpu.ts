import type { GpuReading } from './types'

/** Arguments of nvidia-smi giving one CSV line per GPU. */
export const NVIDIA_ARGS = [
  '--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu',
  '--format=csv,noheader,nounits',
]

/** Where nvidia-smi may be: on the PATH, or where WSL puts it. */
export const NVIDIA_BINARIES = ['nvidia-smi', '/usr/lib/wsl/lib/nvidia-smi']

const number = (text: string | undefined): number | undefined => {
  const value = Number(text?.trim())

  return text === undefined || text.trim() === '' || Number.isNaN(value) ? undefined : value
}

export const parseNvidia = (text: string): GpuReading[] =>
  text
    .split('\n')
    .map(line => line.split(',').map(part => part.trim()))
    .filter(parts => parts.length >= 5 && number(parts[1]) !== undefined)
    .map(parts => ({
      name: parts[0],
      util: number(parts[1])!,
      memUsedMb: number(parts[2]),
      memTotalMb: number(parts[3]),
      temp: number(parts[4]),
    }))

/** An AMD card as its sysfs files report it (memory in bytes). */
export const parseAmd = (
  name: string,
  busy: string,
  usedBytes?: string,
  totalBytes?: string,
): GpuReading | undefined => {
  const util = number(busy)
  if (util === undefined) return undefined
  const used = number(usedBytes)
  const total = number(totalBytes)

  return {
    name,
    util,
    memUsedMb: used === undefined ? undefined : used / 1048576,
    memTotalMb: total === undefined ? undefined : total / 1048576,
  }
}
