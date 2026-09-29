// Linear number axis (SVG) for the forecast card.
//  - linear scale, head and tail truncated with clearly labelled end ticks
//  - median: one thin line (colour A)
//  - 50 / 80 / 90 % intervals: nested bands (colour B, decreasing opacity)
//  - the reference ("last") album: one dashed line labelled with its masked sales (user 2026-09-28, from the share-card mockup)
import { fmtShort, fmtInt } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

/** "Nice" tick step for a linear range spanning `span` with about `n` ticks. */
function niceStep(span, n = 4) {
  const raw = span / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  const nice = m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10;
  return nice * p;
}

/** Masked sales string ("45*,***") -> the 2-significant-digit value it shows (450000). The export's ratio_vs_prev is
 *  computed against exactly this rounded value (export.py prev_r), so the line adds nothing the masked number does not. */
export function maskedValue(masked) {
  const v = Number(String(masked || '').replace(/\*/g, '0').replace(/[^0-9]/g, ''));
  return Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * @param {object} row grid row {median, lo50, hi50, lo80, hi80, lo90, hi90}
 * @param {object} [prev] reference album {value, masked}: drawn as a dashed line; null = no line
 * @returns SVGElement
 */
export function renderAxis(row, prev = null) {
  const W = 400, H = 98;
  const padL = 20, padR = 20;   // room for the centred end labels
  const y0 = 70;           // axis baseline (14 px lower than before: the last-album label sits above the bands)
  const bandH = 36;        // tallest band height
  const med = row.median;

  // domain: the 90% band plus a little air, head & tail cut
  let lo = row.lo90;
  let hi = row.hi90;
  const span0 = hi - lo;
  // the last album stays on the axis even when it falls outside the 90% band (a big forecast drop or rise)
  if (prev && prev.value) { lo = Math.min(lo, prev.value); hi = Math.max(hi, prev.value); }
  const span1 = hi - lo;
  lo = Math.max(0, lo - span1 * 0.06);
  hi = hi + span1 * 0.06;
  const x = (v) => padL + ((v - lo) / (hi - lo)) * (W - padL - padR);

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Forecast: best guess ${fmtInt(med)} copies; 90% chance between ${fmtInt(row.lo90)} and ${fmtInt(row.hi90)}`
      + (prev && prev.value ? `; ${prev.label || 'last album'}${prev.title ? ` ${prev.title}` : ''} about ${fmtInt(prev.value)}` : '') });

  // nested bands (widest first, so narrower draw on top)
  const bands = [[row.lo90, row.hi90, 0.18, bandH], [row.lo80, row.hi80, 0.32, bandH - 8], [row.lo50, row.hi50, 0.5, bandH - 16]];
  for (const [a, b, op, h] of bands) {
    svg.append(s('rect', { x: x(a), y: y0 - h, width: Math.max(1, x(b) - x(a)), height: h, rx: 5,
      fill: 'var(--band)', 'fill-opacity': op }));
  }

  // median thin line
  svg.append(s('line', { x1: x(med), x2: x(med), y1: y0 - bandH - 6, y2: y0 + 6, stroke: 'var(--median)', 'stroke-width': 2.2, 'stroke-linecap': 'round' }));
  svg.append(s('circle', { cx: x(med), cy: y0 - bandH - 6, r: 3, fill: 'var(--median)' }));

  // last album: dashed line through the bands, label above (anchored inward near the ends so it never clips)
  if (prev && prev.value) {
    const px = x(prev.value);
    svg.append(s('line', { x1: px, x2: px, y1: y0 - bandH - 14, y2: y0, stroke: 'var(--ink)', 'stroke-width': 1.4,
      'stroke-dasharray': '3 3' }));
    // label = "last album Lemonade · 90*,***" (owner 2026-09-29: name the album); long titles are cut at 22 characters,
    // and the anchor follows the label's estimated width so it never runs past either end of the axis
    const title = prev.title ? (prev.title.length > 22 ? `${prev.title.slice(0, 21).trimEnd()}…` : prev.title) : '';
    const text = `${prev.label || 'last album'} ${title ? `${title} · ` : ''}${prev.masked}`;
    const half = text.length * 2.7;   // ~5.4 px per character at 9.5 px, halved
    const anchor = px - half < 2 ? 'start' : px + half > W - 2 ? 'end' : 'middle';
    const lx = anchor === 'start' ? px - 2 : anchor === 'end' ? px + 2 : px;
    svg.append(s('text', { x: lx, y: y0 - bandH - 18, 'text-anchor': anchor, 'font-size': 9.5, 'font-weight': 600,
      fill: 'var(--ink-2)' }, text));
  }

  // baseline
  svg.append(s('line', { x1: padL, x2: W - padR, y1: y0, y2: y0, stroke: 'var(--ink-2)', 'stroke-width': 1.2 }));
  // truncation marks (zigzag) at both ends
  for (const ex of [padL, W - padR]) {
    // zigzag centred on the baseline (spans y0-4 .. y0+4) so it reads as a break in the line
    svg.append(s('path', { d: `M${ex - 5},${y0} l3,-4 l4,8 l3,-4`, stroke: 'var(--ink-2)', 'stroke-width': 1.2, fill: 'none' }));
  }
  // ticks: nice step
  const step = niceStep(hi - lo, 4);
  const first = Math.ceil(lo / step) * step;
  for (let v = first; v <= hi + 1e-9; v += step) {
    const xx = x(v);
    if (xx < padL + 36 || xx > W - padR - 36) continue;   // keep clear of the end labels
    svg.append(s('line', { x1: xx, x2: xx, y1: y0, y2: y0 + 5, stroke: 'var(--ink-2)', 'stroke-width': 1 }));
    svg.append(s('text', { x: xx, y: y0 + 17, 'text-anchor': 'middle', 'font-size': 9.5, fill: 'var(--ink-2)' }, fmtShort(v)));
  }
  // end labels: what the cut ends are
  // end labels centred under the break marks (user 2026-09-13: label and mark were visibly offset)
  svg.append(s('text', { x: padL, y: y0 + 17, 'text-anchor': 'middle', 'font-size': 9, fill: 'var(--ink-3)' }, `≈${fmtShort(lo)}`));
  svg.append(s('text', { x: W - padR, y: y0 + 17, 'text-anchor': 'middle', 'font-size': 9, fill: 'var(--ink-3)' }, `≈${fmtShort(hi)}`));


  return svg;
}
