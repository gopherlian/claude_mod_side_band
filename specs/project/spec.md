# Capability: project

The Project group, titled `Project`. Priority 2.

## Requirements

**R1.** Inside a git repository the group SHALL draw the branch name, and under it, dim, `clean` or the number of
changed files (`3 changed`), followed by `↑n` commits to push and `↓n` to pull when there are any.

- *Given* branch `feat-7` with 3 changed files and 2 commits to push, *Then* the rows are `feat-7` and
  `3 changed · ↑2`, the second dim and at the right edge of the band.

**R1a.** Where the branch name or the state is wider than the band, it SHALL go on further rows instead of being cut.

**R2.** Outside a git repository the group SHALL NOT appear.

**R3.** The state SHALL be read from `git status --porcelain=v1 -b` in the session's working directory, every third
sample, and SHALL change nothing.
