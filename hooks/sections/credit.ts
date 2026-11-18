import { centered } from '../layout'
import { RULE_COLOR, SOFT_RULE_COLOR } from './usage'
import type { Cell, Line } from './usage'
import { wrap } from './wrap'

/** How to reach who wrote the mod. */
export const AUTHOR = {
  email: 'a@webtory.es',
}

/** The license the mod is distributed under; the full text is in LICENSE. */
export const LICENSE = {
  name: 'GNU/GPL',
  spdx: 'GPL-3.0-or-later',
}

const YEAR = 2026

/** Between the email and the license: two spaces, so the row fits the 28 columns the band is designed for. */
const SEPARATOR = '  '

/**
 * The credit that closes the band: one centred row, `© 2026 a@webtory.es  GNU/GPL`,
 * with no frame. The year and the license are dark orange and the email bright
 * orange, the two oranges of the separators. Where the row is wider than the band
 * it wraps, each row centred, and a word wider still is cut, so no row passes
 * `columns`.
 */
export const creditLines = (columns: number): Line[] => {
  if (columns < 1) return []

  // Whole where it fits; wrapping would fold the two spaces into one.
  const credit = `© ${YEAR} ${AUTHOR.email}${SEPARATOR}${LICENSE.name}`
  const rows = (credit.length <= columns ? [credit] : wrap(credit, columns)).map(row => centered(row, columns))

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
