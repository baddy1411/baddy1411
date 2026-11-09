"""Generate the animated profile header (assets/header-dark.svg, assets/header-light.svg).

The motif is a Lorenz attractor, a nod to the chaotic time-series work in my thesis.
Run:  python3 scripts/make_header.py
"""

from __future__ import annotations

import math
from pathlib import Path

W, H = 1000, 280
LEFT = 56

NAME = "Badrish M Srinivasan"
ROLE_PREFIX = "AI Engineer · "
PHRASES = ["LLM & RAG systems", "agentic workflows", "data pipelines", "reproducible ML"]
STATIC_PHRASE = "LLM, RAG & agentic systems"
CHIPS = ["M.Sc. Data Engineering", "AWS Certified Data Engineer", "Bremen, Germany"]

MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"
SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

ROLE_FS = 20
CHAR_W = ROLE_FS * 0.6  # monospace advance width
CYCLE = 12.0  # seconds for all four phrases
DRAW = 16.0  # seconds for one attractor draw loop

THEMES = {
    "dark": {
        "bg1": "#0d1117", "bg2": "#111b2e", "border": "#30363d",
        "text": "#e6edf3", "muted": "#8b949e", "accent": "#2dd4bf",
        "grid": "#ffffff", "grid_op": "0.07",
        "g1": "#2dd4bf", "g2": "#38bdf8", "g3": "#a78bfa",
        "chip_bg": "#161f2e", "chip_border": "#2b3a52", "dot": "#ffffff",
    },
    "light": {
        "bg1": "#ffffff", "bg2": "#f2f6fb", "border": "#d0d7de",
        "text": "#1f2328", "muted": "#59636e", "accent": "#0f766e",
        "grid": "#1f2328", "grid_op": "0.06",
        "g1": "#0d9488", "g2": "#0284c7", "g3": "#7c3aed",
        "chip_bg": "#ffffff", "chip_border": "#d0d7de", "dot": "#0f172a",
    },
}


def lorenz(n: int = 2000, dt: float = 0.004, sub: int = 3, start: int = 15800):
    """RK4-integrate the Lorenz system and keep a window that swings evenly between both wings."""
    sigma, rho, beta = 10.0, 28.0, 8.0 / 3.0

    def f(s):
        x, y, z = s
        return (sigma * (y - x), x * (rho - z) - y, x * y - beta * z)

    s = (0.1, 0.0, 0.0)
    pts = []
    for i in range((start + n) * sub):
        k1 = f(s)
        k2 = f(tuple(s[j] + dt / 2 * k1[j] for j in range(3)))
        k3 = f(tuple(s[j] + dt / 2 * k2[j] for j in range(3)))
        k4 = f(tuple(s[j] + dt * k3[j] for j in range(3)))
        s = tuple(s[j] + dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]) for j in range(3))
        if i % sub == 0 and i // sub >= start:
            pts.append(s)
    return pts


def attractor_path():
    pts = lorenz()
    xs = [p[0] for p in pts]
    zs = [p[2] for p in pts]
    box_cx, box_cy, box_w, box_h = 812, 130, 290, 206
    s = box_h / (max(zs) - min(zs))
    sx = min(s * 1.3, box_w / (max(xs) - min(xs)))  # widen the wings a little
    mx = (max(xs) + min(xs)) / 2
    mz = (max(zs) + min(zs)) / 2
    proj = [(box_cx + (x - mx) * sx, box_cy - (z - mz) * s) for x, z in zip(xs, zs)]
    d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in proj)
    length = sum(math.dist(proj[i], proj[i + 1]) for i in range(len(proj) - 1))
    return d, math.ceil(length) + 10


def esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def typing_anims(idx: int, start_x: float) -> str:
    """Per-character typing and deleting for one phrase, using discrete SMIL steps."""
    phrase = PHRASES[idx]
    n = len(phrase)
    window = 1.0 / len(PHRASES)
    type_end, hold_end, erase_end = window * 0.42, window * 0.86, window * 0.97
    times, widths = [], []
    for i in range(n + 1):
        times.append(type_end * i / n)
        widths.append(i * CHAR_W)
    for i in range(1, n + 1):
        times.append(hold_end + (erase_end - hold_end) * i / n)
        widths.append((n - i) * CHAR_W)
    times.append(1.0)
    widths.append(0)
    kt = ";".join(f"{t:.4f}" for t in times)
    begin = f"{idx * CYCLE / len(PHRASES):.2f}s"
    common = f'dur="{CYCLE}s" begin="{begin}" repeatCount="indefinite" calcMode="discrete" keyTimes="{kt}"'
    clip_vals = ";".join(f"{w + 2:.1f}" if w else "0" for w in widths)
    cursor_vals = ";".join(f"{start_x + w + 2:.1f}" for w in widths)
    vis = f'<animate attributeName="opacity" values="1;0" keyTimes="0;{window:.4f}" dur="{CYCLE}s" begin="{begin}" repeatCount="indefinite" calcMode="discrete"/>'
    y_top = 150
    return f"""
    <clipPath id="clip{idx}"><rect x="{start_x}" y="{y_top}" width="0" height="28"><animate attributeName="width" values="{clip_vals}" {common}/></rect></clipPath>
    <text class="role phrase" x="{start_x}" y="170" clip-path="url(#clip{idx})">{esc(phrase)}</text>
    <g class="blink"><rect class="cursor" x="{start_x + 2}" y="{y_top + 3}" width="10" height="22" rx="1" opacity="0"><animate attributeName="x" values="{cursor_vals}" {common}/>{vis}</rect></g>"""


def chips_svg(t) -> str:
    out, x = [], LEFT
    for label in CHIPS:
        w = len(label) * 7.5 + 30
        out.append(
            f'<g transform="translate({x:.1f} 202)"><rect width="{w:.1f}" height="30" rx="15" fill="{t["chip_bg"]}" stroke="{t["chip_border"]}"/>'
            f'<circle cx="15" cy="15" r="3" fill="{t["accent"]}"/>'
            f'<text class="chip" x="24" y="19.5">{esc(label)}</text></g>'
        )
        x += w + 10
    return "\n  ".join(out)


def build(theme: str) -> str:
    t = THEMES[theme]
    d, length = attractor_path()
    start_x = LEFT + len(ROLE_PREFIX) * CHAR_W
    phrases = "".join(typing_anims(i, start_x) for i in range(len(PHRASES)))
    return f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-labelledby="title desc">
  <title id="title">{esc(NAME)}</title>
  <desc id="desc">AI Engineer building LLM, RAG and agentic systems. M.Sc. Data Engineering, AWS Certified Data Engineer, based in Bremen, Germany. Animated Lorenz attractor on the right.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{t["bg1"]}"/><stop offset="1" stop-color="{t["bg2"]}"/>
    </linearGradient>
    <linearGradient id="stroke" gradientUnits="userSpaceOnUse" x1="677" y1="32" x2="947" y2="232">
      <stop offset="0" stop-color="{t["g1"]}"/><stop offset="0.5" stop-color="{t["g2"]}"/><stop offset="1" stop-color="{t["g3"]}"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="{t["g1"]}"/><stop offset="0.5" stop-color="{t["g2"]}"/><stop offset="1" stop-color="{t["g3"]}"/>
    </linearGradient>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="11" cy="11" r="1" fill="{t["grid"]}" fill-opacity="{t["grid_op"]}"/>
    </pattern>
    <radialGradient id="fade" cx="0.81" cy="0.47" r="0.42">
      <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <mask id="gridmask"><rect width="{W}" height="{H}" fill="url(#fade)"/></mask>
    <clipPath id="card"><rect width="{W}" height="{H}" rx="18"/></clipPath>
    <filter id="glow" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <style>
    .label {{ font: 500 14px {MONO}; fill: {t["muted"]}; }}
    .label .acc {{ fill: {t["accent"]}; }}
    .name {{ font: 700 46px {SANS}; fill: {t["text"]}; letter-spacing: -0.5px; }}
    .role {{ font: 500 {ROLE_FS}px {MONO}; fill: {t["text"]}; }}
    .role.prefix {{ fill: {t["accent"]}; }}
    .chip {{ font: 500 12.5px {MONO}; fill: {t["text"]}; }}
    .caption {{ font: 400 11px {MONO}; fill: {t["muted"]}; }}
    .cursor {{ fill: {t["accent"]}; }}
    .blink {{ animation: blink 1s steps(1) infinite; }}
    @keyframes blink {{ 50% {{ opacity: 0; }} }}
    .trace {{ fill: none; stroke: url(#stroke); stroke-width: 1.25; stroke-linejoin: round;
      stroke-dasharray: {length}; stroke-dashoffset: {length}; animation: draw {DRAW}s linear infinite; }}
    .ghost {{ fill: none; stroke: url(#stroke); stroke-width: 0.7; opacity: 0.3; }}
    @keyframes draw {{
      0% {{ stroke-dashoffset: {length}; opacity: 1; }}
      80% {{ stroke-dashoffset: 0; opacity: 1; }}
      94% {{ stroke-dashoffset: 0; opacity: 1; }}
      100% {{ stroke-dashoffset: 0; opacity: 0; }}
    }}
    .static {{ display: none; }}
    @media (prefers-reduced-motion: reduce) {{
      .trace {{ animation: none; stroke-dashoffset: 0; }}
      .typing, .runner {{ display: none; }}
      .static {{ display: inline; }}
      .blink {{ animation: none; }}
    }}
  </style>

  <g clip-path="url(#card)">
    <rect width="{W}" height="{H}" fill="url(#bg)"/>
    <rect width="{W}" height="{H}" fill="url(#dots)" mask="url(#gridmask)"/>
    <rect width="{W}" height="3" fill="url(#bar)"/>
  </g>
  <rect x="0.5" y="0.5" width="{W - 1}" height="{H - 1}" rx="18" fill="none" stroke="{t["border"]}"/>

  <text class="label" x="{LEFT}" y="74"><tspan class="acc">~</tspan> $ whoami</text>
  <text class="name" x="{LEFT - 2}" y="126">{esc(NAME)}</text>

  <text class="role prefix" x="{LEFT}" y="170">{esc(ROLE_PREFIX)}</text>
  <g class="typing">{phrases}
  </g>
  <text class="role static" x="{start_x}" y="170">{esc(STATIC_PHRASE)}</text>

  {chips_svg(t)}

  <path class="ghost" d="{d}"/>
  <path id="lorenz" class="trace" d="{d}"/>
  <g class="runner">
    <circle r="3.6" fill="{t["dot"]}" filter="url(#glow)">
      <animateMotion dur="{DRAW}s" repeatCount="indefinite" calcMode="linear" keyPoints="0;1;1" keyTimes="0;0.8;1"><mpath xlink:href="#lorenz" href="#lorenz"/></animateMotion>
      <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.94;1" dur="{DRAW}s" repeatCount="indefinite"/>
    </circle>
  </g>
  <text class="caption" x="944" y="256" text-anchor="end">lorenz system · σ=10 · ρ=28 · β=8/3</text>
</svg>
"""


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "assets"
    out.mkdir(exist_ok=True)
    for theme in THEMES:
        (out / f"header-{theme}.svg").write_text(build(theme), encoding="utf-8")
        print("wrote", out / f"header-{theme}.svg")
