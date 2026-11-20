import type { Register } from 'claude-code'

import { formatClock } from './format'
import { demo } from './demo'
import { arrange, groups } from './groups'
import { arrangeStrip } from './groups/strip'
import type { GroupContext, SessionStats } from './groups/types'
import { PADDING_X, STRIP_PADDING_X, STRIP_ROWS, dockColumns, rowBudget } from './layout'
import { LIMITS_SYNC_MS, limitsPath, mergeLimits, parseLimits } from './limits'
import type { Limit } from './limits'
import { cpuUsage, parseStat } from './monitor/cpu'
import type { StatSnapshot } from './monitor/cpu'
import { creditLines } from './sections/credit'
import { NVIDIA_ARGS, NVIDIA_BINARIES, parseAmd, parseNvidia } from './monitor/gpu'
import { npuUtil } from './monitor/npu'
import {
  netRates,
  parseDf,
  parseDockerStats,
  parseDockers,
  parseGitStatus,
  parseGpuContainers,
  parseMeminfo,
  parseNetDev,
} from './monitor/system'
import type { NetTotals } from './monitor/system'
import type {
  CpuReading,
  GitStatus,
  GpuReading,
  Hardware,
  NpuReading,
  SystemStats,
} from './monitor/types'
import { isFresh, mergeShared, parseShared, sharedPath } from './shared'
import type { Shared } from './shared'
import { endAgent, newestDocument, parseTasks, startAgent } from './harness'
import type { HarnessState } from './harness'
import { trackTool } from './tools'
import { demoSeason } from './season'
import { PUBLISHED_MANIFEST_URL, UPDATE_EVERY_MS, checkForUpdate } from './update'
import type { UpdateState } from './update'
import type { WeatherState } from './widgets/types'
import { DEFAULT_PLACE, parseWeather, weatherUrl } from './widgets/weather'

const PANE = 'side-band'
const TITLE = 'Band'
const WEATHER_EVERY_MS = 10 * 60 * 1000
const DEFAULT_REFRESH_SECONDS = 5
const MIN_REFRESH_SECONDS = 1
const MAX_REFRESH_SECONDS = 300
const MAX_TIMER_MINUTES = 600
// Slow things (git, docker) are read every this many refresh intervals.
const SLOW_EVERY = 3
// A network bar is never scaled below this, so a trickle does not look full.
const NET_FLOOR_BPS = 1_048_576

export const register: Register = on => {
  let weather: WeatherState = { status: 'loading' }
  let hardware: Hardware | undefined
  let system: SystemStats = {}
  let git: GitStatus | undefined
  // The account's rate limits as every open band last shared them.
  let sharedLimits: Limit[] = []
  const stats: SessionStats = { toolCalls: 0, activeTools: 0 }
  /** The GentleAI harness: absent unless it is installed here, and then its group is not drawn. */
  let harness: HarnessState | undefined
  let refreshSeconds = DEFAULT_REFRESH_SECONDS
  // 0 makes the next one-second tick sample the machine at once.
  let lastSampleAt = 0
  let timerEndsAt: number | undefined
  let timerNotified = false
  /** While on, the band draws the demonstration's made-up readings; for this session only. */
  let isDemo = false
  /** Within the demonstration, whether the border of the frame walks through its decorations. */
  let isDressed = false
  /** Which version of the mod runs, and what became of a newer one; read at session start. */
  let update: UpdateState | undefined
  /** A check under way: another is not started over it, so a pull never runs twice at once. */
  let isLookingForUpdate = false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'band',
      description: 'Show or hide the side band; "refresh <seconds>", "timer <minutes>" and "demo" too',
    })
    // On by default; only an explicit /band hide is remembered. Opened through
    // our own command, so the engine stamps the window width on it: a plain
    // open would take the engine's default share, far wider than 1/12.
    if (!(await $.store.get('isHidden'))) {
      void $.command
        .run({ command: 'band', args: 'open' })
        .catch(() => $.ui.open({ id: PANE, title: TITLE }))
    }

    // The GentleAI group is drawn only where the harness is installed: its state file is there.
    try {
      const home = await $.env.get('HOME')
      if (home !== undefined) {
        await $.fs.stat(`${home}/.gentle-ai/state.json`)
        harness = { running: [] }
      }
    } catch {
      harness = undefined
    }

    const saved = Number(await $.store.get('refreshSeconds'))
    if (saved >= MIN_REFRESH_SECONDS && saved <= MAX_REFRESH_SECONDS) {
      refreshSeconds = Math.round(saved)
    }

    // What belongs to the machine is shared by the bands of every open session, in one file.
    const readShared = async (): Promise<Shared> => {
      try {
        const home = await $.env.get('HOME')

        return parseShared(home === undefined ? '' : await $.fs.read(sharedPath(home)))
      } catch {
        return parseShared('')
      }
    }
    const writeShared = async (patch: Partial<Shared>) => {
      try {
        const home = await $.env.get('HOME')
        if (home === undefined) return
        const current = await readShared()
        await $.fs.write(sharedPath(home), JSON.stringify(mergeShared(current, patch)))
      } catch {
        // The others keep what they have; this band keeps its own.
      }
    }
    // The latest weather any band fetched, if it is newer than this band's.
    const takeWeather = (shared: Shared) => {
      if (shared.weather?.status === 'ready' && (shared.weatherAt ?? 0) > weatherAt) {
        weather = shared.weather
        weatherAt = shared.weatherAt ?? 0
      }
    }

    const refresh = async () => {
      const now = await $.clock.now()
      takeWeather(await readShared())
      if (isFresh(weatherAt, now, WEATHER_EVERY_MS) && weather.status === 'ready') {
        $.ui.invalidate('ui.render')

        return
      }
      try {
        const got = await $.http.fetch(
          weatherUrl(DEFAULT_PLACE.lat, DEFAULT_PLACE.lon),
        )
        if (!got.ok) throw new Error(`weather HTTP ${got.status}`)
        weather = {
          status: 'ready',
          place: DEFAULT_PLACE.name,
          ...parseWeather(got.text),
        }
        weatherAt = now
        await writeShared({ weather, weatherAt })
      } catch (error) {
        weather = { status: 'error', message: String((error as Error).message) }
      }
      $.ui.invalidate('ui.render')
    }

    // What is remembered between samples: rates and utilization are changes.
    let previousStat: StatSnapshot | undefined
    let previousNet: { totals: NetTotals; at: number } | undefined
    const previousNpu = new Map<string, { busyUs: number; at: number }>()
    let nvidiaBinary: string | undefined
    let isSampling = false
    // When this band last read the repository of its folder, and when it last took the shared weather.
    let lastGitAt = 0
    let lastDocAt = 0
    let weatherAt = 0

    // Reads the machine. Whatever is not there is simply left out.
    const sample = async () => {
      if (isSampling) return
      isSampling = true
      try {
        const at = await $.clock.now()
        const shared = await readShared()
        takeWeather(shared)
        // Another band read the machine less than an interval ago: show that reading, do not take another.
        const isShared =
          isFresh(shared.at, at, refreshSeconds * 1000) && shared.hardware?.cpu !== undefined && shared.system !== undefined
        if (isShared) {
          hardware = shared.hardware
          system = shared.system ?? system
        } else {
          let cpu: CpuReading | undefined
          // The earlier readings the rates are changes between are the shared ones: whoever reads continues the others.
          if (shared.stat) previousStat = shared.stat
          if (shared.net) previousNet = shared.net
          for (const [name, reading] of Object.entries(shared.npu ?? {})) previousNpu.set(name, reading)
          const gpus: GpuReading[] = []
          const npus: NpuReading[] = []
          const nextSystem: SystemStats = { ...(shared.system ?? system) }

          try {
            const stat = await $.process.run(['cat', '/proc/stat'], { timeoutMs: 4000 })
            const current = parseStat(stat.stdout)
            if (current && previousStat) cpu = cpuUsage(previousStat, current)
            previousStat = current
          } catch {
            previousStat = undefined
          }

          for (const binary of nvidiaBinary ? [nvidiaBinary] : NVIDIA_BINARIES) {
            try {
              const smi = await $.process.run([binary, ...NVIDIA_ARGS], { timeoutMs: 4000 })
              const found = smi.exitCode === 0 ? parseNvidia(smi.stdout) : []
              if (found.length > 0) {
                nvidiaBinary = binary
                gpus.push(...found)
                break
              }
            } catch {
              // Not on this machine; try the next place.
            }
          }

          try {
            const cards = (await $.fs.list('/sys/class/drm')).filter(entry => /^card\d+$/.test(entry.name))
            for (const card of cards) {
              const dir = `/sys/class/drm/${card.name}/device`
              const busy = await $.process.run(['cat', `${dir}/gpu_busy_percent`], { timeoutMs: 2000 })
              if (busy.exitCode !== 0) continue
              const used = await $.process.run(['cat', `${dir}/mem_info_vram_used`], { timeoutMs: 2000 })
              const total = await $.process.run(['cat', `${dir}/mem_info_vram_total`], { timeoutMs: 2000 })
              const amd = parseAmd(`AMD GPU (${card.name})`, busy.stdout, used.stdout, total.stdout)
              if (amd) gpus.push(amd)
            }
          } catch {
            // No DRM devices to read.
          }

          try {
            const accels = (await $.fs.list('/sys/class/accel')).filter(entry => /^accel\d+$/.test(entry.name))
            for (const accel of accels) {
              const busy = await $.process.run(
                ['cat', `/sys/class/accel/${accel.name}/device/npu_busy_time_us`],
                { timeoutMs: 2000 },
              )
              const busyUs = Number(busy.stdout.trim())
              if (busy.exitCode !== 0 || Number.isNaN(busyUs)) continue
              const before = previousNpu.get(accel.name)
              previousNpu.set(accel.name, { busyUs, at })
              const util = npuUtil(before?.busyUs, busyUs, before ? at - before.at : 0)
              if (util !== undefined) npus.push({ name: accel.name, util })
            }
          } catch {
            // No NPU.
          }

          try {
            const memory = await $.process.run(['cat', '/proc/meminfo'], { timeoutMs: 2000 })
            const { ramPercent, swapPercent } = parseMeminfo(memory.stdout)
            nextSystem.ramPercent = ramPercent
            nextSystem.swapPercent = swapPercent
          } catch {
            nextSystem.ramPercent = undefined
            nextSystem.swapPercent = undefined
          }

          try {
            const disk = await $.process.run(['df', '-P', e.cwd], { timeoutMs: 3000 })
            nextSystem.diskPercent = disk.exitCode === 0 ? parseDf(disk.stdout) : undefined
          } catch {
            nextSystem.diskPercent = undefined
          }

          try {
            const totals = parseNetDev(
              (await $.process.run(['cat', '/proc/net/dev'], { timeoutMs: 2000 })).stdout,
            )
            const rates = previousNet ? netRates(previousNet.totals, totals, at - previousNet.at) : undefined
            previousNet = { totals, at }
            if (rates) {
              nextSystem.downBps = rates.down
              nextSystem.upBps = rates.up
              nextSystem.netPeakBps = Math.max(nextSystem.netPeakBps ?? NET_FLOOR_BPS, rates.down, rates.up)
            }
          } catch {
            previousNet = undefined
          }

          const isSlow = at - (shared.slowAt ?? 0) >= SLOW_EVERY * refreshSeconds * 1000 - 100
          if (isSlow) {
            try {
              const docker = await $.process.run(['docker', 'ps', '--format', '{{.Names}}\t{{.Networks}}'], {
                timeoutMs: 3000,
              })
              nextSystem.dockers = docker.exitCode === 0 ? parseDockers(docker.stdout) : undefined
              if (nextSystem.dockers && nextSystem.dockers.length > 0) {
                try {
                  const [stats, inspected] = await Promise.all([
                    $.process.run(['docker', 'stats', '--no-stream', '--format', '{{.Name}}\t{{.CPUPerc}}'], { timeoutMs: 8000 }),
                    $.process.run(
                      ['docker', 'inspect', '--format', '{{.Name}}\t{{len .HostConfig.DeviceRequests}}', ...nextSystem.dockers.map(c => c.name)],
                      { timeoutMs: 5000 },
                    ),
                  ])
                  const cpu = stats.exitCode === 0 ? parseDockerStats(stats.stdout) : new Map<string, number>()
                  const gpu = inspected.exitCode === 0 ? parseGpuContainers(inspected.stdout) : new Set<string>()
                  nextSystem.dockers = nextSystem.dockers.map(c => ({ ...c, cpu: cpu.get(c.name), gpu: gpu.has(c.name) }))
                } catch {
                  // The bars stay empty: the list itself is still right.
                }
              }
            } catch {
              nextSystem.dockers = undefined
            }
          }

          system = nextSystem
          hardware = { cpu, gpus, npus }
          await writeShared({
            at,
            hardware,
            system,
            stat: previousStat,
            net: previousNet,
            npu: Object.fromEntries(previousNpu),
            slowAt: isSlow ? at : shared.slowAt,
          })
        }

        // The repository is the one of this session's folder: read by each band for itself.
        if (at - lastGitAt >= SLOW_EVERY * refreshSeconds * 1000 - 100) {
          lastGitAt = at
          try {
            const status = await $.process.run(['git', 'status', '--porcelain=v1', '-b'], {
              cwd: e.cwd,
              timeoutMs: 5000,
            })
            git = status.exitCode === 0 ? parseGitStatus(status.stdout) : undefined
          } catch {
            git = undefined
          }
        }

        // The feature document in hand: the newest of the project's `odd/tasks`; read with the repository.
        if (harness && at - lastDocAt >= SLOW_EVERY * refreshSeconds * 1000 - 100) {
          lastDocAt = at
          try {
            const dir = `${e.cwd}/odd/tasks`
            const name = newestDocument(await $.fs.list(dir))
            harness = { ...harness, tasks: name ? parseTasks(await $.fs.read(`${dir}/${name}`)) : undefined }
          } catch {
            harness = { ...harness, tasks: undefined }
          }
        }

        try {
          const detail = await $.session.usage({ breakdown: 'summary' })
          const breakdown = detail.context.breakdown
          if (breakdown) {
            stats.model = breakdown.model
            stats.categories = breakdown.categories.map(category => ({
              name: category.name,
              tokens: category.tokens,
              kind: category.kind,
            }))
          }
        } catch {
          // Keep the last breakdown.
        }

      } finally {
        isSampling = false
      }
      $.ui.invalidate('ui.render')
    }

    const tick = async () => {
      const now = await $.clock.now()
      if (now - lastSampleAt >= refreshSeconds * 1000 - 100) {
        lastSampleAt = now
        await sample()
      }
      if (timerEndsAt !== undefined && !timerNotified && now >= timerEndsAt) {
        timerNotified = true
        $.ui.toast('Timer done')
      }
      $.ui.invalidate('ui.render')
    }

    // A session only learns the account's rate limits from its own answers, so
    // an idle one lags. Bands trade their figures through one file, and each
    // shows the highest reading of the current window.
    const syncLimits = async () => {
      try {
        const home = await $.env.get('HOME')
        if (home === undefined) return
        const path = limitsPath(home)
        const used = await $.session.usage()
        const now = await $.clock.now()
        let text = ''
        try {
          text = await $.fs.read(path)
        } catch {
          // No file yet: this band writes the first one.
        }
        sharedLimits = mergeLimits(used.rateLimits, parseLimits(text), now)
        const shared = JSON.stringify(sharedLimits)
        if (shared !== text) await $.fs.write(path, shared)
      } catch {
        // Keep the last shared figures.
      }
      $.ui.invalidate('ui.render')
    }

    // Looks for a newer version of the mod and installs it where it can (specs/update).
    const lookForUpdate = async () => {
      const home = (await $.env.get('HOME').catch(() => undefined)) ?? ''
      const root = $.plugin.root
      const found = await checkForUpdate({
        root,
        home,
        readLocal: () => $.fs.read(`${root}/.claude-plugin/plugin.json`),
        fetchPublished: async () => {
          const got = await $.http.fetch(PUBLISHED_MANIFEST_URL)
          if (!got.ok) throw new Error(`update HTTP ${got.status}`)

          return got.text
        },
        hasGit: () => $.fs.exists(`${root}/.git`),
        // Never a prompt on the terminal: git and ssh fail instead of asking for a password or a host key.
        run: async argv => {
          const done = await $.process.run(argv, {
            timeoutMs: 120_000,
            stdin: '',
            env: { GIT_TERMINAL_PROMPT: '0', GIT_SSH_COMMAND: 'ssh -o BatchMode=yes' },
          })

          return { exitCode: done.exitCode, stdout: done.stdout }
        },
        seen: state => {
          if (update === undefined) {
            update = state
            $.ui.invalidate('ui.render')
          }
        },
      })
      // Once installed, the new version waits for a reload: a later check, which reads it as current, keeps saying so.
      const isInstalled = update?.status === 'restart' || update?.status === 'reload'
      if (found && !isInstalled) update = found
      $.ui.invalidate('ui.render')
    }

    // Quiet: whatever fails leaves the band as it was.
    const lookQuietly = () => {
      if (isLookingForUpdate) return
      isLookingForUpdate = true
      void lookForUpdate()
        .catch(() => undefined)
        .finally(() => {
          isLookingForUpdate = false
        })
    }
    lookQuietly()
    $.clock.every(UPDATE_EVERY_MS, lookQuietly)
    void refresh()
    void syncLimits()
    $.clock.every(LIMITS_SYNC_MS, () => void syncLimits())
    $.clock.every(WEATHER_EVERY_MS, () => void refresh())
    // Two quick samples at the start, so the first CPU reading comes soon.
    void sample()
    $.clock.after(1000, () => void sample())
    $.clock.every(1000, () => void tick())

    return next(e)
  })

  // What the model is doing, for the session lines.
  on('prompt.submit', async ($, e, next) => {
    stats.turnStartedAt = await $.clock.now()

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (stats.turnStartedAt !== undefined) {
      stats.lastTurnMs = (await $.clock.now()) - stats.turnStartedAt
      stats.turnStartedAt = undefined
    }

    return next(e)
  })

  // The model and effort of the main conversation, as each request asks for them.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      stats.stepModel = e.model
      stats.effort = e.effort === undefined ? undefined : String(e.effort)
    }

    return yield* next(e)
  })

  // The agents the harness runs: which workflow step they belong to, and what each is doing.
  on('agent.spawn', async ($, e, next) => {
    if (harness) harness = startAgent(harness, e.subagentType, e.description)

    return next(e)
  })
  on('agent.report', async ($, e, next) => {
    if (harness) harness = endAgent(harness, e.subagentType)

    return next(e)
  })

  on('tool.call', async ($, e, next) => trackTool(stats, e.tool, () => next(e), await $.clock.now()))

  // `/band` toggles the band; `/band open` only shows it (what a new session
  // runs); `/band refresh <seconds>` sets how often the machine is read, live;
  // `/band timer <minutes>|off` runs a countdown. The dock takes its width in
  // absolute columns, so 1/12 of the window is asked for from the width the
  // engine stamps on the command, never from inside a render: each open draws
  // again. Hiding is remembered.
  on('command.run', { command: 'band' }, async ($, e) => {
    const args = (e.args ?? '').trim()

    if (args === 'open') {
      await $.ui.open({
        id: PANE,
        title: TITLE,
        columns: dockColumns(e.presentation?.columns ?? 100),
        rows: STRIP_ROWS,
      })

      return { text: '' }
    }

    // The demonstration: every element with made-up readings, drawn over the real ones and never shared.
    if (args === 'demo' || args === 'demo easter') {
      isDemo = !isDemo
      isDressed = isDemo && args === 'demo easter'
      if (isDemo) {
        await $.ui.open({ id: PANE, title: TITLE, columns: dockColumns(e.presentation?.columns ?? 100), rows: STRIP_ROWS })

        return { text: 'Demo on: the band shows made-up readings. /band demo turns it off.' }
      }

      return { text: 'Demo off: the band shows its real readings again.' }
    }

    if (args.startsWith('refresh')) {
      const wanted = args.slice('refresh'.length).trim()
      if (wanted === '') {
        return {
          text: `Monitor updates every ${refreshSeconds}s. Use /band refresh <${MIN_REFRESH_SECONDS}-${MAX_REFRESH_SECONDS}> to change it.`,
        }
      }
      const seconds = Number(wanted)
      if (!Number.isFinite(seconds) || seconds < MIN_REFRESH_SECONDS || seconds > MAX_REFRESH_SECONDS) {
        return {
          text: `"${wanted}" is not valid. Use a number of seconds from ${MIN_REFRESH_SECONDS} to ${MAX_REFRESH_SECONDS}.`,
        }
      }
      refreshSeconds = Math.round(seconds)
      lastSampleAt = 0
      await $.store.set('refreshSeconds', refreshSeconds)

      return { text: `Monitor now updates every ${refreshSeconds}s.` }
    }

    if (args.startsWith('timer')) {
      const wanted = args.slice('timer'.length).trim()
      const now = await $.clock.now()
      if (wanted === '') {
        return {
          text:
            timerEndsAt === undefined
              ? 'No timer running. Use /band timer <minutes>.'
              : `Timer: ${formatClock(timerEndsAt - now)} left.`,
        }
      }
      if (wanted === 'off') {
        timerEndsAt = undefined

        return { text: 'Timer cleared.' }
      }
      const minutes = Number(wanted)
      if (!Number.isFinite(minutes) || minutes <= 0 || minutes > MAX_TIMER_MINUTES) {
        return {
          text: `"${wanted}" is not valid. Use minutes from 1 to ${MAX_TIMER_MINUTES}, or off.`,
        }
      }
      timerEndsAt = now + minutes * 60_000
      timerNotified = false

      return { text: `Timer set for ${minutes} min.` }
    }

    const panes = await $.ui.panes()
    if (panes.some(pane => pane.id === PANE)) {
      await $.store.set('isHidden', true)
      await $.ui.close({ id: PANE })

      return { text: 'Side band hidden. /band shows it again.' }
    }

    await $.store.set('isHidden', false)
    await $.ui.open({
      id: PANE,
      title: TITLE,
      columns: dockColumns(e.presentation?.columns ?? 100),
      rows: STRIP_ROWS,
    })

    return { text: 'Side band shown. /band hides it.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    // Docked, the groups are stacked in a narrow column; anywhere else (inline above the prompt,
    // a widget) the pane is short and wide, so they stand side by side.
    const isStrip = e.props.placement !== 'dock'
    const columns = Math.max(1, e.props.bodyColumns - (isStrip ? STRIP_PADDING_X : PADDING_X) * 2)
    const rows = e.viewport?.rows ?? 24
    const now = await $.clock.now()

    let usage: GroupContext['usage']
    try {
      const used = await $.session.usage()
      usage = {
        contextTokens: used.context.tokens,
        contextWindow: used.context.window,
        contextPercent: used.context.percent,
        costUsd: used.cost?.usd,
        limits: mergeLimits(used.rateLimits, sharedLimits, now),
        startedAt: used.startedAt,
      }
    } catch {
      usage = undefined
    }

    const context = isDemo
      ? { now, columns, rows, update, ...demo(now), season: isDressed ? demoSeason(now).id : undefined }
      : { now, columns, rows, weather, usage, stats, hardware, system, git, timerEndsAt, update, harness }
    const budget = rowBudget(e.props.placement, e.props.scroll?.bodyRows, rows)
    const lines = isStrip
      ? arrangeStrip(context, budget, groups, creditLines(columns))
      : arrange(context, budget, groups, creditLines(columns))

    return (
      <Box flexDirection="column" paddingX={isStrip ? STRIP_PADDING_X : PADDING_X}>
        {lines.map(line => {
          const text = line.cells ? (
            <Box flexDirection="row">
              {line.cells.map(cell => (
                <Text color={cell.color} backgroundColor={cell.backgroundColor} dimColor={cell.dimColor}>
                  {cell.text}
                </Text>
              ))}
            </Box>
          ) : (
            <Text color={line.color} dimColor={line.dimColor}>
              {line.text}
            </Text>
          )

          return line.align === 'center' ? <Box justifyContent="center">{text}</Box> : text
        })}
      </Box>
    )
  })
}
