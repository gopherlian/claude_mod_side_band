# Capability: docker

The Docker group, titled `Docker`, after System. Priority 5, the first to be dropped. It is drawn only where `docker`
is available; elsewhere it has no rows and no rule. It has no compact form: in the strip the System column counts the
containers (`docker · 3 running`, see [band](../band/spec.md) R15) and there is no Docker column.

## Requirements

**R1 (count).** The group SHALL start with `<n> running` (or `none running`), dim.

**R2 (a container).** Each container SHALL be its name on a row of its own, dim and right-aligned, then its CPU bar
across the whole width. As every bar it is a fill of `▬` over a thin track `─` (appearance R7b), in the CPU colour; a
trickle of load still shows a half cell `╸`. Under it, only for a container that asked docker for a GPU, a second bar
of the same length in the GPU colour. A container that asked docker for a GPU shows the GPU's whole utilisation; docker
does not split it. A blank row SHALL separate a container from the one above it in its group.

**R3 (networks).** Containers that share a network, directly or through another container, SHALL form one group, in the
order docker lists them. Where there is more than one group, each SHALL open with a rule that names its network at the
left (`── app ───────`), after a blank row, all in a very faint blue (`#3d5a80`) so that it is told from the faint grey
rules inside a group; a group of several networks lists them joined by ` · `. With one group there is no rule.

**R4 (cap).** At most five containers SHALL be drawn; the rest are counted (`+3 more`).

- *Given* three containers, two on network `app` and one on `db`, *Then* the rows are `3 running`, `── app ───…`,
  the first container's three rows, a blank row, the second's two rows, a blank row, `── db ───…` and the third's two
  rows.
