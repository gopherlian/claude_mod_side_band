import { centered } from '../layout'
import { FAINT_LOOK, FRAME_COLUMNS, frameLines } from './frame'
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

/** Between the name, the email and the license. */
const SEPARATOR = ' │ '

/**
 * The credit that closes the band, in a faint frame like the rule between the
 * elements of a group: the author's name, a vertical bar, the email, another bar
 * and the license, on one row centered in the frame like the time. The name, the
 * bars and the license are dark orange and the email bright orange, the two
 * oranges of the separators. Where the row is wider than the frame it wraps, each
 * row centered, and a word wider still is cut, so no row passes `columns`.
 * Nothing where the band has no room for a frame.
 */
export const creditLines = (columns: number): Line[] => {
  const inner = columns - FRAME_COLUMNS
  if (inner < 1) return []

  const rows = wrap([`© ${YEAR} ${AUTHOR.name}`, AUTHOR.email, LICENSE.name].join(SEPARATOR), inner).map(row =>
    centered(row, inner),
  )

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

  return frameLines(rows, columns, FAINT_LOOK, paint)
}
