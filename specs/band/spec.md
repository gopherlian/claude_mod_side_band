# Capability: band

The pane as a whole: how wide it is, what it shows when rows run short, what it reads, writes and sends.

## Requirements

**R1.** The band SHALL be a docked pane that asks for one twelfth of the window width, never fewer than 28 columns
of content and never more than 45% of the window, with 2 columns of padding on each side.

- *Given* a window 400 columns wide, *When* the band opens, *Then* its content is 33 columns wide.
- *Given* a window 212 columns wide, *When* the band opens, *Then* its content is 28 columns wide.

**R1a.** The width is a request: where the person has resized the dock, the engine keeps that width
(`pluginPanes.dockColumns` in `~/.claude.json`) and it wins. The band SHALL draw itself in whatever width it is given.

**R2.** The band SHALL open by itself when a session starts, unless the user hid it with `/band`.

- *Given* the user ran `/band` to hide it, *When* a new session starts, *Then* the band stays hidden.
- *Given* it was never hidden, *When* a session starts, *Then* the band is open.

**R3.** The band SHALL draw its groups in this order, top to bottom: Time, Claude, Project, System. Every group
after the first SHALL be preceded by a blank row and a titled rule (`━━ Claude ━━━…`), with no blank row below the
rule; the Time group has no title. The blank row above `━━ Claude` carries the mod's version, right-aligned
(see [update](../update/spec.md) R3).

**R4.** When a docked band has fewer rows than its groups need, it SHALL scroll (mouse wheel; arrow keys while it
has focus) and SHALL NOT drop any group. Where it cannot scroll, it SHALL drop whole groups, highest priority
number first (System 3, Project 2, Claude 1), and SHALL NOT draw half a group. The Time group (priority 0) is never
dropped.

- *Given* a band that cannot scroll and has room for Time and Claude only, *Then* Project and System are absent
  and Claude is drawn whole.

**R5.** A group with no lines SHALL NOT appear, and SHALL NOT leave a rule or a blank row behind.

**R6.** When rows are left after the groups, the band SHALL draw the credit, whole or not at all, right under
the orange rule of a group's name, untitled, with no blank row around it. It SHALL NOT take the place of a group. The band
has no footnote. In the strip (R13) the credit follows the columns after a blank row, where the pane has rows left
for all of it.

**R13 (strip).** Where the pane is not docked (it sits inline above the prompt, or as a widget), the band SHALL draw
its groups side by side, as columns, in the order Time, Claude, Project, System, instead of stacked. A docked band
keeps stacking them (R3).

**R14 (columns).** Each column starts with its group's titled rule (`━━ Claude ━━━`) on its first row; the Time group
has none, its frame stands there. A faint dark-orange `┊` SHALL separate a column from the next on every row, with a
space on each side.

**R15 (compact forms).** In the strip each group SHALL draw a compact form, its rows in order of importance so that
cutting at the bottom always leaves something whole:

- Time: the frame with the big clock and the weather text, then the outlook and the timer; the frame is never cut.
- Claude: `Context` and its bar on one row, `Session`, `Weekly`, the legend of the tick, the cost row, the model row, the
  tools row.
- Project: the branch and its state (`3 changed ↑2`).
- System: two resources a row (`CPU`/`GPU`, `VRAM`/`RAM`, `Swap`/`Disk`; a resource that is not there leaves no
  gap), the network rates on one row (`↓ 833B/s  ↑ 800B/s`), then `docker · 3 running`.

**R16 (width).** A column has a least and a most width (Time 22 to 34, Claude 28 to 40, Project 12 to 24, System 28 to
40) and columns are 3 cells apart. Where they do not all fit, the group with the highest priority number SHALL be
dropped whole, as in R4; Time is never dropped. Width left over SHALL be shared among the columns, up to their most.

- *Given* a strip 99 columns wide, *Then* all four groups are drawn.
- *Given* a strip 80 columns wide, *Then* System is dropped and the rest is drawn.
- *Given* a strip 40 columns wide, *Then* only Time is drawn.

**R17 (height).** The strip SHALL NOT be taller than the rows the pane has; a column that is taller is cut at the
bottom. The Time column is shaped to the rows instead: the big clock three rows tall where it can be, a short one with
two, the time first as text with one, and the outlook and the timer where rows are left.

**R18 (opening).** The band SHALL ask for 8 body rows when it opens, what the tallest column needs.

**R7.** The band SHALL redraw every second so the clock, the timer and the pace tick stay live.

**R8.** The machine SHALL be read at most once per refresh interval (5 seconds by default, see
[commands](../commands/spec.md) R3) across all open bands: a band whose turn comes while the shared reading is younger
than its interval SHALL show that reading instead of taking a new one. The slow readings (containers) SHALL be taken
once every third interval across all bands, the repository's state every third interval by each band for its own
folder. The weather SHALL be fetched once every 10 minutes across all bands, and every band SHALL show the latest one
fetched.

**R9.** Rates and utilisation are changes between two readings, and the earlier reading is the shared one, so whichever
band reads, its figures continue those of the others. A band that finds no shared reading SHALL take one and a second
one a second later, so the first CPU reading appears soon.

**R10.** What is not on the machine SHALL be left out without an error: no `nvidia-smi` means no GPU bar, no
`docker` means no container block, and so on.

**R11.** The bands of all open sessions SHALL share the plan limits through `~/.claude/side-band-limits.json`
every 8 seconds, and each SHALL show the highest reading of the current window. A window that has ended SHALL be
dropped; a later reset SHALL count as a new window.

**R11a.** The machine's readings (CPU, GPU, VRAM, NPU, RAM, Swap, Disk, the network rates and their peak, containers)
and the weather SHALL be shared through `~/.claude/side-band-state.json`. What belongs to a session (its context, cost,
tools, model, the repository of its folder) stays its own. A file that is missing, unreadable or of another version
SHALL be ignored, and the band reads for itself.

- *Given* two bands open and one has read the machine 2 seconds ago, *When* the other's turn comes, *Then* it shows the
  same CPU, RAM and network figures and does not read `/proc`.

**R12.** The band SHALL send nothing off the machine except the weather request to `api.open-meteo.com` with the
coordinates of the fixed place (Valencia). It SHALL write nothing except `~/.claude/side-band-limits.json`,
`~/.claude/side-band-state.json` and its own store (whether it is hidden, the refresh interval). It SHALL NOT change files, repositories or containers.
