# Capability: claude

The Claude group, titled `Claude`: this session and the plan.

## Requirements

**R1.** The group SHALL start with one row: `Context`, a bar of the window and the percent used
(`Context ███▒──────  26%`).

**R1a (composition).** Where the session reports what fills the context, the bar SHALL be drawn in runs, one per
consumer in proportion to its tokens: messages blue, system (the prompt and the tools) violet, MCP tools teal, anything
else (memory files, skills, agents) amber; then the autocompact reserve hatched `▒` in grey, and the free space as the
thin empty track `─`. The runs keep that order. A consumer with tokens SHALL get at least one cell. Tools loaded on demand
are outside the window and SHALL NOT be drawn. Without the breakdown the bar is the plain one.

- *Given* messages 100k, MCP tools 37k, a 33k reserve and 830k free in a 1.0M window, *Then* the bar has a blue run, a
  teal run, a grey hatched run and the empty track, and its number is the percent used.

**R1b (removed).** There is no legend of the runs: their colours are those of the README's colour guide.

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

**R5.** In the stacked band no legend row follows the bars: the footnote explains the tick (R6). In the strip, which
has no footnote, a one-row legend follows them: `┃ time elapsed in the window`, or `┃ time elapsed` when that does not
fit, and nothing where neither fits. The `┃` is green.

**R6.** When rows are left, the footnote SHALL explain the tick in the longest of these wordings that fits on one row:
`┃ marks the time gone · fill past it: over pace`, `fill past ┃ (time) = over pace`, `fill past ┃ = over pace`;
where none fits, the last one wrapped. The `┃` is green and the rest dim. There is no `(*)`.

**R6a (removed).** There is no faint rule inside the group.

**R7 (removed).** There is no `↻` row: each window carries its own time left (R2a).

**R8.** Right after the plan windows, with no rule between, the group SHALL draw:

- how long the session has run, its cost, in green, and, after three minutes, the cost per hour, dim
  (`1h35m · $4.82 · $3.04/h`);
- the model by its short name (`claude-sonnet-5-5` is `Sonnet 5.5`) and the effort as five pips filled up to its
  level, then its word (`Opus 5.5 ●●●○○ high`): low 1, medium 2, high 3, xhigh 4, max 5; then, dim and where it fits on
  the row, the current turn's time or the last one's (`· turn 0:42`, `· last 1:14`). With no model known, the turn
  alone;
- `tools <chart> <count>`: a chart of the tool calls of the last ten minutes, one cell a minute, oldest on the left,
  `·` for a quiet minute and `▂▃▄▅▆▇█` by how busy it was, scaled to the busiest minute; then the total, then the tool
  running now (`▸ Bash`).

**R9.** When the session cannot report its usage the group SHALL say `Usage unavailable`. Without a subscription
that reports limits, the plan bars SHALL NOT be drawn.

**R10.** Overlapping tool calls SHALL be counted correctly: the running tool is cleared only when the last one ends.
