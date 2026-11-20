# Specs

This repository is organised for **spec-driven development** (SDD): the behaviour of the band is written down
first, as requirements with scenarios, and the tests and the code follow from it. A spec says *what the band does*,
never *how the code does it*.

## Layout

```
specs/
  <capability>/spec.md     one file per capability: what it must do, and the scenarios that prove it
  changes/<name>/          a change in progress: proposal.md, spec deltas and tasks (see below)
```

| Capability | What it specifies |
| --- | --- |
| [band](band/spec.md) | The pane: width, rows, the stacked and the side-by-side (strip) layouts, which groups are dropped, the credit, what it reads and writes |
| [commands](commands/spec.md) | `/band`, `/band open`, `/band refresh`, `/band timer` |
| [time](time/spec.md) | The time group: big clock, weather, date, timer |
| [claude](claude/spec.md) | The Claude group: context, plan windows, the pace tick, activity, model |
| [harness](harness/spec.md) | The GentleAI group: the workflow step, what runs now, the feature's tasks; only where the harness is installed |
| [docker](docker/spec.md) | The Docker group: the containers, a CPU and a GPU bar each, grouped by network; only where docker is available |
| [project](project/spec.md) | The project group: the repository's state |
| [system](system/spec.md) | The system group: resource bars, network rates, containers |
| [update](update/spec.md) | The mod's version above `━━ Claude`, and how it updates itself |
| [appearance](appearance/spec.md) | Colours, frames and rules: the rules every group follows |

## How a spec is written

- A requirement is one sentence with **SHALL** (a must) or **SHOULD** (a preference), numbered `R<n>` inside its file.
- Each requirement has at least one **scenario**: `Given` a state, `When` something happens, `Then` what is drawn
  or done. A scenario can be checked by a test or, for what is drawn, by the screenshot of the README.
- Words in `code` are literal: the text the band draws, a command, a colour.

## The workflow

1. **Specify.** For a new behaviour or a change, write the proposal and the spec delta in
   `specs/changes/<name>/` (what is added, changed or removed, in the same requirement and scenario form).
2. **Test.** Write the tests the scenarios describe, in `hooks/**/*.test.ts`, and watch them fail.
3. **Build.** Change the code until they pass (`claude plugin test .`, then `claude plugin validate .`).
4. **Fold the delta into the specs.** Move what the change decided into the capability's `spec.md` and delete
   `specs/changes/<name>/`. The specs always describe the band as it is now.
5. **Refresh the screenshots** if anything visible changed: `tools/screenshots/regenerate.sh`, and read the README
   text again. The screenshots and the README are part of the change.
6. **Commit** with a Conventional Commit message, the specs, tests, code and screenshots together.

A change that touches no behaviour (a rename, a refactor) needs no spec delta, only green tests.
