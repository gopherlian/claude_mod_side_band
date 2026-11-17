/** Today's outlook. */
export type Forecast = {
  max?: number
  min?: number
  rainPercent?: number
  uv?: number
  sunrise?: string
  sunset?: string
}

/** Weather as the band knows it right now. */
export type WeatherState = {
  status: 'loading' | 'ready' | 'error'
  place?: string
  temperature?: number
  feelsLike?: number
  humidity?: number
  wind?: number
  summary?: string
  /** A colour emoji for `summary`; led onto the outlook row. */
  icon?: string
  message?: string
  forecast?: Forecast
}

/** What every widget of the band receives when it is drawn. */
export type WidgetContext = {
  /** Epoch milliseconds, from `$.clock.now()`. */
  now: number
  weather: WeatherState
}

/**
 * A short piece of text a widget offers. When the band is short of room it
 * keeps the chunks with the lowest `rank` (0 = never drop first). A chunk with
 * `big` may be drawn in the big font (two rows tall) instead of as `text`.
 */
export type Chunk = { text: string; rank: number; big?: string }

/** A self-contained source of chunks. Add new ones to `widgets/index.ts`. */
export type Widget = {
  id: string
  chunks: (ctx: WidgetContext) => Chunk[]
}
