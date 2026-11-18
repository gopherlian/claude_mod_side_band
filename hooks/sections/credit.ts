import { centered } from '../layout'
import { RULE_COLOR, SOFT_RULE_COLOR } from './usage'
import type { Cell, Line } from './usage'
import { wrap } from './wrap'

/** Who wrote the mod. */
export const AUTHOR = {
  name: 'Alberto Rodriguez Baixauli',
  email: 'a@webtory.es',
}

/** The license the mod is distributed under; the full text is in LICENSE. */
export const LICENSE = {
  name: 'GNU GPL v3 or later',
  spdx: 'GPL-3.0-or-later',
}

const YEAR = 2026

/** Between the name and the email. */
const SEPARATOR = ' │ '

/**
 * The credit that closes the band, with no frame: the author's name, a vertical
 * bar and the email on one row, the license alone on the row below it, both
 * centred. The name, the bar and the license are dark orange and the email bright
 * orange, the two oranges of the separators. Where a row is wider than the band
 * it wraps, each row centred, and a word wider still is cut, so no row passes
 * `columns`.
 */
export const creditLines = (columns: number): Line[] => {
  if (columns < 1) return []

  const rows = [`© ${YEAR} ${AUTHOR.name}${SEPARATOR}${AUTHOR.email}`, LICENSE.name]
    .flatMap(fact => wrap(fact, columns))
    .map(row => centered(row, columns))

  // Only the email is bright; everything else on the row is dark orange.
  const paint = (text: string): Cell[] => {
    const at = text.indexOf(AUTHOR.email)
    if (at < 0) return [{ text, color: SOFT_RULE_COLOR }]

    return [
      { text: text.slice(0, at), color: SOFT_RULE_COLOR },
      { text: AUTHOR.email, color: RULE_COLOR },
      { text: text.slice(at + AUTHOR.email.length), color: SOFT_RULE_COLOR },
    ].filter(cell => cell.text !== '')
  }

  return rows.map(text => ({ text, cells: paint(text) }))
}
