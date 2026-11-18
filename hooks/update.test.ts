import { expect, test } from 'claude-code/testing'

import { checkForUpdate, isNewer, marketplaceOf, readVersion, versionLine } from './update'
import type { UpdatePorts } from './update'

const ROOT = '/home/u/.claude/mods/side-band'
const HOME = '/home/u'
const manifest = (version: string) => JSON.stringify({ name: 'side-band', version })

/** A machine where every port answers as told and every command run is recorded. */
const ports = (over: Partial<UpdatePorts> & { local?: string; published?: string; git?: Record<string, string> } = {}) => {
  const ran: string[][] = []
  const git = { 'rev-parse --abbrev-ref HEAD': 'main\n', 'status --porcelain': '', ...over.git }
  const machine: UpdatePorts = {
    root: ROOT,
    home: HOME,
    readLocal: async () => manifest(over.local ?? '1.2.3'),
    fetchPublished: async () => manifest(over.published ?? '1.2.3'),
    hasGit: async () => true,
    run: async argv => {
      ran.push(argv)
      if (argv[0] === 'git') return { exitCode: 0, stdout: git[argv.slice(3).join(' ')] ?? '' }

      return { exitCode: 0, stdout: '' }
    },
    ...over,
  }

  return { machine, ran }
}

test('a version is newer when its major.minor.patch is higher, number by number', () => {
  expect(isNewer('1.2.10', '1.2.3')).toBe(true)
  expect(isNewer('2.0.0', '1.9.9')).toBe(true)
  expect(isNewer('1.2.3', '1.2.3')).toBe(false)
  expect(isNewer('1.2.3', '1.3.0')).toBe(false)
  expect(isNewer('nonsense', '1.2.3')).toBe(false)
})

test('the version is read from the manifest, and nothing from a text that is not one', () => {
  expect(readVersion(manifest('1.2.3'))).toBe('1.2.3')
  expect(readVersion('{"name":"side-band"}')).toBeUndefined()
  expect(readVersion('not json')).toBeUndefined()
})

test('a marketplace install is told by its folder under the plugins cache', () => {
  expect(marketplaceOf('/home/u/.claude/plugins/cache/claude-mod-side-band/side-band/1.2.3', HOME)).toBe('claude-mod-side-band')
  expect(marketplaceOf(ROOT, HOME)).toBeUndefined()
})

test('with nothing newer published, nothing is installed and the version that runs is shown', async () => {
  const { machine, ran } = ports({ published: '1.2.3' })

  expect(await checkForUpdate(machine)).toEqual({ status: 'current', version: '1.2.3' })
  expect(ran).toEqual([])
})

test('a working copy ahead of the repository is left alone', async () => {
  const { machine, ran } = ports({ local: '1.3.0', published: '1.2.3' })

  expect(await checkForUpdate(machine)).toEqual({ status: 'current', version: '1.3.0' })
  expect(ran).toEqual([])
})

test('a clean working copy on main pulls, fast-forward only, and asks for a restart', async () => {
  const { machine, ran } = ports({ published: '1.2.4' })
  machine.readLocal = async () => manifest(ran.some(argv => argv.includes('pull')) ? '1.2.4' : '1.2.3')

  expect(await checkForUpdate(machine)).toEqual({ status: 'restart', version: '1.2.3', latest: '1.2.4' })
  expect(ran.at(-1)).toEqual(['git', '-C', ROOT, 'pull', '--ff-only'])
})

test('a working copy with changes, or on another branch, installs nothing and says a version is out', async () => {
  const dirty = ports({ published: '1.2.4', git: { 'status --porcelain': ' M hooks/register.tsx\n' } })
  const branch = ports({ published: '1.2.4', git: { 'rev-parse --abbrev-ref HEAD': 'feature\n' } })

  expect(await checkForUpdate(dirty.machine)).toEqual({ status: 'available', version: '1.2.3', latest: '1.2.4' })
  expect(dirty.ran.some(argv => argv.includes('pull'))).toBe(false)
  expect(await checkForUpdate(branch.machine)).toEqual({ status: 'available', version: '1.2.3', latest: '1.2.4' })
  expect(branch.ran.some(argv => argv.includes('pull'))).toBe(false)
})

test('a marketplace install updates through claude and asks for /reload-plugins', async () => {
  const root = '/home/u/.claude/plugins/cache/claude-mod-side-band/side-band/1.2.3'
  const { machine, ran } = ports({ root, published: '1.2.4', hasGit: async () => false })

  expect(await checkForUpdate(machine)).toEqual({ status: 'reload', version: '1.2.3', latest: '1.2.4' })
  expect(ran).toEqual([['claude', 'plugin', 'update', 'side-band@claude-mod-side-band']])
})

test('an install that is neither a working copy nor a marketplace one only says a version is out', async () => {
  const { machine, ran } = ports({ root: '/opt/side-band', published: '1.2.4', hasGit: async () => false })

  expect(await checkForUpdate(machine)).toEqual({ status: 'available', version: '1.2.3', latest: '1.2.4' })
  expect(ran).toEqual([])
})

test('a command that fails installs nothing and says a version is out', async () => {
  const { machine } = ports({
    published: '1.2.4',
    run: async argv => ({ exitCode: argv.includes('pull') ? 1 : 0, stdout: argv.includes('rev-parse') ? 'main\n' : '' }),
  })

  expect(await checkForUpdate(machine)).toEqual({ status: 'available', version: '1.2.3', latest: '1.2.4' })
})

test('a version another band already installed is not installed again', async () => {
  let reads = 0
  const { machine, ran } = ports({ published: '1.2.4', readLocal: async () => manifest(reads++ === 0 ? '1.2.3' : '1.2.4') })

  expect(await checkForUpdate(machine)).toEqual({ status: 'current', version: '1.2.4' })
  expect(ran.some(argv => argv.includes('pull'))).toBe(false)
})

test('a failed check is quiet: the version that runs is shown', async () => {
  const offline = ports({ fetchPublished: async () => Promise.reject(new Error('offline')) })
  const broken = ports({ fetchPublished: async () => 'Not Found' })

  expect(await checkForUpdate(offline.machine)).toEqual({ status: 'current', version: '1.2.3' })
  expect(await checkForUpdate(broken.machine)).toEqual({ status: 'current', version: '1.2.3' })
})

test('the version row is right-aligned: dim when current, green when a reload is due, yellow when only out', () => {
  expect(versionLine({ status: 'current', version: '1.2.3' }, 30)).toEqual({ text: ' '.repeat(24) + 'v1.2.3', dimColor: true })
  expect(versionLine({ status: 'restart', version: '1.2.3', latest: '1.2.4' }, 30)).toEqual({
    text: ' '.repeat(15) + 'v1.2.4: restart',
    color: 'green',
  })
  expect(versionLine({ status: 'reload', version: '1.2.3', latest: '1.2.4' }, 30)).toEqual({
    text: ' '.repeat(7) + 'v1.2.4: /reload-plugins',
    color: 'green',
  })
  expect(versionLine({ status: 'available', version: '1.2.3', latest: '1.2.4' }, 30)).toEqual({
    text: ' '.repeat(14) + 'v1.2.4 available',
    color: 'yellow',
  })
})

test('where the message does not fit, the version alone is drawn', () => {
  expect(versionLine({ status: 'reload', version: '1.2.3', latest: '1.2.4' }, 20)).toEqual({
    text: ' '.repeat(14) + 'v1.2.4',
    color: 'green',
  })
})

test('the version that runs is told before the published one is fetched', async () => {
  const seen: unknown[] = []
  let seenWhenFetched: unknown[] | undefined
  const { machine } = ports({
    fetchPublished: async () => {
      seenWhenFetched = [...seen]

      return manifest('1.2.3')
    },
    seen: state => seen.push(state),
  })

  await checkForUpdate(machine)
  expect(seenWhenFetched).toEqual([{ status: 'current', version: '1.2.3' }])
})

test('a pull that does not bring the new version says it is out, not that a restart would load it', async () => {
  const { machine } = ports({ published: '1.2.4' })

  // The working copy still reads 1.2.3 after its pull: it tracks another upstream.
  expect(await checkForUpdate({ ...machine, readLocal: async () => manifest('1.2.3') })).toEqual({
    status: 'available',
    version: '1.2.3',
    latest: '1.2.4',
  })
})
