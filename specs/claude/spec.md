# Capability: claude

The Claude group, titled `Claude`: this session and the plan.

## Requirements

**R1.** The group SHALL start with `Context <used> / <window>` (for example `Context 265k / 1.0M`) and a bar with the
percent used.

**R1a (composition).** Where the session reports what fills the context, the bar SHALL be drawn in runs, one per
consumer in proportion to its tokens: messages blue, system (the prompt and the tools) violet, MCP tools teal, anything
else (memory files, skills, agents) amber; then the autocompact reserve hatched `▒` in grey, and the free space as the
empty track `░`. The runs keep that order. A consumer with tokens SHALL get at least one cell. Tools loaded on demand
are outside the window and SHALL NOT be drawn. Without the breakdown the bar is the plain one.

- *Given* messages 100k, MCP tools 37k, a 33k reserve and 830k free in a 1.0M window, *Then* the bar has a blue run, a
  teal run, a grey hatched run and the empty track, and its number is the percent used.

**R1b (legend).** Under the bar, up to two rows SHALL name the runs: a square `■` (`▒` for the reserve) in the run's
colour, a short name and its tokens (`■ msgs 100k  ■ mcp 37k  ▒ buffer 33k  ■ sys 21k`), largest first, what does
not fit left out. Free space is never listed as a consumer.

**R1c (breathing room).** In the stacked band a blank row SHALL sit under the context bar (before the legend of its
runs), under that legend, between one plan window and the next, and after the last window. The strip (compact form)
has none.

**R2.** The group SHALL draw one bar per plan window the session reports: `Session` (five hours) then `Weekly` (seven
days), then any other window under its own name (a spend limit is `Spend`). With no reading yet the bar SHALL be
empty and the number a dash.

**R2a (time left).** A window's row SHALL end with the time left in the window, dim and short (`2h30m`, `1d4h`, `45m`),
while its bar keeps at least 8 cells, and not at all for a window that does not say when it ends.

- *Given* `Session` with 1h 9m left in a band 28 columns wide, *Then* its row ends with `1h9m`.
- *Given* the same band 27 columns wide, *Then* the row carries no time.

**R3.** The Session and Weekly bars, and the Context label and its percent, SHALL turn **yellow from 70%** and
**red from 85%**.

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

**R7 (removed).** There is no `↻` row: each window carries its own time left (R2a).

**R8.** After the legend of the tick the group SHALL draw:

- how long the session has run, its cost, in green, and, after three minutes, the cost per hour, dim
  (`1h35m · $4.82 · $3.04/h`);
- `tools <chart> <count>`: a chart of the tool calls of the last ten minutes, one cell a minute, oldest on the left,
  `·` for a quiet minute and `▂▃▄▅▆▇█` by how busy it was, scaled to the busiest minute; then the total, then the tool
  running now (`▸ Bash`);
- the current turn's time or the last one's, dim (`turn 0:42`, `last 1:14`);
- under a faint rule, the model by its short name (`claude-sonnet-5-5` is `Sonnet 5.5`) and the effort as five pips
  filled up to its level, then its word (`Opus 5.5 ●●●○○ high`): low 1, medium 2, high 3, xhigh 4, max 5.

**R9.** When the session cannot report its usage the group SHALL say `Usage unavailable`. Without a subscription
that reports limits, the plan bars SHALL NOT be drawn.

**R10.** Overlapping tool calls SHALL be counted correctly: the running tool is cleared only when the last one ends.
