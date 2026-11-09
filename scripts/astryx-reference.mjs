// Renders the real Astryx components (neutral theme) to static HTML so the SVG
// generator can copy their measured metrics. Usage: node scripts/astryx-reference.mjs <outDir>
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import * as themeMod from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import {Card} from '@astryxdesign/core/Card';
import {Token} from '@astryxdesign/core/Token';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Divider} from '@astryxdesign/core/Divider';
import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';

const Theme = themeMod.XDSTheme ?? themeMod.Theme;
const out = process.argv[2];
const scheme = process.argv[3] ?? 'light';

const app = h(Theme, {theme: neutralTheme},
  h(VStack, {gap: 6},
    h(Heading, {level: 1, 'data-ref': 'h1'}, 'Heading 1'),
    h(Heading, {level: 3, 'data-ref': 'h3'}, 'Heading 3'),
    h(Text, {'data-ref': 'body'}, 'Body text'),
    h(Text, {type: 'supporting', 'data-ref': 'supporting'}, 'Supporting text'),
    h(HStack, {gap: 2},
      h(Token, {label: 'Python', 'data-ref': 'token'}),
      h(Token, {label: 'Python', size: 'sm', 'data-ref': 'token-sm'}),
      h(Token, {label: 'LangGraph', color: 'teal', 'data-ref': 'token-teal'}),
    ),
    h(HStack, {gap: 2},
      h(StatusDot, {variant: 'success', label: 'Open to work', 'data-ref': 'dot'}),
      h(StatusDot, {variant: 'accent', label: 'Live', 'data-ref': 'dot-accent'}),
      h(StatusDot, {variant: 'warning', label: 'In progress', 'data-ref': 'dot-warning'}),
    ),
    h(HStack, {gap: 2},
      h(Button, {label: 'LinkedIn', href: '#', 'data-ref': 'btn'}),
      h(Button, {label: 'Live demo', variant: 'primary', href: '#', 'data-ref': 'btn-primary'}),
    ),
    h(Card, {'data-ref': 'card'}, h(Text, null, 'Card content')),
    h(Divider, {'data-ref': 'divider'}),
  ),
);

const html = `<!doctype html><html style="color-scheme:${scheme}"><head><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css"><link rel="stylesheet" href="reset.css">
<link rel="stylesheet" href="astryx.css"><link rel="stylesheet" href="theme.css">
<title>Astryx reference</title></head><body style="padding:24px">${renderToStaticMarkup(app)}</body></html>`;
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, `reference-${scheme}.html`), html);
const nm = path.resolve('node_modules');
fs.copyFileSync(path.join(nm, '@astryxdesign/core/dist/astryx.css'), path.join(out, 'astryx.css'));
fs.copyFileSync(path.join(nm, '@astryxdesign/core/src/reset.css'), path.join(out, 'reset.css'));
fs.copyFileSync(path.join(nm, '@astryxdesign/theme-neutral/dist/theme.css'), path.join(out, 'theme.css'));
fs.copyFileSync(path.join(nm, '@astryxdesign/theme-neutral/fonts.css'), path.join(out, 'fonts.css'));
console.log('wrote', path.join(out, `reference-${scheme}.html`));
