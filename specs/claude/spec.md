# Capability: claude

The Claude group, titled `Claude`: this session and the plan.

## Requirements

**R1.** The group SHALL start with `Context <used> / <window>` (for example `Context 265k / 1.0M`) and a bar with the
percent used.

**R1a (composition).** Where the session reports what fills the context, the bar SHALL be drawn in runs, one per
consumer in proportion to its tokens: messages blue, system (the prompt and the tools) violet, MCP tools teal, anything
else (memory files, skills, agents) amber; then the autocompact reserve hatched `▒` in grey, and the free space as the
thin empty track `─`. The runs keep that order. A consumer with tokens SHALL get at least one cell. Tools loaded on demand
are outside the window and SHALL NOT be drawn. Without the breakdown the bar is the plain one.

- *Given* messages 100k, MCP tools 37k, a 33k reserve and 830k free in a 1.0M window, *Then* the bar has a blue run, a
  teal run, a grey hatched run and the empty track, and its number is the percent used.

**R1b (legend).** Under the bar, up to two rows SHALL name the runs: a square `■` (`▒` for the reserve) in the run's
colour, a short name and its tokens (`■ msgs 100k  ■ mcp 37k  ▒ buffer 33k  ■ sys 21k`), largest first, what does
not fit left out. Free space is never listed as a consumer.

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

**R5.** No legend row follows the bars, in the stacked band or in the strip, and no footnote explains the tick. The
`┃` is green.

**R6.** There is no footnote and no `(*)`.

**R6a.** A faint rule SHALL separate the legend of the context runs from the plan windows (stacked band).

**R7 (removed).** There is no `↻` row: each window carries its own time left (R2a).

**R8.** After the plan windows, under a faint rule (stacked band only), the group SHALL draw:

- `Cost $4.82  $3.04/h`: what the session has cost, in green, and, after three minutes, the cost per hour, dim; under
  it `Time 1h35m`, how long the session has run;
- `tools <n> calls ▸ <running>` (`· last 10 min` when none runs), and under it a braille chart three rows tall across
  the whole width, with a blank row before it and another after it: the tool calls of the last ten minutes, two slices to a cell, the oldest on the left, each slice as
  tall as its calls next to the busiest slice (four dots a row, filled from the bottom), a baseline of dots `⣀` for a
  quiet slice; with no call in those ten minutes the chart is not drawn, nor its blank rows;
- under it a list like a process monitor, one row per tool used this session, the most used first (ties by name):
  `▸ Bash      ━━━━━━━━━━━━━━╸─── 14`, the tool's name (an MCP tool by its own name, `mem_save`, without its server), a
  thin bar (`━` filled, `╸` a half step, `─` the rest in faint grey) as long as its calls next to the busiest tool's,
  and the count; the running tool has a `▸` and its name lit, the others are dim; at most six rows, the last of them
  `+N more` where tools are left out;
- the current turn's time or the last one's, dim (`turn 0:42`, `last 1:14`);
- under a faint rule, the model by its short name (`claude-sonnet-5-5` is `Sonnet 5.5`) and the effort as five pips
  filled up to its level, then its word (`Opus 5.5 ●●●○○ high`): low 1, medium 2, high 3, xhigh 4, max 5.

**R8b (strip).** In the strip the tools are drawn with their chart only where the column's rows hold the header, the
chart and its two blank rows whole; otherwise the one row `tools <chart> <count>` (ten cells, `·` for a quiet minute, `▂▃▄▅▆▇█` by how
busy). The list takes the rows left after that, whole. A band too narrow for a bar of four cells draws no list.

**R8c (separators).** In the stacked band a faint rule SHALL set apart the cost block (`Cost` and `Time`), the tools block
(the chart and the list) and the turn row; a block that is not drawn leaves no rule.

**R8a (narrow band).** In the stacked band, where a row of the facts or the model does not fit the band, it SHALL go
on further rows, at its spaces, each part keeping its colour; nothing is cut.

**R9.** When the session cannot report its usage the group SHALL say `Usage unavailable`. Without a subscription
that reports limits, the plan bars SHALL NOT be drawn.

**R10.** Overlapping tool calls SHALL be counted correctly: the running tool is cleared only when the last one ends.
