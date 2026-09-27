// Linear number axis (SVG) for the forecast card.
//  - linear scale, head and tail truncated with clearly labelled end ticks
//  - median: one thin line (colour A)
//  - 50 / 80 / 90 % intervals: nested bands (colour B, decreasing opacity)
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

/**
 * @param {object} row grid row {median, lo50, hi50, lo80, hi80, lo90, hi90}
 * @returns SVGElement
 */
export function renderAxis(row) {
  const W = 400, H = 84;
  const padL = 20, padR = 20;   // room for the centred end labels
  const y0 = 56;           // axis baseline
  const bandH = 36;        // tallest band height
  const med = row.median;

  // domain: the 90% band plus a little air, head & tail cut
  let lo = row.lo90;
  let hi = row.hi90;
  const span0 = hi - lo;
  lo = Math.max(0, lo - span0 * 0.06);
  hi = hi + span0 * 0.06;
  const x = (v) => padL + ((v - lo) / (hi - lo)) * (W - padL - padR);

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Forecast axis: median ${fmtInt(med)}, 90% range ${fmtInt(row.lo90)} to ${fmtInt(row.hi90)}` });

  // nested bands (widest first, so narrower draw on top)
  const bands = [[row.lo90, row.hi90, 0.18, bandH], [row.lo80, row.hi80, 0.32, bandH - 8], [row.lo50, row.hi50, 0.5, bandH - 16]];
  for (const [a, b, op, h] of bands) {
    svg.append(s('rect', { x: x(a), y: y0 - h, width: Math.max(1, x(b) - x(a)), height: h, rx: 5,
      fill: 'var(--band)', 'fill-opacity': op }));
  }

  // median thin line
  svg.append(s('line', { x1: x(med), x2: x(med), y1: y0 - bandH - 6, y2: y0 + 6, stroke: 'var(--median)', 'stroke-width': 2.2, 'stroke-linecap': 'round' }));
  svg.append(s('circle', { cx: x(med), cy: y0 - bandH - 6, r: 3, fill: 'var(--median)' }));

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
