# Capability: commands

The `/band` slash command.

## Requirements

**R1.** `/band` with no argument SHALL hide the band if it is shown and show it if it is hidden, and SHALL remember
the choice for later sessions. It answers `Side band hidden. /band shows it again.` or
`Side band shown. /band hides it.`

**R2.** `/band open` SHALL only show the band, never hide it, and answer with no text. It is what a new session runs.

**R3.** `/band refresh` SHALL answer how often the machine is read (`Monitor updates every 5s. Use /band refresh
<1-300> to change it.`). `/band refresh <seconds>` SHALL set the interval live, remember it, and answer
`Monitor now updates every <n>s.` A value that is not a number from 1 to 300 SHALL be refused with
`"<value>" is not valid. Use a number of seconds from 1 to 300.` and SHALL NOT change the interval.

- *Given* `/band refresh 10`, *Then* the next samples are taken every 10 seconds, also in the next session.
- *Given* `/band refresh 0`, *Then* the answer is the refusal and the interval is unchanged.

**R4.** `/band timer <minutes>` SHALL start a countdown of 1 to 600 minutes and answer `Timer set for <n> min.`
`/band timer` SHALL answer how much is left (`Timer: 24:30 left.`) or `No timer running. Use /band timer <minutes>.`
`/band timer off` SHALL clear it and answer `Timer cleared.` Any other value SHALL be refused with
`"<value>" is not valid. Use minutes from 1 to 600, or off.`

**R5.** When the countdown ends, the band SHALL show `Timer done` in green and raise a `Timer done` toast, once.

**R6.** The command SHALL be registered with a description that names `refresh <seconds>`, `timer <minutes>` and
`demo`.

**R7 (demo).** `/band demo` SHALL turn on a demonstration: the band is shown and draws every element it has with
made-up readings that move a little each second (the weather and its outlook, the context and its runs, Session and
Weekly with their ticks, the cost, the model, the tools chart, a branch with changes, CPU, GPU, VRAM, RAM, Swap, Disk,
the network, three containers on two networks, one of them on the GPU, and a running timer). It answers
`Demo on: the band shows made-up readings. /band demo turns it off.` Run again, it SHALL turn the demonstration off
and answer `Demo off: the band shows its real readings again.` The demonstration SHALL last only for the session, SHALL
NOT be written to the files the bands share, and SHALL NOT raise the timer's toast.

- *Given* a machine without docker, *When* `/band demo` runs, *Then* the band draws three containers.
- *Given* the demonstration is on, *When* `/band demo` runs, *Then* the band shows the real readings again.
