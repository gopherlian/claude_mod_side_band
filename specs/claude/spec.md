# Capability: claude

The Claude group, titled `Claude`: this session and the plan.

## Requirements

**R1.** The group SHALL start with `Context <used> / <window>` (for example `Context 265k / 1.0M`) and a bar with the
percent used.

**R2.** The group SHALL draw one bar per plan window the session reports: `Session` (five hours) then `Weekly` (seven
days), then any other window under its own name (a spend limit is `Spend`). With no reading yet the bar SHALL be
empty and the number a dash.

**R3.** The Context, Session and Weekly bars SHALL turn **yellow from 70%** and **red from 85%**.

**R4 (pace tick).** Each plan bar that knows when its window ends SHALL carry a green `┃` at the share of the window's
time that has gone by. A `┃` inside the fill means the user is spending faster than time passes; beyond it, under
pace.

- *Given* a five-hour window with 1h09m left and 41% used, *Then* the tick sits at 77% of the bar, beyond the
  fill: under pace.
- *Given* a window with no known end, *Then* its bar carries no tick.

**R5.** While at least one tick is drawn, a one-row legend SHALL follow the bars: `┃ time elapsed in the window`,
or `┃ time elapsed` when that does not fit, and nothing where neither fits. The `┃` is green.

**R6.** When the footnote is drawn, the legend row SHALL end with `(*)` in bright yellow, and the footnote SHALL
start with the same `(*)`, then the sentence `If ┃ is inside the fill, you spend faster than time passes; beyond it,
you are under pace.` wrapped to the band with the continuation rows indented, the `┃` green and the rest dim.

**R7.** One dim row per window SHALL say when it resets, in the order of the bars: `↻ Session  1h 9m`.

**R8.** The group SHALL then draw, dim: how long the session has run, its cost and, after three minutes, the cost
per hour (`1h35m · $4.82 · $3.04/h`); the current turn's time or the last one's, and the tool calls (`last 1:14 ·
tools 37`), plus the tool running now; the three biggest consumers of context (`messages 148k · system 21k · tools
12k`); and, under a faint rule, the model and the effort level (`Opus 5.5 · high`).

**R9.** When the session cannot report its usage the group SHALL say `Usage unavailable`. Without a subscription
that reports limits, the plan bars SHALL NOT be drawn.

**R10.** Overlapping tool calls SHALL be counted correctly: the running tool is cleared only when the last one ends.
