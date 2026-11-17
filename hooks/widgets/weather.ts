import type { Widget, WidgetContext } from './types'

export const weatherUrl = (lat: number, lon: number): string =>
  'https://api.open-meteo.com/v1/forecast' +
  `?latitude=${lat}&longitude=${lon}` +
  '&current=temperature_2m,apparent_temperature,relative_humidity_2m,' +
  'wind_speed_10m,weather_code&timezone=auto&forecast_days=1' +
  '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,' +
  'uv_index_max,sunrise,sunset'

/** WMO weather interpretation codes, as Open-Meteo reports them. */
export const describeCode = (code: number): string => {
  if (code === 0) return 'Clear'
  if (code <= 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if (code >= 61 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Showers'
  if (code === 85 || code === 86) return 'Snow showers'
  if (code >= 95) return 'Storm'

  return 'Unknown'
}

/** Cells an icon takes on screen: one, so no terminal can misalign the rows. */
export const ICON_CELLS = 1

/** A one-cell text symbol (no emoji, no variation selector) for the WMO codes, '' when unknown. */
export const iconForCode = (code: number): string => {
  if (code === 0) return '☀'
  if (code === 1 || code === 2) return '◐'
  if (code === 3) return '☁'
  if (code === 45 || code === 48) return '≋'
  if (code >= 51 && code <= 67) return '☂'
  if (code >= 71 && code <= 77) return '❄'
  if (code >= 80 && code <= 82) return '☂'
  if (code === 85 || code === 86) return '❄'
  if (code >= 95) return 'ϟ'

  return ''
}

export type Place ={ name: string; lat: number; lon: number }

/**
 * Where the weather is for. Fixed for now: locating by IP is not precise
 * enough (it put the machine in another city), so how to decide is open.
 */
export const DEFAULT_PLACE: Place = { name: 'Valencia', lat: 39.4699, lon: -0.3763 }

const first = (values: unknown): number | undefined =>
  Array.isArray(values) && typeof values[0] === 'number' ? values[0] : undefined

const hhmm = (values: unknown): string | undefined =>
  Array.isArray(values) && typeof values[0] === 'string' ? values[0].slice(11, 16) : undefined

/** Parses the answer of `weatherUrl` into the fields the band shows. */
export const parseWeather = (text: string) => {
  const data = JSON.parse(text)
  const current = data.current
  const daily = data.daily ?? {}

  return {
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    wind: current.wind_speed_10m,
    summary: describeCode(current.weather_code),
    icon: iconForCode(current.weather_code),
    forecast: {
      max: first(daily.temperature_2m_max),
      min: first(daily.temperature_2m_min),
      rainPercent: first(daily.precipitation_probability_max),
      uv: first(daily.uv_index_max),
      sunrise: hhmm(daily.sunrise),
      sunset: hhmm(daily.sunset),
    },
  }
}

export const weather: Widget = {
  id: 'weather',
  chunks: ({ weather: w }: WidgetContext) => {
    if (w.status === 'loading') return [{ text: 'weather…', rank: 1 }]
    if (w.status === 'error') return [{ text: 'no weather', rank: 1 }]

    const temperature = `${Math.round(w.temperature ?? 0)}°C`

    return [
      { text: temperature, rank: 0 },
      { text: w.summary ?? '', rank: 1 },
      { text: w.place ?? '', rank: 2 },
      { text: `feels ${Math.round(w.feelsLike ?? 0)}°`, rank: 5 },
      { text: `${w.humidity}%`, rank: 6 },
      { text: `${Math.round(w.wind ?? 0)} km/h`, rank: 7 },
    ]
  },
}
