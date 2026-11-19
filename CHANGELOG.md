# Changelog

All notable changes to this mod are written here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.6.0] - 2026-11-19

### Added
- A little something on a few days of the year.

## [1.5.1] - 2026-11-19

### Changed
- The strip no longer draws the `┃ time elapsed in the window` row under the plan bars.

## [1.5.0] - 2026-11-19

### Changed
- In a narrow band nothing disappears: the weather items, today's outlook, the cost, tools, turn and model rows and the
  branch and its state go on further rows where they do not fit on one, instead of being dropped or cut. The strip,
  where a column keeps its height, is unchanged.

## [1.4.0] - 2026-11-18

### Changed
- Every resource of the System group has an icon before its name: `▦` CPU, `▣` GPU, `▤` VRAM, `◈` NPU, `≡` RAM,
  `⇄` Swap, `◉` Disk, and the arrows `↓` Down and `↑` Up for the network.
- The timer row is centred and led by an hourglass: `⧗ Timer 29:13`.

## [1.3.1] - 2026-11-18

### Changed
- `/band demo` and the README screenshots show new example names for the containers and the branch.

## [1.3.0] - 2026-11-18

### Added
- The mod updates itself: at session start and every 6 hours it checks the repository for a newer version and
  installs it (`claude plugin update` for a marketplace install, `git pull --ff-only` for a clean working copy on
  `main`). Its version, or what to do to load the new one, is drawn right-aligned above `━━ Claude`.

## [1.2.3] - 2026-11-18

### Changed
- A group's name has a blank row above it and none below it; the orange rule above the credit has none around it.

## [1.2.2] - 2026-11-18

### Changed
- The Context label, its bar and the legend sit together again, with no blank rows between them.

### Removed
- The footnote that explained the pace tick, and the faint grey rule above it. The credit keeps its orange rule,
  with a blank row above and below it.

## [1.2.1] - 2026-11-18

### Changed
- A group's name now has a blank row below it as well as above it, so it sits apart from the group's content.
- In the Claude group a blank row sets the `Context` label, its bar and the legend apart.
- A blank row sits above and below the orange rule that closes the footnote, before the credit.

## [1.2.0] - 2026-11-18

### Added
- `/band demo` turns a demonstration on or off: the band draws every element with made-up readings that move, so all
  of it can be seen working on any machine. It lasts for the session and is never shared.

### Changed
- The footnote sits between a faint grey rule above it and an untitled orange rule below it, and the credit follows
  that rule at once.
- The oranges are darker: `#a05800` for the rules, the group names, the clock's frame and the email (was `#ff8c00`),
  `#744000` for the credit and the strip's bars (was `#b36200`).

## [1.1.2] - 2026-11-18

### Changed
- The credit is one centred row with no frame: `© 2026 a@webtory.es  GNU/GPL` (no name, no bar, the license short).
- The footnote that explains the pace tick is shorter: `┃ inside the fill: over pace; beyond it: under pace.`
- The rules inside a group are more discreet: a thin line in a very faint grey `#3a3a3a`.
- No rule before the footnote and the credit: a blank row sets them apart.
- The outlook under the clock sets the weather icon apart with two spaces and ` · ` and leaves out sunrise and sunset, so it sits
  centred on one row.

## [1.1.1] - 2026-11-18

### Changed
- Every bar is a solid gauge that ends in eighths of a cell over a thin track (`████▎─────`) instead of a hatched
  `░` block.

### Added
- The README explains how to set the dock to the 32 columns the band is designed for, by dragging its edge or in
  `~/.claude.json` (`pluginPanes.dockColumns`), once per machine.

## [1.1.0] - 2026-11-18

### Changed
- The machine (CPU, GPU, VRAM, NPU, RAM, Swap, Disk, network, containers) and the weather are now shared between the
  bands of all open sessions through `~/.claude/side-band-state.json`, so every session shows the same figures. A band
  whose turn comes while another's reading is younger than its refresh interval shows that reading instead of taking a
  new one. Context, cost, tools, model and the repository of each session's folder stay per session.

## [1.0.0] - 2026-11-18

First stable version. What the band does is written in [`specs/`](specs/README.md).

### Added
- A docked pane with four groups: Time (big clock, weather, timer), Claude (context, plan windows with the pace tick,
  cost, tools, model), Project (branch and state) and System (CPU, GPU, memory, disk, network, Docker).
- The context bar drawn in coloured runs by consumer, with a legend; the time left on each plan window; a ten-minute
  chart of tool calls; the effort as pips.
- A strip layout: where the pane cannot be docked, the groups stand side by side as compact columns.
- `/band`, `/band open`, `/band refresh <seconds>` and `/band timer <minutes>|off`.
- Plan limits shared between the bands of all open sessions.

### Changed
- The dock asks for one twelfth of the window width, never fewer than 28 columns of content. The engine keeps the
  width the dock was last resized to and uses it instead.
