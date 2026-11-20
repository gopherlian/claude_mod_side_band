# Harness (GentleAI)

The group after Claude: which step of the harness's workflow the session is on, and what is running. It is specific
to the GentleAI harness; where that harness is not installed the group is not drawn, like any element with nothing to
show. A different harness would get a group of its own.

## Requirements

**R1 (present only where installed).** The group SHALL be drawn only where `~/.gentle-ai/state.json` exists. Elsewhere
it has no rows, no rule and no strip column.

**R2 (order and name).** It SHALL come right after the Claude group, under the rule `━━ GentleAI ━━━`. It is the first
group dropped when rows or width run short (priority after System).

**R3 (step).** A `Step` row SHALL name the step of the last subagent that belongs to a known workflow:

- an `sdd-<phase>` subagent is a step of the SDD workflow, eight in order (explore, propose, spec, design, tasks,
  apply, verify, archive): `Step  ●●●●●●○○ 6/8 apply`, pips filled up to its place, cyan, the rest faint;
- `jd-judge-*` is `judgment day · judging`, `jd-fix-agent` is `judgment day · fixing`, `review-<lens>` is
  `review · <lens>`; a flow with no order has no pips;
- any other subagent (`Explore`, `general-purpose`) sets no step; the step stays after its subagent ends. No step yet:
  the pips are all empty and a dash takes the place of the name (`Step  ○○○○○○○○ -`).

**R4 (now).** A `Now` row SHALL say what is running: `▸` and the task of the oldest running subagent (its `description`),
and `+N` when others run too. It is read whole: what does not fit goes on further rows, under its own text, never cut
(in the strip, only by the rows the column has). With none running, the first open task of the feature document, dim
(`Now   · T3 strip layout`); with that either, `Now   -`.

**R5 (tasks).** Where the project has `odd/tasks/<feature>.md`, the newest of them, a `Tasks` row SHALL draw a thin green bar (`━` filled, `─` the rest in
faint grey) and `done/total` of the checkboxes under its `## Tasks` heading. No document or no checkbox: no row.

**R6 (strip).** In the strip the same rows, cut at the bottom to the column's rows, in the width of a column (28 to 40).

- *Given* a session that ran `sdd-spec` and has an `Explore` agent running, *Then* the rows are `Step  ●●●○○○○○ 3/8 spec`
  and `Now   ▸ <the Explore agent's description>`.
- *Given* a machine without `~/.gentle-ai/state.json`, *Then* the band has no `GentleAI` group.
