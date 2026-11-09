// Builds the profile README and its SVG assets in the Astryx neutral theme.
//
// GitHub READMEs cannot load React, CSS or web fonts, so the Astryx components
// used here (Card, Token, StatusDot, Button, Divider, Heading, Text) are drawn
// as SVG with the metrics measured from the real components
// (scripts/astryx-reference.mjs) and every color, radius, spacing and type value
// read from the theme's own tokens. Figtree is subset and embedded per file.
//
// Run: npm run build

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ArrowUpRight} from 'lucide-react';
import * as fontkit from 'fontkit';
import subsetFont from 'subset-font';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NM = path.join(ROOT, 'node_modules');
const ASSETS = path.join(ROOT, 'assets');
const MODES = ['light', 'dark'];

// ---------------------------------------------------------------- tokens ----

function parseTokens(file) {
  const css = fs.readFileSync(file, 'utf8');
  const map = new Map();
  for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+)/g)) {
    if (!map.has(m[1])) map.set(m[1], m[2].trim()); // first definition is the base theme
  }
  return map;
}
const themeTokens = parseTokens(path.join(NM, '@astryxdesign/theme-neutral/dist/theme.css'));
const coreTokens = parseTokens(path.join(NM, '@astryxdesign/core/dist/astryx.css'));

function splitTopLevel(s) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** Resolve a token to a concrete value for one color mode. */
function tok(name, mode) {
  let v = themeTokens.get(name) ?? coreTokens.get(name);
  if (v == null) throw new Error(`unknown token ${name}`);
  for (let i = 0; i < 10; i++) {
    const ld = v.match(/^light-dark\((.*)\)$/s);
    if (ld) { const [l, d] = splitTopLevel(ld[1]); v = mode === 'dark' ? d : l; continue; }
    const ref = v.match(/^var\((--[a-z0-9-]+)\)$/);
    if (ref) { v = themeTokens.get(ref[1]) ?? coreTokens.get(ref[1]); continue; }
    break;
  }
  return v;
}
/** Token as a pixel number (rem = 16px). */
function px(name) {
  const v = String(tok(name, 'light'));
  if (v.endsWith('rem')) return parseFloat(v) * 16;
  if (v.endsWith('px')) return parseFloat(v);
  return parseFloat(v);
}
const space = step => px(`--spacing-${String(step).replace('.', '-')}`);

// Text styles from the type-scale tokens, with Figtree weights from the theme.
function textStyle(key) {
  const size = px(`--text-${key}-size`);
  let weight = Number(tok(`--text-${key}-weight`, 'light'));
  if (key === 'heading-3' || key === 'heading-4') weight = 700; // neutral theme: bold h3/h4
  const leading = Number(tok(`--text-${key}-leading`, 'light'));
  return {size, weight, lh: Math.round(size * leading)};
}
const T = {
  display1: textStyle('display-1'),
  display3: textStyle('display-3'),
  h3: textStyle('heading-3'),
  h5: textStyle('heading-5'),
  large: textStyle('large'),
  body: textStyle('body'),
  label: textStyle('label'),
  supporting: textStyle('supporting'),
};

// Component metrics measured from the rendered Astryx components (neutral theme).
const M = {
  token: {md: 24, sm: 20, padX: space(2), size: T.supporting.size, weight: 500, radius: px('--radius-inner')},
  button: {h: px('--size-element-md'), padX: space(3), gap: space(2), size: T.label.size, weight: 500, radius: px('--radius-element'), icon: 16},
  dot: 8,
  card: {radius: px('--radius-container'), border: px('--border-width')},
};

// ----------------------------------------------------------------- fonts ----

const FONT_FAMILY = 'Figtree';
const CODE_STACK = tok('--font-family-code', 'light');
const BODY_STACK = tok('--font-family-body', 'light');
const fontFiles = {};
const fonts = {};
for (const w of [400, 500, 600, 700]) {
  fontFiles[w] = fs.readFileSync(path.join(NM, `@fontsource/figtree/files/figtree-latin-${w}-normal.woff2`));
  fonts[w] = (fontkit.create ?? fontkit.default.create)(fontFiles[w]);
}

function measure(text, size, weight) {
  const f = fonts[weight];
  return (f.layout(text).advanceWidth * size) / f.unitsPerEm;
}
/** Cumulative advance after each character (for typing clips). */
function advances(text, size, weight) {
  const f = fonts[weight];
  const run = f.layout(text);
  const out = [0];
  let x = 0;
  for (const p of run.positions) { x += (p.xAdvance * size) / f.unitsPerEm; out.push(x); }
  return out;
}
/** Baseline y for text of `style` whose line box starts at `top`. */
function baseline(top, style) {
  const f = fonts[style.weight];
  const asc = (f.ascent * style.size) / f.unitsPerEm;
  const content = ((f.ascent - f.descent) * style.size) / f.unitsPerEm;
  return top + (style.lh - content) / 2 + asc;
}
function wrap(text, style, width) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (measure(next, style.size, style.weight) <= width || !cur) cur = next;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// --------------------------------------------------------------- document ----

class Doc {
  constructor(width, height, mode, title) {
    Object.assign(this, {width, height, mode, title, parts: [], glyphs: {}, styles: []});
  }
  c(name) { return tok(name, this.mode); }
  use(text, weight) { (this.glyphs[weight] ??= new Set()); for (const ch of text) this.glyphs[weight].add(ch); }
  add(svg) { this.parts.push(svg); }
  text(str, x, y, style, color, extra = '') {
    this.use(str, style.weight);
    this.add(`<text x="${r(x)}" y="${r(y)}" font-size="${style.size}" font-weight="${style.weight}" fill="${color}"${extra}>${esc(str)}</text>`);
  }
  code(str, x, y, size, color, extra = '') {
    this.add(`<text class="code" x="${r(x)}" y="${r(y)}" font-size="${size}" fill="${color}"${extra}>${esc(str)}</text>`);
  }
  async render() {
    const faces = [];
    for (const [w, set] of Object.entries(this.glyphs)) {
      const sub = await subsetFont(fontFiles[w], [...set].join(''), {targetFormat: 'woff2'});
      faces.push(`@font-face{font-family:'${FONT_FAMILY}';font-weight:${w};src:url(data:font/woff2;base64,${sub.toString('base64')}) format('woff2');}`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}" role="img" aria-label="${esc(this.title)}">
<title>${esc(this.title)}</title>
<style>${faces.join('')}
text{font-family:'${FONT_FAMILY}',${BODY_STACK.replace(/^Figtree,\s*/, '')};}
text.code{font-family:${CODE_STACK};}
${this.styles.join('\n')}</style>
${this.parts.join('\n')}
</svg>
`;
  }
}
const r = n => Math.round(n * 100) / 100;

// ------------------------------------------------------------ components ----

function cardFrame(doc, x, y, w, hgt) {
  const b = M.card.border;
  doc.add(`<rect x="${x + b / 2}" y="${y + b / 2}" width="${w - b}" height="${hgt - b}" rx="${M.card.radius - b / 2}" fill="${doc.c('--color-background-card')}" stroke="${doc.c('--color-border')}" stroke-width="${b}"/>`);
}
function tokenWidth(label) {
  return M.token.padX * 2 + measure(label, M.token.size, M.token.weight);
}
function token(doc, label, x, y, size = 'md') {
  const hgt = M.token[size];
  const w = tokenWidth(label);
  doc.add(`<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${hgt}" rx="${M.token.radius}" fill="${doc.c('--color-neutral')}"/>`);
  const style = {size: M.token.size, weight: M.token.weight, lh: hgt};
  doc.text(label, x + M.token.padX, baseline(y, style), style, doc.c('--color-text-primary'));
  return w;
}
function tokenLines(labels, maxW, gap) {
  const lines = [[]];
  let cx = 0;
  for (const label of labels) {
    const w = tokenWidth(label);
    if (cx > 0 && cx + w > maxW) { lines.push([]); cx = 0; }
    lines.at(-1).push(label);
    cx += w + gap;
  }
  return lines;
}
/**
 * Lay tokens out in rows no wider than maxW, balanced like CSS `text-wrap: balance`:
 * keep the fewest rows, then narrow the width so no row is left with a lone token.
 * Returns the height used.
 */
function tokenRow(doc, labels, x, y, maxW, size = 'md', gap = space(1.5)) {
  const rows = tokenLines(labels, maxW, gap).length;
  let lo = 0, hi = maxW;
  while (hi - lo > 1) {
    const mid = (lo + hi) / 2;
    if (tokenLines(labels, mid, gap).length <= rows) hi = mid; else lo = mid;
  }
  const lines = tokenLines(labels, hi, gap);
  const hgt = M.token[size];
  lines.forEach((line, i) => {
    let cx = x;
    for (const label of line) {
      if (doc) token(doc, label, cx, y + i * (hgt + gap), size);
      cx += tokenWidth(label) + gap;
    }
  });
  return lines.length * hgt + (lines.length - 1) * gap;
}
const DOT_VARIANT = {success: '--color-text-success', warning: '--color-text-warning', accent: '--color-accent'};
function statusDot(doc, variant, cx, cy) {
  doc.add(`<circle cx="${r(cx)}" cy="${r(cy)}" r="${M.dot / 2}" fill="${doc.c(DOT_VARIANT[variant])}"/>`);
}
function divider(doc, x, y, w) {
  doc.add(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${doc.c('--color-border')}"/>`);
}
const ARROW_UP_RIGHT = renderToStaticMarkup(h(ArrowUpRight, {size: 16}))
  .replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
function icon(doc, inner, x, y, size, color) {
  doc.add(`<svg x="${r(x)}" y="${r(y)}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`);
}

// ------------------------------------------------------------- content ----

const GRID_GAP = space(3); // visual gap between paired tiles (inline space adds ~4px)
const TILE_W = 411;
const TILE_PAD_R = GRID_GAP - 4;
const FULL_W = TILE_W * 2 + GRID_GAP;

const PROFILE = {
  name: 'Badrish M Srinivasan',
  role: 'AI Engineer',
  phrases: ['LLM & RAG systems', 'agentic workflows', 'data pipelines', 'reproducible ML'],
  credentials: ['M.Sc. Data Engineering', 'AWS Certified Data Engineer', 'Bremen, Germany'],
  status: 'Open to AI Engineer roles in Germany',
};

const BUTTONS = [
  {slug: 'linkedin', label: 'LinkedIn', variant: 'primary', href: 'https://www.linkedin.com/in/badrishms', alt: 'LinkedIn: badrishms'},
  {slug: 'meldify', label: 'Meldify live demo', variant: 'secondary', href: 'https://meldify.130-61-142-164.sslip.io', alt: 'Meldify live demo'},
];

const METRICS = [
  {label: 'Retrieval hit rate · Oakter', value: '82%', desc: 'up from 76% after adding reranking to an Azure OpenAI RAG assistant over 250+ manuals and 10,000+ incident records'},
  {label: 'Response time · Oakter', value: '6s', desc: 'down from about 10s on the same assistant, traced with OpenTelemetry, Grafana and CloudWatch'},
  {label: 'Lower forecast error · SMS group', value: '~50%', desc: '0.1014 pp MAE for hot-metal silicon after replacing a GRU with a small 1D CNN, on 188,700 rows of sensor data'},
  {label: 'M.Sc. thesis · Constructor University', value: '213 / 214', desc: 'per-seed tests where the quantum reservoir did significantly worse than the classical one, all surviving Holm–Bonferroni'},
];

const PROJECTS = [
  {slug: 'maintenance-copilot', title: 'Maintenance Copilot', href: 'https://github.com/baddy1411/maintenance-copilot', status: ['warning', 'In progress'],
    desc: 'Cited Q&A and an approval-gated troubleshooting agent over FAA Airworthiness Directives, Service Difficulty Reports and AMT handbooks.',
    stack: ['LangGraph', 'pgvector', 'FastAPI', 'RAG', 'Python']},
  {slug: 'meldify', title: 'Meldify', href: 'https://meldify.130-61-142-164.sslip.io', status: ['success', 'Live'],
    desc: 'AI data-cleaning platform that matches CRM and billing records, shows where each mapping came from, and previews every change. Ships an MCP server.',
    stack: ['React', 'TypeScript', 'FastAPI', 'PostgreSQL', 'MCP']},
  {slug: 'qde-benchmark', title: 'Reservoir computing benchmark', href: 'https://github.com/baddy1411/qde-benchmark', meta: 'M.Sc. thesis',
    desc: 'Quantum vs classical reservoirs on chaotic time series: classical won all 26 matched comparisons. 131 tests, 8 fault-injection gates, two-minute make verify.',
    stack: ['Python', 'Time series', 'Reproducibility', 'Docker']},
  {slug: 'sensorops', title: 'SensorOps', href: 'https://github.com/baddy1411/sensorops', meta: '93 tests',
    desc: 'Predictive maintenance with three benchmarked anomaly detectors, a RAG copilot that writes incident reports, and a hash-chained audit log.',
    stack: ['PyTorch', 'Dagster', 'MLflow', 'ChromaDB', 'FastAPI']},
  {slug: 'compliance-assistant', title: 'Compliance Assistant', href: 'https://github.com/baddy1411/compliance-assistant',
    desc: 'RAG over GDPR and EU AI Act documents that cites its sources and says “I don’t know” when they don’t cover the question. Includes evals and a LoRA path.',
    stack: ['ChromaDB', 'sentence-transformers', 'LoRA', 'FastAPI']},
  {slug: 'medallion-lakehouse', title: 'Real-time medallion lakehouse', href: 'https://github.com/baddy1411/real-time-medallion-lakehouse',
    desc: 'Kafka into Spark Structured Streaming, Iceberg tables with a quarantine for bad rows, Polars microbatches, and dbt + DuckDB, all on Kubernetes.',
    stack: ['Kafka', 'Spark', 'Iceberg', 'dbt', 'Kubernetes']},
];

const STACK = [
  {slug: 'languages', label: 'Languages', items: ['Python', 'SQL', 'C', 'C++', 'Bash', 'TypeScript']},
  {slug: 'ai', label: 'AI & LLM', items: ['RAG', 'Agents', 'Tool calling', 'Structured outputs', 'LLM evaluation', 'LoRA', 'MCP', 'LangGraph', 'LangChain', 'Hugging Face']},
  {slug: 'ml', label: 'ML & experiments', items: ['PyTorch', 'TensorFlow', 'scikit-learn', 'MLflow', 'Optuna', 'Dagster']},
  {slug: 'providers', label: 'LLM providers', items: ['Azure OpenAI', 'OpenAI', 'Anthropic']},
  {slug: 'data', label: 'Backend & data', items: ['FastAPI', 'Pydantic', 'React', 'PostgreSQL', 'pgvector', 'MongoDB', 'Redis', 'PySpark', 'Kafka', 'Polars', 'dbt', 'DuckDB', 'Airflow']},
  {slug: 'cloud', label: 'Cloud & DevOps', items: ['AWS', 'Azure', 'Docker', 'Kubernetes', 'GitHub Actions', 'Jenkins', 'Prometheus', 'Grafana', 'OpenTelemetry']},
];

// --------------------------------------------------------------- header ----

function lorenz(n = 2000, dt = 0.004, sub = 3, start = 15800) {
  const [sigma, rho, beta] = [10, 28, 8 / 3];
  const f = ([x, y, z]) => [sigma * (y - x), x * (rho - z) - y, x * y - beta * z];
  let s = [0.1, 0, 0];
  const pts = [];
  for (let i = 0; i < (start + n) * sub; i++) {
    const k1 = f(s);
    const k2 = f(s.map((v, j) => v + (dt / 2) * k1[j]));
    const k3 = f(s.map((v, j) => v + (dt / 2) * k2[j]));
    const k4 = f(s.map((v, j) => v + dt * k3[j]));
    s = s.map((v, j) => v + (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    if (i % sub === 0 && i / sub >= start) pts.push(s);
  }
  return pts;
}
function attractorPath(cx, cy, boxW, boxH) {
  const pts = lorenz();
  const xs = pts.map(p => p[0]), zs = pts.map(p => p[2]);
  const [xmin, xmax, zmin, zmax] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const sz = boxH / (zmax - zmin);
  const sx = Math.min(sz * 1.3, boxW / (xmax - xmin));
  const proj = pts.map(([x, , z]) => [cx + (x - (xmax + xmin) / 2) * sx, cy - (z - (zmax + zmin) / 2) * sz]);
  let len = 0;
  for (let i = 1; i < proj.length; i++) len += Math.hypot(proj[i][0] - proj[i - 1][0], proj[i][1] - proj[i - 1][1]);
  return {d: 'M' + proj.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L'), len: Math.ceil(len) + 10};
}

async function header(mode) {
  const pad = space(8);
  const eyebrow = {size: 12, weight: 400, lh: 20};
  const top = {eyebrow: pad};
  top.name = top.eyebrow + eyebrow.lh + space(2);
  top.role = top.name + T.display1.lh + space(1);
  top.tokens = top.role + T.large.lh + space(5);
  top.status = top.tokens + M.token.md + space(3);
  const H = top.status + T.supporting.lh + pad;
  const doc = new Doc(FULL_W, H, mode, `${PROFILE.name}, ${PROFILE.role}`);
  cardFrame(doc, 0, 0, FULL_W, H);

  doc.code('~/badrish $ whoami', pad, baseline(top.eyebrow, {...eyebrow}), 12, doc.c('--color-text-secondary'));
  doc.text(PROFILE.name, pad - 2, baseline(top.name, T.display1), T.display1, doc.c('--color-text-primary'), ' letter-spacing="-0.5"');

  // Role line: "AI Engineer · " then phrases typed and deleted one character at a time.
  const roleY = baseline(top.role, T.large);
  doc.text(PROFILE.role, pad, roleY, T.large, doc.c('--color-text-primary'));
  const sep = '  ·  ';
  const phraseStyle = {...T.large, weight: 400};
  const startX = pad + measure(PROFILE.role, T.large.size, T.large.weight) + measure(sep, phraseStyle.size, 400);
  doc.text('·', pad + measure(PROFILE.role, T.large.size, T.large.weight) + measure('  ', phraseStyle.size, 400), roleY, phraseStyle, doc.c('--color-text-secondary'));
  const cycle = 12, n = PROFILE.phrases.length, win = 1 / n;
  const caretH = 20, caretTop = top.role + (T.large.lh - caretH) / 2;
  const typing = [];
  PROFILE.phrases.forEach((phrase, i) => {
    const adv = advances(phrase, phraseStyle.size, 400);
    const k = phrase.length;
    const [typeEnd, holdEnd, eraseEnd] = [win * 0.42, win * 0.86, win * 0.97];
    const times = [], widths = [];
    for (let c = 0; c <= k; c++) { times.push((typeEnd * c) / k); widths.push(adv[c]); }
    for (let c = 1; c <= k; c++) { times.push(holdEnd + ((eraseEnd - holdEnd) * c) / k); widths.push(adv[k - c]); }
    times.push(1); widths.push(0);
    const kt = times.map(t => t.toFixed(4)).join(';');
    const begin = `${((i * cycle) / n).toFixed(2)}s`;
    const common = `dur="${cycle}s" begin="${begin}" repeatCount="indefinite" calcMode="discrete" keyTimes="${kt}"`;
    doc.use(phrase, 400);
    typing.push(`<clipPath id="clip${i}"><rect x="${r(startX)}" y="${top.role}" width="0" height="${T.large.lh}"><animate attributeName="width" values="${widths.map(w => r(w + (w ? 1 : 0))).join(';')}" ${common}/></rect></clipPath>
<text x="${r(startX)}" y="${r(roleY)}" font-size="${phraseStyle.size}" font-weight="400" fill="${doc.c('--color-text-secondary')}" clip-path="url(#clip${i})">${esc(phrase)}</text>
<g class="caret"><rect x="${r(startX)}" y="${r(caretTop)}" width="2" height="${caretH}" rx="1" fill="${doc.c('--color-accent')}" opacity="0"><animate attributeName="x" values="${widths.map(w => r(startX + w + 1)).join(';')}" ${common}/><animate attributeName="opacity" values="1;0" keyTimes="0;${win.toFixed(4)}" dur="${cycle}s" begin="${begin}" repeatCount="indefinite" calcMode="discrete"/></rect></g>`);
  });
  doc.add(`<g class="typing">${typing.join('\n')}</g>`);
  doc.use(PROFILE.phrases[0], 400);
  doc.add(`<text class="static" x="${r(startX)}" y="${r(roleY)}" font-size="${phraseStyle.size}" font-weight="400" fill="${doc.c('--color-text-secondary')}">${esc(PROFILE.phrases.slice(0, 2).join(', '))}</text>`);
  doc.use(PROFILE.phrases.slice(0, 2).join(', '), 400);

  tokenRow(doc, PROFILE.credentials, pad, top.tokens, 500, 'md', space(2));
  statusDot(doc, 'success', pad + M.dot / 2, top.status + T.supporting.lh / 2);
  doc.text(PROFILE.status, pad + M.dot + space(2), baseline(top.status, T.supporting), T.supporting, doc.c('--color-text-secondary'));

  // Lorenz attractor, drawn on a loop: a nod to the chaotic time series in the thesis.
  const boxW = 260, boxH = H - pad * 2 - 24;
  const right = FULL_W - pad;
  const {d, len} = attractorPath(right - boxW / 2, pad + boxH / 2, boxW, boxH);
  const draw = 16;
  doc.add(`<path d="${d}" fill="none" stroke="${doc.c('--color-border-emphasized')}" stroke-width="0.6"/>
<path id="trace" class="trace" d="${d}" fill="none" stroke="${doc.c('--color-text-secondary')}" stroke-width="1" stroke-linejoin="round"/>
<g class="runner"><circle r="3" fill="${doc.c('--color-accent')}"><animateMotion dur="${draw}s" repeatCount="indefinite" calcMode="linear" keyPoints="0;1;1" keyTimes="0;0.8;1"><mpath xlink:href="#trace" href="#trace"/></animateMotion><animate attributeName="opacity" values="1;1;0" keyTimes="0;0.94;1" dur="${draw}s" repeatCount="indefinite"/></circle></g>`);
  doc.code('lorenz system · σ=10 ρ=28 β=8/3', right, H - pad + 4, 11, doc.c('--color-text-secondary'), ' text-anchor="end"');

  doc.styles.push(`.trace{stroke-dasharray:${len};stroke-dashoffset:${len};animation:draw ${draw}s linear infinite;}
@keyframes draw{0%{stroke-dashoffset:${len};opacity:1}80%{stroke-dashoffset:0;opacity:1}94%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}
.caret{animation:blink 1s steps(1) infinite;}@keyframes blink{50%{opacity:0}}
.static{display:none;}
@media (prefers-reduced-motion: reduce){.trace{animation:none;stroke-dashoffset:0}.typing,.runner{display:none}.static{display:inline}.caret{animation:none}}`);
  return doc;
}

// ------------------------------------------------------------- buttons ----

async function button(b, mode) {
  const textW = measure(b.label, M.button.size, M.button.weight);
  const w = M.button.padX * 2 + textW + M.button.gap + M.button.icon;
  const doc = new Doc(Math.ceil(w) + 4, M.button.h, mode, b.alt);
  const bg = b.variant === 'primary' ? doc.c('--color-accent') : doc.c('--color-neutral');
  const fg = b.variant === 'primary' ? doc.c('--color-on-accent') : doc.c('--color-text-primary');
  doc.add(`<rect width="${r(w)}" height="${M.button.h}" rx="${M.button.radius}" fill="${bg}"/>`);
  const style = {size: M.button.size, weight: M.button.weight, lh: M.button.h};
  doc.text(b.label, M.button.padX, baseline(0, style), style, fg);
  icon(doc, ARROW_UP_RIGHT, M.button.padX + textW + M.button.gap, (M.button.h - M.button.icon) / 2, M.button.icon, fg);
  return doc;
}

// ------------------------------------------------------------- metrics ----

async function metric(m, mode, lines) {
  const pad = space(5);
  const inner = TILE_W - pad * 2;
  const H = pad + T.supporting.lh + space(1) + T.display3.lh + space(1) + lines * T.body.lh + pad;
  const doc = new Doc(TILE_W + TILE_PAD_R, H + TILE_PAD_R, mode, `${m.label}: ${m.value}, ${m.desc}`);
  cardFrame(doc, 0, 0, TILE_W, H);
  let y = pad;
  doc.text(m.label, pad, baseline(y, T.supporting), T.supporting, doc.c('--color-text-secondary'));
  y += T.supporting.lh + space(1);
  doc.text(m.value, pad - 1, baseline(y, T.display3), T.display3, doc.c('--color-text-primary'));
  y += T.display3.lh + space(1);
  for (const line of wrap(m.desc, T.body, inner)) {
    doc.text(line, pad, baseline(y, T.body), T.body, doc.c('--color-text-secondary'));
    y += T.body.lh;
  }
  return doc;
}

// ------------------------------------------------------------ projects ----

function projectLayout(p) {
  const descLines = wrap(p.desc, T.body, TILE_W).length;
  const tokensH = tokenRow(null, p.stack, 0, 0, TILE_W, 'sm');
  return {descLines, tokensH};
}
async function project(p, mode, maxLines, maxTokensH) {
  const top = space(4), bottom = space(6);
  const H = top + T.h3.lh + space(1.5) + maxLines * T.body.lh + space(3) + maxTokensH + bottom;
  const doc = new Doc(TILE_W + TILE_PAD_R, H, mode, `${p.title}: ${p.desc}`);
  divider(doc, 0, 0, TILE_W);
  let y = top;
  const titleW = measure(p.title, T.h3.size, T.h3.weight);
  doc.text(p.title, 0, baseline(y, T.h3), T.h3, doc.c('--color-text-primary'));
  icon(doc, ARROW_UP_RIGHT, titleW + space(1), y + (T.h3.lh - 16) / 2, 16, doc.c('--color-text-secondary'));
  if (p.status || p.meta) {
    const label = p.status ? p.status[1] : p.meta;
    const lw = measure(label, T.supporting.size, T.supporting.weight);
    const lx = TILE_W - lw;
    doc.text(label, lx, baseline(y + (T.h3.lh - T.supporting.lh) / 2, T.supporting), T.supporting, doc.c('--color-text-secondary'));
    if (p.status) statusDot(doc, p.status[0], lx - space(2) - M.dot / 2, y + T.h3.lh / 2);
  }
  y += T.h3.lh + space(1.5);
  for (const line of wrap(p.desc, T.body, TILE_W)) {
    doc.text(line, 0, baseline(y, T.body), T.body, doc.c('--color-text-secondary'));
    y += T.body.lh;
  }
  y = top + T.h3.lh + space(1.5) + maxLines * T.body.lh + space(3);
  tokenRow(doc, p.stack, 0, y, TILE_W, 'sm');
  return doc;
}

// --------------------------------------------------------------- stack ----

async function stackGroup(g, mode, maxTokensH) {
  const top = space(4), bottom = space(6);
  const H = top + T.h5.lh + space(2) + maxTokensH + bottom;
  const doc = new Doc(TILE_W + TILE_PAD_R, H, mode, `${g.label}: ${g.items.join(', ')}`);
  divider(doc, 0, 0, TILE_W);
  doc.text(g.label, 0, baseline(top, T.h5), T.h5, doc.c('--color-text-secondary'));
  tokenRow(doc, g.items, 0, top + T.h5.lh + space(2), TILE_W, 'md');
  return doc;
}

// -------------------------------------------------------------- README ----

const pic = (base, alt, width, href) => {
  const img = `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/${base}-dark.svg"><img alt="${esc(alt)}" src="assets/${base}-light.svg" width="${width}"></picture>`;
  return href ? `<a href="${href}">${img}</a>` : img;
};
// One paragraph per section: tiles flow two per row at GitHub's 846px column and
// stack evenly on narrower ones. Each tile carries its own gap on the right/bottom.
const pairs = items => `<p>\n${items.join('\n')}\n</p>`;

function readme(sizes) {
  return `${pic('header', `${PROFILE.name}, ${PROFILE.role}. ${PROFILE.credentials.join(' · ')}. ${PROFILE.status}.`, FULL_W)}

<p>
${BUTTONS.map(b => pic(`button-${b.slug}`, b.alt, sizes.buttons[b.slug], b.href)).join('\n')}
</p>

## About me

I build LLM applications that have to be right, not just fluent: retrieval that cites its sources, agents that ask before they act, and evaluations that measure how often the answer is correct. I spent two years in test automation before moving into AI, so my main projects ship with CI and a test suite.

- **Now:** building [Maintenance Copilot](https://github.com/baddy1411/maintenance-copilot), cited Q&A and an approval-gated agent over live FAA maintenance data
- **Education:** M.Sc. Computer Science, Data Engineering, Constructor University Bremen (grade 1.72), with a thesis on quantum vs classical reservoir computing for chaotic time-series forecasting
- **Before:** RAG engineering at Oakter (New Delhi) and test automation at Capgemini (Pune)
- **Certified:** AWS Certified Data Engineer – Associate · DataCamp AI Engineer Associate
- **Languages:** English (C1) · German (B1, learning)

## Results I can point to

${pairs(METRICS.map((m, i) => pic(`metric-${i + 1}`, `${m.label}: ${m.value}, ${m.desc}`, TILE_W + TILE_PAD_R)))}

## Featured projects

${pairs(PROJECTS.map(p => pic(`project-${p.slug}`, `${p.title}: ${p.desc} Built with ${p.stack.join(', ')}.`, TILE_W + TILE_PAD_R, p.href)))}

<sub>More data engineering: <a href="https://github.com/baddy1411/nyc-taxi-lakehouse">nyc-taxi-lakehouse</a> · <a href="https://github.com/baddy1411/carbon-intelligence-platform">carbon-intelligence-platform</a></sub>

## Tech stack

${pairs(STACK.map(g => pic(`stack-${g.slug}`, `${g.label}: ${g.items.join(', ')}`, TILE_W + TILE_PAD_R)))}

<sub>Built with the <a href="https://github.com/meta/astryx">Astryx</a> neutral theme. Assets are generated by <code>npm run build</code>.</sub>
`;
}

// ---------------------------------------------------------------- main ----

async function main() {
  fs.mkdirSync(ASSETS, {recursive: true});
  for (const f of fs.readdirSync(ASSETS)) if (f.endsWith('.svg')) fs.unlinkSync(path.join(ASSETS, f));
  const write = async (name, doc) => fs.writeFileSync(path.join(ASSETS, `${name}-${doc.mode}.svg`), await doc.render());

  const metricLines = Math.max(...METRICS.map(m => wrap(m.desc, T.body, TILE_W - space(5) * 2).length));
  const projLayouts = PROJECTS.map(projectLayout);
  const projLines = Math.max(...projLayouts.map(l => l.descLines));
  const projTokensH = Math.max(...projLayouts.map(l => l.tokensH));
  const stackH = [];
  for (let i = 0; i < STACK.length; i += 2) {
    const pair = STACK.slice(i, i + 2).map(g => tokenRow(null, g.items, 0, 0, TILE_W, 'md'));
    stackH.push(Math.max(...pair), Math.max(...pair));
  }
  const sizes = {buttons: {}};
  for (const mode of MODES) {
    await write('header', await header(mode));
    for (const b of BUTTONS) {
      const doc = await button(b, mode);
      sizes.buttons[b.slug] = doc.width;
      await write(`button-${b.slug}`, doc);
    }
    for (const [i, m] of METRICS.entries()) await write(`metric-${i + 1}`, await metric(m, mode, metricLines));
    for (const p of PROJECTS) await write(`project-${p.slug}`, await project(p, mode, projLines, projTokensH));
    for (const [i, g] of STACK.entries()) await write(`stack-${g.slug}`, await stackGroup(g, mode, stackH[i]));
  }
  fs.writeFileSync(path.join(ROOT, 'README.md'), readme(sizes));
  const files = fs.readdirSync(ASSETS);
  const total = files.reduce((s, f) => s + fs.statSync(path.join(ASSETS, f)).size, 0);
  console.log(`wrote README.md and ${files.length} SVGs (${Math.round(total / 1024)} KB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
