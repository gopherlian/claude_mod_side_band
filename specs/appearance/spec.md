# Capability: appearance

The rules every group follows. If a change breaks one of these, it changes this spec first.

## Requirements

**R1.** The separators between groups SHALL be orange: the heavy rule that opens a group (`━━ Claude ━━━…`) in bright
orange `#a05800`, and the bars between the columns of the strip (`┊`) in dark orange `#744000`. The rules inside a
group SHALL be a thin line across the band (`────`) in a very faint grey `#3a3a3a`, seen only when looked for. The
footnote sits between that faint grey rule, above it, and the orange rule of a group's name with no title (`━━━━`),
below it after a blank row. The credit is always set apart by a blank row.
The oranges are dark, so they frame without glaring.

**R2.** A text that is drawn with a colour SHALL NOT also be dimmed: on the terminal, dimming replaces the colour
with the theme's dim one. Where a row needs two looks, it SHALL be drawn in cells, runs of text each with its own
colour.

**R3.** Dim SHALL be used only for secondary text: the outlook under the frame, the activity rows, the legend, the
footnote.

**R4.** The frame of the time group SHALL be heavy (`┏━┓ ┃ ┗━┛`) and bright orange. Only the frame is orange; what is
inside keeps its own colours.

**R5.** The pace tick `┃` SHALL be green wherever it is drawn (bars, legend, footnote).

**R6.** The credit SHALL be one row, centred like the time, with no frame, no name and no bar:
`© 2026 a@webtory.es  GNU/GPL` (two spaces before the license), 28 cells, so it fits the band it is designed for. The
year and the license SHALL be dark orange `#744000`; the email bright orange `#a05800`. Where the row is wider than the
band it SHALL wrap, each row centred, and the email SHALL stay whole.

**R7.** The system palette SHALL be muted and dark. Bar colour / text colour:

| Resource | Bar | Name and number |
| --- | --- | --- |
| CPU | `#2f855a` | `#68d391` |
| GPU | `#2b6cb0` | `#63b3ed` |
| VRAM | `#0e7490` | `#4dd0e1` |
| NPU | `#4c51bf` | `#9aa5ff` |
| RAM | `#6b21a8` | `#c084fc` |
| Swap | `#8a6d0b` | `#e0b83a` |
| Disk | `#0f766e` | `#5eead4` |
| Down | `#4d7c0f` | `#bef264` |
| Up | `#64748b` | `#a0aec0` |

No resource SHALL use orange (reserved for separators and frames) or pink. The container bars SHALL use the CPU and GPU
colours.

**R7a.** The Claude group's graphics SHALL use the same muted palette and no orange: the context runs are blue
`#2b6cb0` (messages), violet `#6b21a8` (system), teal `#0f766e` (MCP tools) and amber `#8a6d0b` (other), the reserve
grey `#64748b`; the cost is green `#68d391`, the tools chart violet `#c084fc`, the effort pips cyan `#4dd0e1` lit and
`#4a5568` faint.

**R7b (bars).** Every bar SHALL be a solid fill of `█` that ends in eighths of a cell (`▏▎▍▌▋▊▉`), over a thin track
`─` in the bar's colour: a gauge, not a hatched block. A bar keeps its width whatever its fill.

- *Given* 43% of a 10-cell bar, *Then* it is `████▎─────`.

**R8.** No row SHALL be wider than the band: text is wrapped or cut, never allowed to push the right edge out.

**R9.** The README screenshots SHALL be drawn from the lines the mod really draws (`tools/screenshots`), and SHALL be
regenerated with any visible change.
