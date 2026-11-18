# Changelog

All notable changes to this mod are written here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Every bar is a solid gauge that ends in eighths of a cell over a thin track (`████▎─────`) instead of a hatched
  `░` block.

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
