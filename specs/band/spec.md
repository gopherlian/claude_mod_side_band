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
after the first SHALL be preceded by a blank row and a titled rule (`━━ Claude ━━━…`); the Time group has no title.

**R4.** When a docked band has fewer rows than its groups need, it SHALL scroll (mouse wheel; arrow keys while it
has focus) and SHALL NOT drop any group. Where it cannot scroll, it SHALL drop whole groups, highest priority
number first (System 3, Project 2, Claude 1), and SHALL NOT draw half a group. The Time group (priority 0) is never
dropped.

- *Given* a band that cannot scroll and has room for Time and Claude only, *Then* Project and System are absent
  and Claude is drawn whole.

**R5.** A group with no lines SHALL NOT appear, and SHALL NOT leave a rule or a blank row behind.

**R6.** When rows are left after the groups, the band SHALL draw, in this order, each whole or not at all: the
footnotes of the groups shown (after a blank row and a short faint rule), then the credit (after a blank row and a
short faint rule). They SHALL NOT take the place of a group.

**R7.** The band SHALL redraw every second so the clock, the timer and the pace tick stay live.

**R8.** The machine SHALL be sampled every 5 seconds by default (see [commands](../commands/spec.md) R3). The slow
readings (containers, git) SHALL be taken every third sample. The weather SHALL be fetched every 10 minutes.

**R9.** Rates and utilisation are changes between two samples: the first sample SHALL only prime them, and the band
SHALL take a second sample one second later so the first CPU reading appears soon.

**R10.** What is not on the machine SHALL be left out without an error: no `nvidia-smi` means no GPU bar, no
`docker` means no container block, and so on.

**R11.** The bands of all open sessions SHALL share the plan limits through `~/.claude/side-band-limits.json`
every 8 seconds, and each SHALL show the highest reading of the current window. A window that has ended SHALL be
dropped; a later reset SHALL count as a new window.

**R12.** The band SHALL send nothing off the machine except the weather request to `api.open-meteo.com` with the
coordinates of the fixed place (Valencia). It SHALL write nothing except `~/.claude/side-band-limits.json` and its
own store (whether it is hidden, the refresh interval). It SHALL NOT change files, repositories or containers.
