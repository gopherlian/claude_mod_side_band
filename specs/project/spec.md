# Capability: project

The Project group, titled `Project`. Priority 2.

## Requirements

**R1.** Inside a git repository the group SHALL draw, on one row, the branch name and, dim after ` · `, `clean` or the
number of changed files (`3 changed`), followed by `↑n` commits to push and `↓n` to pull when there are any. Where
the row is wider than the band, the state goes on a row of its own under the branch. In the strip the column is always
two rows.

- *Given* branch `US-593` with 3 changed files and 2 commits to push, *Then* the row is `US-593 · 3 changed ↑2`.

**R2.** Outside a git repository the group SHALL NOT appear.

**R3.** The state SHALL be read from `git status --porcelain=v1 -b` in the session's working directory, every third
sample, and SHALL change nothing.
