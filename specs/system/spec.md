# Capability: system

The System group, titled `System`. Priority 3, the first to be dropped.

## Requirements

**R1.** The group SHALL draw one bar per resource found, in this order: CPU, GPU, VRAM, NPU, RAM, Swap, Disk; each as
`<name> <bar> <percent>`. With several GPUs or NPUs they SHALL be numbered (`GPU0`, `VRAM0`, `NPU1`).

**R2.** Each resource SHALL have its own colour, and the same colour SHALL NOT be used by two resources. The bar is
drawn in the resource's colour; its name and number in a lighter shade of the same colour. Bars SHALL NOT change
colour as they fill. See [appearance](../appearance/spec.md) R7.

**R3.** After the percent bars, under a faint rule, the group SHALL draw `Down` and `Up` as bars with the rate at the
right (`3.2M/s`). A network bar has no fixed top speed, so it SHALL be scaled to the highest rate seen since the mod
loaded, never below 1 MB/s.

**R4.** Under another faint rule, when `docker` is available, the group SHALL draw `docker · <n> running` (or
`docker · none running`) and one bar per container, followed by its name. The bar has two halves: the top is the
container's CPU in the CPU colour, the bottom the GPU in the GPU colour. A container that asked docker for a GPU
shows the GPU's whole utilisation; docker does not split it.

**R5.** Containers that share a network, directly or through another container, SHALL form one group, with a faint
rule between groups and the order docker lists them in kept. At most five containers SHALL be drawn; the rest are
counted (`+3 more`).

**R6.** Resources not found SHALL be left out (see [band](../band/spec.md) R10). The CPU bar SHALL appear after the
second sample.

**R7.** Disk SHALL be the filesystem of the session's working directory (`df -P`).
