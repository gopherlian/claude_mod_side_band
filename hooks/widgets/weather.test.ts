import { expect, test } from 'claude-code/testing'

import { ICON_CELLS, iconForCode, parseWeather } from './weather'

test('every weather family has its own emoji and an unknown code has none', () => {
  expect(iconForCode(0)).toBe('☀')
  expect(iconForCode(2)).toBe('◐')
  expect(iconForCode(3)).toBe('☁')
  expect(iconForCode(45)).toBe('≋')
  expect(iconForCode(53)).toBe('☂')
  expect(iconForCode(63)).toBe('☂')
  expect(iconForCode(73)).toBe('❄')
  expect(iconForCode(81)).toBe('☂')
  expect(iconForCode(85)).toBe('❄')
  expect(iconForCode(95)).toBe('ϟ')
  expect(iconForCode(-1)).toBe('')
  expect(ICON_CELLS).toBe(1)
})

test('the parsed weather carries the icon of the current code beside its summary', () => {
  const body = JSON.stringify({
    current: {
      temperature_2m: 17,
      apparent_temperature: 16,
      relative_humidity_2m: 60,
      wind_speed_10m: 9,
      weather_code: 63,
    },
    daily: {},
  })
  const parsed = parseWeather(body)

  expect(parsed.summary).toBe('Rain')
  expect(parsed.icon).toBe('☂')
})
