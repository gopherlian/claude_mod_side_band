import { expect, test } from 'claude-code/testing'

import { demo } from './demo'
import { arrange, groups } from './groups'
import { groupByNetwork } from './sections/docker'

const NOW = Date.parse('2026-11-16T10:00:00Z')

test('the demonstration fills every group, with a container on the GPU and two networks', () => {
  const d = demo(NOW)
  const texts = arrange({ now: NOW, columns: 28, rows: 60, ...d }, 500).map(line => line.text)

  expect(texts.filter(text => text.startsWith('━━ ')).map(text => text.split(' ')[1])).toEqual(['Claude', 'GentleAI', 'Project', 'System'])
  expect(d.system.dockers!.filter(container => container.gpu).map(container => container.name)).toEqual(['model-service'])
  expect(groupByNetwork(d.system.dockers!)).toHaveLength(2)
  for (const words of [/Context 265k/, /^Session /, /^Weekly /, /^▣ GPU /, /^▤ VRAM /, /^⇄ Swap /, /^↓ Down  /, /^docker · 3/, /^⧗ Timer /]) {
    expect(texts.some(text => words.test(text))).toBe(true)
  }
})

test('the readings move each second but stay percents, and the timer always has time left', () => {
  for (let second = 0; second < 120; second++) {
    const now = NOW + second * 1000
    const d = demo(now)
    const percents = [d.hardware!.cpu!.total, d.hardware!.gpus[0]!.util, d.system.ramPercent!, d.system.dockers![0]!.cpu!]

    for (const percent of percents) expect(percent >= 0 && percent <= 100).toBe(true)
    expect(d.system.downBps!).toBeGreaterThan(0)
    expect(d.timerEndsAt!).toBeGreaterThan(now)
    expect(d.stats.toolTimes!.every(at => at <= now && at > now - 10 * 60_000)).toBe(true)
  }
  expect(demo(NOW + 2000).hardware!.cpu!.total).not.toBe(demo(NOW).hardware!.cpu!.total)
})
