import type { Line } from './sections/usage'

/** Where the published version of the mod is read. */
export const PUBLISHED_MANIFEST_URL =
  'https://raw.githubusercontent.com/gopherlian/claude_mod_side_band/main/.claude-plugin/plugin.json'

/** How often the mod looks for a newer version of itself, after the look at session start. */
export const UPDATE_EVERY_MS = 6 * 60 * 60 * 1000

/** The plugin's name, as `claude plugin update` knows it. */
const PLUGIN = 'side-band'

/**
 * Which version runs, and what became of a newer one: `current` (none, or the
 * check failed), `restart` (pulled into a working copy), `reload` (updated
 * through the marketplace) or `available` (out, but not installed).
 */
export type UpdateState =
  | { status: 'current'; version: string }
  | { status: 'restart' | 'reload' | 'available'; version: string; latest: string }

/** What the check needs from the host; each one may throw, and a throw is "no answer". */
export type UpdatePorts = {
  /** The mod's folder, the one holding `.claude-plugin/plugin.json`. */
  root: string
  home: string
  /** The text of the mod's own `plugin.json`. */
  readLocal: () => Promise<string>
  /** The text of the published `plugin.json`. */
  fetchPublished: () => Promise<string>
  /** Whether the mod's folder holds `.git`. */
  hasGit: () => Promise<boolean>
  /** Runs a command by its argument vector and answers its exit code and output. */
  run: (argv: string[]) => Promise<{ exitCode: number; stdout: string }>
  /** Told the version that runs as soon as it is read, before the published one is fetched. */
  seen?: (state: UpdateState) => void
}

/** The `version` of a `plugin.json` text; nothing where the text is not one. */
export const readVersion = (text: string): string | undefined => {
  try {
    const { version } = JSON.parse(text) as { version?: unknown }

    return typeof version === 'string' ? version : undefined
  } catch {
    return undefined
  }
}

const parts = (version: string): number[] | undefined => {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version)

  return match ? match.slice(1, 4).map(Number) : undefined
}

/** Whether `latest` is a higher `major.minor.patch` than `current`, number by number. */
export const isNewer = (latest: string, current: string): boolean => {
  const a = parts(latest)
  const b = parts(current)
  if (!a || !b) return false
  const at = a.findIndex((n, i) => n !== b[i])

  return at >= 0 && a[at]! > b[at]!
}

/** The marketplace a mod installed from one is read from: its folder is under the plugins cache. */
export const marketplaceOf = (root: string, home: string): string | undefined => {
  const prefix = `${home}/.claude/plugins/cache/`
  if (!root.startsWith(prefix)) return undefined
  const name = root.slice(prefix.length).split('/')[0]

  return name ? name : undefined
}

const attempt = async <T>(work: () => Promise<T>): Promise<T | undefined> => {
  try {
    return await work()
  } catch {
    return undefined
  }
}

/** Installs `latest` as the mod was installed; answers what became of it. */
const install = async (ports: UpdatePorts, latest: string): Promise<'restart' | 'reload' | 'available'> => {
  const ok = async (argv: string[]) => (await attempt(() => ports.run(argv)))?.exitCode === 0

  const market = marketplaceOf(ports.root, ports.home)
  if (market !== undefined) {
    return (await ok(['claude', 'plugin', 'update', `${PLUGIN}@${market}`])) ? 'reload' : 'available'
  }

  if (!(await attempt(ports.hasGit))) return 'available'
  const git = (args: string[]) => attempt(() => ports.run(['git', '-C', ports.root, ...args]))
  const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD'])
  const changes = await git(['status', '--porcelain'])
  const isClean = changes?.exitCode === 0 && changes.stdout.trim() === ''
  if (branch?.exitCode !== 0 || branch.stdout.trim() !== 'main' || !isClean) return 'available'

  if (!(await ok(['git', '-C', ports.root, 'pull', '--ff-only']))) return 'available'
  // A pull that did not bring it (the copy tracks another upstream) would never load it, restart or not.
  const pulled = readVersion((await attempt(ports.readLocal)) ?? '')

  return pulled !== undefined && !isNewer(latest, pulled) ? 'restart' : 'available'
}

/**
 * Looks for a newer published version and installs it where the mod can.
 * Quiet: a failed read, fetch or command leaves the version that runs.
 */
export const checkForUpdate = async (ports: UpdatePorts): Promise<UpdateState | undefined> => {
  const local = async () => readVersion((await attempt(ports.readLocal)) ?? '')
  const version = await local()
  if (version === undefined) return undefined
  ports.seen?.({ status: 'current', version })
  const latest = readVersion((await attempt(ports.fetchPublished)) ?? '')
  if (latest === undefined || !isNewer(latest, version)) return { status: 'current', version }

  // A band of another session may have installed it meanwhile.
  const now = await local()
  if (now !== undefined && !isNewer(latest, now)) return { status: 'current', version: now }

  return { status: await install(ports, latest), version, latest }
}

const MESSAGE: Record<Exclude<UpdateState['status'], 'current'>, (latest: string) => string> = {
  restart: latest => `v${latest}: restart`,
  reload: latest => `v${latest}: /reload-plugins`,
  available: latest => `v${latest} available`,
}

/**
 * The row above the Claude rule: the version, right-aligned. Dim when it is
 * the one that runs; green when a newer one waits for a reload; yellow when it
 * is out but not installed. Where the message does not fit, the version alone.
 */
export const versionLine = (state: UpdateState, columns: number): Line => {
  const shown = state.status === 'current' ? state.version : state.latest
  const message = state.status === 'current' ? `v${shown}` : MESSAGE[state.status](shown)
  const text = message.length <= columns ? message : `v${shown}`
  const padded = text.padStart(columns)

  if (state.status === 'current') return { text: padded, dimColor: true }

  return { text: padded, color: state.status === 'available' ? 'yellow' : 'green' }
}
