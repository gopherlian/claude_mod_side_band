# Capability: system

The System group, titled `System`. Priority 3, the first to be dropped.

## Requirements

**R1.** The group SHALL draw one bar per resource found, in this order: CPU, GPU, VRAM, NPU, RAM, Swap, Disk; each as
`<icon> <name> <bar> <percent>`. With several GPUs or NPUs they SHALL be numbered (`GPU0`, `VRAM0`, `NPU1`). The icon
SHALL be a one-cell text symbol that Unicode does not count as an emoji (a terminal may draw an emoji two cells
wide, over the name), in the lighter colour of the name: `▦` CPU, `▣` GPU, `▤` VRAM, `◈` NPU, `≡` RAM, `⇄` Swap,
`◉` Disk, `↓` Down, `↑` Up. The icon and the name take 8 cells, so every bar of the group, the network ones too,
starts in the same column, and a numbered name (`VRAM0`) keeps a space before its bar.

- *Given* RAM at 50% in a band 30 columns wide, *Then* its row starts with `≡ RAM   ` and ends with ` 50%`.

**R2.** Each resource SHALL have its own colour, and the same colour SHALL NOT be used by two resources. The bar is
drawn in the resource's colour; its name and number in a lighter shade of the same colour. Bars SHALL NOT change
colour as they fill. See [appearance](../appearance/spec.md) R7.

**R3.** After the percent bars, under a faint rule, the group SHALL draw `↓ Down` (what the network receives) and
`↑ Up` (what it sends) as bars with the rate at the right (`3.2M/s`). A network bar has no fixed top speed, so it SHALL be scaled to the highest rate seen since the mod
loaded, never below 1 MB/s.

**R4.** Under another faint rule, when `docker` is available, the group SHALL draw `docker · <n> running` (or
`docker · none running`) and, per container, its name on a row of its own, dim and right-aligned, then its CPU bar across the whole width. As
every bar it is a fill of `▬` over a thin track `─` (appearance R7b), in the CPU colour; a trickle of load still shows
a half cell `╸`. Under it, only for a container that asked docker for a GPU, a second bar of the same length in the GPU
colour. A container that asked docker for a GPU
shows the GPU's whole utilisation; docker does not split it.

**R5.** Containers that share a network, directly or through another container, SHALL form one group, with a faint
rule between groups and the order docker lists them in kept. At most five containers SHALL be drawn; the rest are
counted (`+3 more`).

**R6.** Resources not found SHALL be left out (see [band](../band/spec.md) R10). The CPU bar SHALL appear after the
second sample.

**R7.** Disk SHALL be the filesystem of the session's working directory (`df -P`).
