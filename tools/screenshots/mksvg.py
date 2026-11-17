"""Draws the README screenshots (docs/img/*.svg) from what `claude plugin test` printed.

Usage: mksvg.py <output of the dump test> <folder for the SVGs>

The dump test (dump.test.ts.template) throws an error that carries the lines the mod
draws between DUMPSTART and DUMPEND. This script reads them and draws one SVG per group.
Run it through regenerate.sh, which does every step.
"""
import json, re, sys
from xml.sax.saxutils import escape

raw = open(sys.argv[1]).read()
OUT = sys.argv[2]
found = re.search(r"DUMPSTART(.*?)DUMPEND", raw, re.S)
if not found:
    sys.exit("no DUMPSTART..DUMPEND in the test output: did the dump test load?")
d = json.loads(found.group(1))

BG, FG, DIM = "#1e1e1e", "#d4d4d4", "#8a8f98"
YELLOW, RED = "#e5c07b", "#e06c75"
NAMED = {"yellow": YELLOW, "red": RED, "green": "#4ec9b0", "yellowBright": "#ffe66d"}
CW, LH, FS, PAD = 9.6, 21, 16, 18

def col(c):
    return NAMED.get(c, c) if c else None

def cells_of(line, width):
    """[(char, fg, bg)] for one line, honouring cells, colour, dim and centring."""
    if line.get("cells"):
        out = []
        for c in line["cells"]:
            fg = col(c.get("color")) or (DIM if c.get("dimColor") else FG)
            for ch in c["text"]:
                out.append((ch, fg, col(c.get("backgroundColor"))))
    else:
        fg = col(line.get("color")) or (DIM if line.get("dimColor") else FG)
        out = [(ch, fg, None) for ch in line["text"]]
    if line.get("align") == "center":
        out = [(" ", FG, None)] * ((width - len(out)) // 2) + out
    return out

def glyph(ch, x, y, fg, bg):
    """SVG for one cell at (x, y) top-left."""
    s = []
    if bg and ch != "▀":
        s.append(f'<rect x="{x:.1f}" y="{y}" width="{CW}" height="{LH}" fill="{bg}"/>')
    mx, my = x + CW / 2, y + LH / 2
    if ch == "█":
        s.append(f'<rect x="{x:.1f}" y="{y+2}" width="{CW+.4}" height="{LH-4}" fill="{fg}"/>')
    elif ch == "░":
        s.append(f'<rect x="{x:.1f}" y="{y+2}" width="{CW+.4}" height="{LH-4}" fill="{fg}" opacity="0.22"/>')
    elif ch == "▀":
        s.append(f'<rect x="{x:.1f}" y="{y+2}" width="{CW+.4}" height="{(LH-4)/2}" fill="{fg}"/>')
        if bg:
            s.append(f'<rect x="{x:.1f}" y="{y+2+(LH-4)/2}" width="{CW+.4}" height="{(LH-4)/2}" fill="{bg}"/>')
    elif ch == "▄":
        s.append(f'<rect x="{x:.1f}" y="{y+2+(LH-4)/2}" width="{CW+.4}" height="{(LH-4)/2}" fill="{fg}"/>')
    elif ch == "━":
        s.append(f'<line x1="{x:.1f}" y1="{my}" x2="{x+CW+.4:.1f}" y2="{my}" stroke="{fg}" stroke-width="3"/>')
    elif ch == "┈":
        s.append(f'<line x1="{x+1:.1f}" y1="{my}" x2="{x+CW/2-1:.1f}" y2="{my}" stroke="{fg}" stroke-width="1.4"/>')
        s.append(f'<line x1="{x+CW/2+1:.1f}" y1="{my}" x2="{x+CW-1:.1f}" y2="{my}" stroke="{fg}" stroke-width="1.4"/>')
    elif ch == "┃":
        s.append(f'<line x1="{mx:.1f}" y1="{y}" x2="{mx:.1f}" y2="{y+LH}" stroke="{fg}" stroke-width="3"/>')
    elif ch == "│":
        s.append(f'<line x1="{mx:.1f}" y1="{y}" x2="{mx:.1f}" y2="{y+LH}" stroke="{fg}" stroke-width="1.4"/>')
    elif ch == "┊":
        s.append(f'<line x1="{mx:.1f}" y1="{y+1}" x2="{mx:.1f}" y2="{y+LH/2-1.5}" stroke="{fg}" stroke-width="1.4"/>')
        s.append(f'<line x1="{mx:.1f}" y1="{y+LH/2+1.5}" x2="{mx:.1f}" y2="{y+LH-1}" stroke="{fg}" stroke-width="1.4"/>')
    elif ch in "┏┓┗┛":
        sw = 3
        hx = x + CW if ch in "┏┗" else x
        vy = y + LH if ch in "┏┓" else y
        ex = x + CW if ch in "┏┗" else x
        s.append(f'<line x1="{mx:.1f}" y1="{my}" x2="{(x+CW if ch in "┏┗" else x):.1f}" y2="{my}" stroke="{fg}" stroke-width="{sw}"/>')
        s.append(f'<line x1="{mx:.1f}" y1="{my-1.5 if ch in "┏┓" else my+1.5}" x2="{mx:.1f}" y2="{(y+LH if ch in "┏┓" else y):.1f}" stroke="{fg}" stroke-width="{sw}"/>')
    elif ch in "╭╮╰╯":
        right = ch in "╭╰"
        down = ch in "╭╮"
        x2 = x + CW if right else x
        y2 = y + LH if down else y
        s.append(f'<path d="M {mx:.1f} {y2} Q {mx:.1f} {my} {x2:.1f} {my}" fill="none" stroke="{fg}" stroke-width="1.4"/>')
    elif ch != " ":
        s.append(f'<text x="{x:.1f}" y="{y+LH-6}" fill="{fg}">{escape(ch)}</text>')
    return "".join(s)

def svg(name, lines, width, title=None):
    rows = [cells_of(l, width) for l in lines]
    w = int(width * CW + PAD * 2)
    h = int(len(rows) * LH + PAD * 2)
    body = []
    for r, cells in enumerate(rows):
        y = PAD + r * LH
        for c, (ch, fg, bg) in enumerate(cells):
            body.append(glyph(ch, PAD + c * CW, y, fg, bg))
    t = f"<title>{escape(title)}</title>" if title else ""
    open(f"{OUT}/{name}.svg", "w").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
        f'font-family="DejaVu Sans Mono, Menlo, Consolas, monospace" font-size="{FS}">{t}'
        f'<rect width="{w}" height="{h}" rx="8" fill="{BG}"/>' + "".join(body) + "</svg>"
    )

W = 40
svg("time", d["time"], W, "The time group")
svg("claude", d["session"] + [{"text": " "}] + d["footnote"], W, "The Claude group and its footnote")
svg("project", d["project"], W, "The project group")
svg("system", d["system"], W, "The system group")
svg("overview", d["overview"], W, "The whole band")
# The credit at a band wide enough (76 columns) for the name and the email to share a row.
DARK, BRIGHT = "#b36200", "#ff8c00"
inner = 72
first = "© 2026 Alberto Rodriguez Baixauli │ a@webtory.es"
lic = "GNU GPL v3 or later"
def row(text):
    pad = (inner - len(text)) // 2
    t = " " * pad + text + " " * (inner - pad - len(text))
    at = t.find("a@webtory.es")
    cells = [{"text": "┊ ", "color": DARK}]
    if at >= 0:
        cells += [{"text": t[:at], "color": DARK}, {"text": "a@webtory.es", "color": BRIGHT}, {"text": t[at+12:], "color": DARK}]
    else:
        cells += [{"text": t, "color": DARK}]
    cells += [{"text": " ┊", "color": DARK}]
    return {"text": "", "cells": cells}
credit = [{"text": "╭" + "┈" * (inner + 2) + "╮", "color": DARK}, row(first), row(lic), {"text": "╰" + "┈" * (inner + 2) + "╯", "color": DARK}]
svg("credit", credit, inner + 4, "The credit")
print("ok")
