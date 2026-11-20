import { expect, test } from 'claude-code/testing'

import { endAgent, newestDocument, parseTasks, startAgent, stepOf } from './harness'
import type { HarnessState } from './harness'

test('an SDD subagent is a step of eight, in order; a name outside the order has no number', () => {
  expect(stepOf('sdd-explore')).toEqual({ flow: 'SDD', name: 'explore', index: 1, of: 8 })
  expect(stepOf('sdd-apply')).toEqual({ flow: 'SDD', name: 'apply', index: 6, of: 8 })
  expect(stepOf('sdd-archive')).toMatchObject({ index: 8 })
  expect(stepOf('sdd-research')).toEqual({ flow: 'SDD', name: 'research' })
})

test('the judges, the fixer and the review lenses are steps of their own flows; other agents are none', () => {
  expect(stepOf('jd-judge-a')).toEqual({ flow: 'judgment day', name: 'judging' })
  expect(stepOf('jd-fix-agent')).toEqual({ flow: 'judgment day', name: 'fixing' })
  expect(stepOf('review-risk')).toEqual({ flow: 'review', name: 'risk' })
  expect(stepOf('Explore')).toBeUndefined()
})

test('an agent is running from its start to its end, and the step stays after it ends', () => {
  const idle: HarnessState = { running: [] }
  const busy = startAgent(startAgent(idle, 'sdd-spec', 'write the spec'), 'Explore', 'map the code')

  expect(busy.running.map(agent => agent.type)).toEqual(['sdd-spec', 'Explore'])
  expect(busy.step).toMatchObject({ name: 'spec' })

  const done = endAgent(busy, 'sdd-spec')
  expect(done.running).toEqual([{ type: 'Explore', description: 'map the code' }])
  expect(done.step).toMatchObject({ name: 'spec' })
  expect(endAgent(done, 'nobody')).toBe(done)
})

const DOC = `# Feature
Branch: main

## Specs
S1 "- [ ] not a task"

## Tasks
- [x] T1 S1 inline: first — commit: 17a6e0a
- [ ] T2 S2 inline: second — commit: pending
- [ ] T3 S3 delegated: third

## Log
- [ ] not a task either
`

test('the tasks of a feature document are counted, and the first open one is named without its commit', () => {
  expect(parseTasks(DOC)).toEqual({ done: 1, total: 3, next: 'T2 S2 inline: second' })
  expect(parseTasks('# nothing\n## Tasks\n\n## Log\n')).toBeUndefined()
  expect(parseTasks('- [ ] outside any section')).toBeUndefined()
  expect(parseTasks('## Tasks\n- [x] T1 done')).toEqual({ done: 1, total: 1, next: undefined })
})

test('the newest markdown file is the feature in hand', () => {
  expect(
    newestDocument([
      { name: 'old.md', kind: 'file', mtimeMs: 1 },
      { name: 'new.md', kind: 'file', mtimeMs: 9 },
      { name: 'newer.txt', kind: 'file', mtimeMs: 99 },
      { name: 'dir.md', kind: 'dir', mtimeMs: 99 },
    ]),
  ).toBe('new.md')
  expect(newestDocument([])).toBeUndefined()
})
