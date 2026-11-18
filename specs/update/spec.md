# Update

The mod checks for a newer version of itself, installs it where it can, and says which version runs.

## Requirements

**R1 (check).** At session start and then every 6 hours, the mod SHALL compare the version in its own
`.claude-plugin/plugin.json` with the one published at
`https://raw.githubusercontent.com/gopherlian/claude_mod_side_band/main/.claude-plugin/plugin.json`. A version is
newer when its `major.minor.patch` is higher, compared number by number.

- *Given* `1.2.3` installed and `1.2.10` published, *Then* `1.2.10` is newer.
- *Given* `1.3.0` installed (a working copy ahead of the repository) and `1.2.3` published, *Then* nothing is newer.

**R2 (install).** When the published version is newer, the mod SHALL install it as it was installed itself:

- a git working copy (its folder holds `.git`) on branch `main` with nothing changed SHALL run
  `git pull --ff-only` in that folder;
- a marketplace install (its folder is under `~/.claude/plugins/cache/<marketplace>/`) SHALL run
  `claude plugin update side-band@<marketplace>`;
- anything else, a working copy with changes or on another branch, or a command that fails, SHALL install nothing.

Just before installing it SHALL read its own version again, so a band of another session that already installed it
is not repeated.

**R3 (shown).** On the blank row above the `━━ Claude` rule, right-aligned, the band SHALL draw:

| State | Text | Look |
| --- | --- | --- |
| Up to date, or not yet checked, or the check failed | `v1.2.3` | dim |
| Pulled into a working copy, not yet reloaded | `v1.2.4: restart` | green |
| Updated through the marketplace | `v1.2.4: /reload-plugins` | green |
| Newer version out, not installed (R2, last case) | `v1.2.4 available` | yellow |

Where the text does not fit the row, the version alone SHALL be drawn. A working copy the session watches reloads
itself when pulled, and then draws its new version, dim. The strip (side by side) draws no version.

- *Given* `1.2.3` installed and nothing newer, *Then* the row above `━━ Claude` ends with `v1.2.3`, dim.
- *Given* a clean working copy on `main` and `1.2.4` published, *Then* `git pull --ff-only` runs and the row reads
  `v1.2.4: restart` until the mod reloads.

**R4 (quiet).** A failed check or install SHALL draw no error: the band keeps showing the version that runs.
