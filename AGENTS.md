# side-band: agent instructions

A Claude Code mod: a live side band (time, weather, plan usage, repository, machine). TypeScript hooks module, no
build step. The README explains what it does; this file says how to work on it.

## This repository is spec-driven

The behaviour is written in `specs/` before it is built. Read [`specs/README.md`](specs/README.md) first, then the
spec of the capability you are touching. The order of work is **specify, test, build, fold the change into the specs,
refresh the screenshots, commit**. A change to what the band does starts in `specs/changes/<name>/`; a change that
touches no behaviour needs no spec delta, only green tests.

## Commands

```
claude plugin test .                     # the tests, hooks/**/*.test.ts
claude plugin validate .                 # the manifest and the hooks module, as the engine reads them
tools/screenshots/regenerate.sh          # redraws docs/img/*.svg from what the mod really draws
```

`claude plugin validate .` reports TypeScript warnings in files that were already like that; a new one in a file you
touched is yours to fix.

## Layout

```
specs/             what the band must do (capability specs, and changes in progress)
hooks/             the mod: register.tsx, groups/, sections/, monitor/, widgets/, layout.ts, limits.ts
tools/screenshots/ how the README screenshots are drawn from the mod's own lines
docs/img/          the screenshots (generated: never edit by hand)
.claude-plugin/    plugin.json and marketplace.json
```

## Versions

Semantic Versioning. A change that users would notice goes in `CHANGELOG.md` under `[Unreleased]` in the same commit.
To release: move those lines under a new `## [X.Y.Z] - date`, set `version` in `.claude-plugin/plugin.json` to the same
number, commit as `chore: release X.Y.Z`, tag it `vX.Y.Z` (annotated) and push the commit and the tag. Major for a
breaking change, minor for a new feature, patch for a fix or a restyle.

## Rules

- **A visible change refreshes the screenshots.** Colours, layout, groups, rows, the frame, the credit: run
  `tools/screenshots/regenerate.sh`, read the README text again (colour guide, group descriptions) and commit the
  SVGs with the change.
- **Specs and code agree.** A change that contradicts a spec changes the spec in the same commit.
- **Tests beside the code.** Every file in `hooks/` has a `*.test.ts` next to it; what is drawn is asserted
  line by line. A hooks module imports only its own files by relative path and `claude-code`: no `node:fs`.
- **`dimColor` replaces a colour** on the terminal with the theme's dim one: never dim a row that has a colour. A row
  with more than one colour is drawn from `cells`.
- **Orange is for the separators between groups and the frames.** No resource uses it; the rules inside a group are
  a faint grey. See `specs/appearance/spec.md`.
- **Language.** Code, comments, UI text, specs and docs are in English.
- **Commits** follow Conventional Commits (`feat:`, `fix:`, `style:`, `docs:`, `test:`, `refactor:`), with no
  `Co-Authored-By` or AI attribution. Commit identity for this repository is set in its local git config.
