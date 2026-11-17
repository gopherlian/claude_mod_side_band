import type { Line } from './usage'
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

/**
 * The credit that closes the band: author, email and license, dim, one fact
 * per row. A row wider than the band wraps, and a word wider still is cut, so
 * no row passes `columns`. Nothing where the band has no width at all.
 */
export const creditLines = (columns: number): Line[] =>
  [`© ${YEAR} ${AUTHOR.name}`, AUTHOR.email, LICENSE.name]
    .flatMap(fact => wrap(fact, columns))
    .map(text => ({ text, dimColor: true }))
