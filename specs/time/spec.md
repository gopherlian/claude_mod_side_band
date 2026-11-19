# Capability: time

The Time group: the first group, always shown.

## Requirements

**R1.** The group SHALL draw the time as `HH:MM` in a big font (three rows tall; two when only two rows fit),
centred in a heavy orange frame (see [appearance](../appearance/spec.md) R4).

**R2.** Under the big time, inside the frame, the group SHALL draw the weather items separated by ` · ` and
**centred** in the frame: temperature, sky, place, how it feels (`feels 20°`), humidity, wind (`20 km/h`), and the
date (`Tue 17 Nov`). Where the items do not all fit on one row, the rest SHALL go on further rows, whole items
first, so that none is lost however narrow the band; an item wider than a row is split. (In the strip, where a column
keeps its height, the items are dropped in this order, least important first: wind, humidity, how it feels, date,
place, sky; the temperature is last to go.)

- *Given* the weather `22°C`, `Overcast`, Valencia, *Then* a row reads `22°C · Overcast · Valencia · feels 20° ·
  56% · 20 km/h · Tue 17 Nov` when the frame is wide enough.
- *Given* a frame 20 cells wide, *Then* the same items are drawn over several rows (`22°C · Overcast`, `Valencia`,
  `feels 20° · 56%`, ...) and none is missing.

**R3.** Under the frame the group SHALL draw today's outlook, dimmed and centred: the icon, set apart by two spaces and a
dot (terminals often draw the icon two cells wide), then high and low (`↑24° ↓15°`), chance of rain (`rain 3%`) and the
UV index (`UV 3`): `☁  · ↑24° ↓15° · rain 3% · UV 3`.
Sunrise and sunset are not drawn, so the row is short enough to sit centred. When it does not fit on one row, the UV
index takes a row of its own, centred, uncut; where a part alone is wider than a row, each part takes a row.

**R4.** While the weather is loading the group SHALL show `weather…`; when it fails, `no weather`.

**R5.** While a countdown runs the group SHALL end with `⧗ Timer mm:ss`, centred; at zero, `⧗ Timer done` in green. The
hourglass `⧗` is a one-cell symbol Unicode does not count as an emoji (`⏱`, `⌛` and `⏳` are, and a terminal may draw
them two cells wide).

**R6.** When no rows are left under the time, the weather items SHALL stay beside the big time rather than be lost.
