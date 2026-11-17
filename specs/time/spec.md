# Capability: time

The Time group: the first group, always shown.

## Requirements

**R1.** The group SHALL draw the time as `HH:MM` in a big font (three rows tall; two when only two rows fit),
centred in a heavy orange frame (see [appearance](../appearance/spec.md) R4).

**R2.** Under the big time, inside the frame, the group SHALL draw the weather items separated by ` · ` and
**centred** in the frame: temperature, sky, place, how it feels (`feels 20°`), humidity, wind (`20 km/h`), and the
date (`Tue 17 Nov`). When the frame is too narrow for all of them, the items SHALL be dropped in this order, least
important first: wind, humidity, how it feels, date, place, sky; the temperature is last to go.

- *Given* the weather `22°C`, `Overcast`, Valencia, *Then* a row reads `22°C · Overcast · Valencia · feels 20° ·
  56% · 20 km/h · Tue 17 Nov` when the frame is wide enough.

**R3.** Under the frame the group SHALL draw today's outlook, dimmed and centred: the icon, high and low
(`↑24° ↓15°`), chance of rain (`rain 3%`), UV index (`UV 3`), sunrise and sunset (`07:47–17:45`). When both fit on
one row they SHALL share it; otherwise each takes its own row, centred, uncut.

**R4.** While the weather is loading the group SHALL show `weather…`; when it fails, `no weather`.

**R5.** While a countdown runs the group SHALL end with `Timer mm:ss`; at zero, `Timer done` in green.

**R6.** When no rows are left under the time, the weather items SHALL stay beside the big time rather than be lost.
