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

/** Between two facts on one row. */
const SEPARATOR = ' · '

/** The facts of the credit, in order. */
const FACTS = [`© ${YEAR} ${AUTHOR.name}`, AUTHOR.email, LICENSE.name]

/** The facts packed into rows of at most `columns`, ` · ` between two that share a row; a longer one wraps. */
const pack = (columns: number): string[] => {
  const rows: string[] = []
  // A row that holds part of a wrapped fact takes nothing more.
  let isOpen = false
  for (const fact of FACTS) {
    const last = rows[rows.length - 1]
    if (isOpen && last !== undefined && last.length + SEPARATOR.length + fact.length <= columns) {
      rows[rows.length - 1] = last + SEPARATOR + fact
    } else {
      const wrapped = wrap(fact, columns)
      rows.push(...wrapped)
      isOpen = wrapped.length === 1
    }
  }

  return rows
}

/**
 * The credit that closes the band, with no frame: the name, the email and the
 * license, as many to a row as fit, ` · ` between them, each row centred. Everything is dark orange
 * but the email, which is bright orange, the two oranges of the separators.
 * Where a row is wider than the band it wraps, each row centred, and a word wider
 * still is cut, so no row passes `columns`.
 */
export const creditLines = (columns: number): Line[] => {
  if (columns < 1) return []

  const rows = pack(columns).map(row => centered(row, columns))

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
