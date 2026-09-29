// Share cards: turn the current forecast into a set of 1080 x 1350 PNGs (Instagram 4:5) in the browser and hand them to
// the system share sheet (phones, and desktop browsers that support sharing files) or download them (everywhere else).
// Owner decisions 2026-09-28 (docs/SITE_SPEC.md §1c): entry on the Home result card only; card 1 = forecast, card 2 =
// what it is based on + accuracy, cards 3+ = album by album (3 albums a card, at most 3 cards); no page numbers, no
// "fix data" prompt, favicon logo, site address and data date on every card; percentages only; the reasons use the same
// ledger as the timeline (timeline.js ledger()). Nothing is uploaded anywhere: the images are made on the reader's device.
import { el, fmtYm, fmtDate, fmtInt, fmtShort, fmtPct, typeLabel, tierLabel, isAnomaly, maskedText } from './util.js';
import { renderAxis, maskedValue } from './axis.js';
import { ledger } from './timeline.js';

const HTML_TO_IMAGE = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/+esm';
const SITE = 'stanstats.github.io';
const ALBUMS_PER_CARD = 3;
const MAX_ALBUM_CARDS = 3;
const LOGO = '<svg class="x-logo" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45" fill="#ff5fa2"/>'
  + '<circle cx="62" cy="40" r="22" fill="#7b61ff" opacity=".8"/></svg>';

function h(tag, cls, ...kids) { return el(tag, cls ? { class: cls } : {}, ...kids); }
function html(tag, cls, markup) { const n = el(tag, { class: cls }); n.innerHTML = markup; return n; }

function top() {
  const b = h('div', 'x-brand');
  b.innerHTML = `${LOGO}<span>K-pop <em>초동</em> forecast</span>`;
  return h('div', 'x-top', b);
}

function foot(small, meta) {
  return h('div', 'x-foot',
    h('div', 'x-url', SITE, h('small', null, small)),
    html('div', 'x-meta', meta));
}

function nameClass(name) { return name.length > 18 ? 'x-name x-s' : name.length > 12 ? 'x-name x-m' : 'x-name'; }

/** Card 1: the forecast for the reader's scenario. */
function forecastCard(ctx) {
  const { artist, row, sc, model } = ctx;
  const m = artist.meta;
  const ref = artist.comparison_album || artist.latest;
  const prevV = maskedValue(ref?.sales_masked);
  const vsWord = artist.comparison_album ? 'the compared album' : 'the last album';
  const card = h('div', 'xc');
  card.append(top());
  const kr = m.name_kr && m.name_kr !== m.name_en ? m.name_kr : '';
  const inline = kr && (m.name_en.length + kr.length) <= 16;   // short names keep the Korean name on the same line
  const nameEl = h('div', nameClass(m.name_en), m.name_en);
  if (inline) nameEl.append(el('span', { class: 'x-kr x-name-kr-inline' }, kr));
  const art = h('div', 'x-artist', h('div', 'x-kicker', 'Next album', el('span', { class: 'x-kr' }, '다음 앨범 초동 예측')), nameEl);
  if (kr && !inline) art.append(el('div', { class: 'x-name-kr x-kr' }, kr));
  card.append(art);
  card.append(h('div', 'x-whatif',
    h('span', 'x-tag', 'WHAT IF'),
    h('span', 'x-pill', `Out ${fmtYm(sc.date.slice(0, 7))}`),
    h('span', 'x-pill', typeLabel(sc.type)),
    h('span', 'x-pill', `${sc.nv} version${sc.nv === 1 ? '' : 's'}`)));
  card.append(h('div', 'x-notann', 'A scenario picked on the site, not an announcement.'));
  card.append(h('div', 'x-big',
    h('div', 'x-lbl', 'Best guess, first-week sales (초동)'),
    h('div', 'x-num', fmtShort(row.median), el('small', {}, 'copies')),
    h('div', 'x-range', `80% chance: ${fmtShort(row.lo80)} – ${fmtShort(row.hi80)}`)));
  const ax = h('div', 'x-axis');
  ax.append(renderAxis(row, prevV ? { value: prevV, masked: ref.sales_masked, label: artist.comparison_album ? 'compared with' : 'last album', title: ref.title } : null));
  card.append(ax);
  const lines = h('div', 'x-lines');
  if (Number.isFinite(row.ratio_vs_prev)) {
    const pct = Math.round((row.ratio_vs_prev - 1) * 100);
    lines.append(h('div', 'x-line', el('b', { class: pct >= 0 ? 'x-up' : 'x-down' }, fmtPct(pct, 0)), el('span', {}, `vs ${vsWord}, at the best guess`)));
  }
  if (Number.isFinite(row.p_drop_pct)) {
    // violet, not coral: next to a red/green change a second red read as a repeat (owner colour review 2026-09-29)
    lines.append(h('div', 'x-line', el('b', { class: 'x-good' }, `${row.p_drop_pct}%`), el('span', {}, `chance it drops 20% or more below ${vsWord}`)));
  }
  card.append(lines);
  card.append(h('div', 'x-caveat', "Not official, not a promise. The model can't see teasers, scandals or promo plans."));
  card.append(foot('Try your own month and versions', `* = hidden digits<br>Data as of ${fmtDate(model.data_cutoff)}`));
  return card;
}

/** Card 2: what the forecast is based on, and how close it has been for artists this size. */
function basisCard(ctx) {
  const { artist, model, facts } = ctx;
  const m = artist.meta;
  const tier = artist.latest?.tier || m.tier;
  const tm = (model.tier_metrics || {})[tier] || {};
  const card = h('div', 'xc');
  card.append(top());
  card.append(h('div', 'x-h2', 'What the forecast is based on', el('span', { class: 'x-kr' }, `${m.name_en} · 예측 근거`)));
  const shown = (facts || []).slice(0, 3);   // 3 lines: with 4, long labels pushed the footer off 7 of 500 cards
  if (shown.length) {
    card.append(h('div', 'x-panel x-facts', ...shown.map((f) => h('div', 'x-fact', h('span', 'x-l', f.label_en), h('span', 'x-r', f.value)))));
  }
  // Reader test 2026-09-28 (owner): "+27% / −21%" and "more than double or less than half" did not read at a glance.
  // Two plain sentences instead, both tied to card 1: does the 80% range hold, and how often we were badly wrong.
  card.append(h('div', 'x-sect', 'How often were we right?'));
  const acc = h('div', 'x-panel x-acc');
  const accLines = h('div', 'x-lines');
  acc.append(accLines);
  const cov = tm.coverage_by_level && tm.coverage_by_level['80'] ? tm.coverage_by_level['80'].covered : null;
  if (cov != null) {
    // tiers measure 77-82%: rounded to the nearest 5, which is the nominal 80% the site states (owner ruling B5)
    accLines.append(h('div', 'x-line', el('b', { class: 'x-good' }, el('small', {}, 'about'), `${Math.round(cov * 20) * 5}%`),
      el('span', {}, 'of the time, the real sales ended up inside the range we gave')));
  }
  if (tm.hit_2x != null) {
    accLines.append(h('div', 'x-line', el('b', { class: 'x-risk' }, `${Math.round((1 - tm.hit_2x) * 100)}%`),
      el('span', {}, 'of the time we were way off: real sales were more than twice our guess, or less than half of it')));
  }
  const toYear = String(model.data_cutoff || '').slice(0, 4) || '2026';
  acc.append(h('div', 'x-who', `Tested on ${tm.n != null ? fmtInt(tm.n) + ' ' : ''}albums from 2022–${toYear} by artists who sold ${tierLabel(tier)} last time, without letting the model see the answers first.`));
  card.append(acc);
  card.append(h('div', 'x-plain', 'The model only knows what was public about 4 months before release: past sales, time between albums, versions and social media growth.',
    el('small', {}, '초동 = how many copies an album sells in its first week on the Korean charts.')));
  card.append(foot('Methods and limits on the About page', `Data as of ${fmtDate(model.data_cutoff)}`));
  return card;
}

/** One album box on an album-by-album card. */
function albumBox(t, before) {
  const dir = t.change_vs_prev_pct == null ? 'first' : t.change_vs_prev_pct >= 0 ? 'up' : 'down';
  const meta = `${fmtYm(t.release_ym)} · ${typeLabel(t.type).toLowerCase()}`
    + (t.n_versions != null ? ` · ${t.n_versions} version${t.n_versions === 1 ? '' : 's'}` : '');
  const right = h('div', 'x-s', h('div', 'x-n', maskedText(t.sales_masked)));
  if (dir === 'first') right.append(h('div', 'x-c x-first', 'earliest album we have'));
  else {
    right.append(h('div', `x-c x-${dir}`, `${dir === 'up' ? '▲' : '▼'} ${fmtPct(Math.abs(t.change_vs_prev_pct), 0).slice(1)}`));
    if (before) right.append(h('div', 'x-vs', `vs ${before.title}`));
  }
  const box = h('div', 'x-alb', h('div', 'x-row1', h('div', null, h('div', t.title.length > 30 ? 'x-t x-long' : 'x-t', t.title), h('div', 'x-d', meta)), right));
  const chips = h('div', 'x-chips');
  const lines = ledger(t.reasons);
  for (const l of lines) {
    chips.append(l.cls === 'base'
      ? el('span', { class: 'x-chip x-base' }, l.label, el('b', {}, l.text))
      : el('span', { class: `x-chip x-${l.cls}` }, el('b', {}, l.text), l.label));
  }
  if (!lines.length && isAnomaly(t)) chips.append(el('span', { class: 'x-chip x-note' }, "Our model can't forecast this album"));
  else if (!lines.length && t.reasons_note) chips.append(el('span', { class: 'x-chip x-note' }, t.reasons_note));
  if (chips.childNodes.length) box.append(chips);
  return box;
}

/** Cards 3+: album by album, newest first. */
function albumCards(ctx) {
  const { artist, model } = ctx;
  const m = artist.meta;
  const tl = artist.timeline || [];
  const newestFirst = tl.map((t, i) => ({ t, before: i > 0 ? tl[i - 1] : null })).reverse();
  const shown = newestFirst.slice(0, ALBUMS_PER_CARD * MAX_ALBUM_CARDS);
  const rest = newestFirst.length - shown.length;
  const cards = [];
  for (let i = 0; i < shown.length; i += ALBUMS_PER_CARD) {
    const part = shown.slice(i, i + ALBUMS_PER_CARD);
    const last = i + ALBUMS_PER_CARD >= shown.length;
    const card = h('div', 'xc');
    card.append(top());
    card.append(h('div', 'x-h2', 'Why each album rose or fell', el('span', { class: 'x-kr' }, `${m.name_en} · 앨범별 등락 요인`)));
    card.append(h('div', 'x-sub3', i === 0 ? 'What the model reads into each change, newest first.' : 'What the model reads into each change.'));
    card.append(h('div', 'x-albums', ...part.map(({ t, before }) => albumBox(t, before))));
    const small = last && rest > 0 ? `${rest} earlier album${rest === 1 ? '' : 's'} on the site` : `Every album on ${m.name_en}'s page`;
    card.append(foot(small, `* = hidden digits<br>Data as of ${fmtDate(model.data_cutoff)}`));
    cards.push(card);
  }
  return cards;
}

/** Layout check for the cards (tools / tests): cards must be attached to the page with share.css loaded. Returns one
 *  entry per problem: the footer pushed below the card, or text cut off with an ellipsis. */
export function layoutProblems(cards) {
  const out = [];
  cards.forEach((c, i) => {
    const box = c.getBoundingClientRect();
    const f = c.querySelector('.x-foot');
    if (f && f.getBoundingClientRect().bottom > box.bottom + 0.5) out.push({ card: i + 1, kind: 'overflow', px: Math.round(f.getBoundingClientRect().bottom - box.bottom) });
    for (const e of c.querySelectorAll('.x-name, .x-name-kr')) {   // one line, ellipsis
      if (e.scrollWidth > e.clientWidth + 1) out.push({ card: i + 1, kind: 'truncated', text: e.textContent.slice(0, 60) });
    }
    for (const e of c.querySelectorAll('.x-t, .x-vs')) {   // up to two lines, then clamped
      if (e.scrollHeight > e.clientHeight + 6) out.push({ card: i + 1, kind: 'truncated', text: e.textContent.slice(0, 60) });
    }
  });
  return out;
}

/** Build the cards, attach them off screen with the stylesheet, and report layout problems (used by the checker). */
export async function checkLayout(ctx) {
  await ensureCss();
  const cards = buildCards(ctx);
  const stage = el('div', { class: 'xc-stage', 'aria-hidden': 'true' });
  stage.append(...cards);
  document.body.append(stage);
  try { await document.fonts.ready; return { n: cards.length, problems: layoutProblems(cards) }; }
  finally { stage.remove(); }
}

/** All cards for one forecast, as detached 1080 x 1350 elements. Exported for the layout check (tools/check_share_cards). */
export function buildCards(ctx) {
  return [forecastCard(ctx), basisCard(ctx), ...albumCards(ctx)];
}

let cssReady = null;
function ensureCss() {
  if (!cssReady) {
    cssReady = new Promise((resolve) => {
      const link = el('link', { rel: 'stylesheet', href: new URL('../css/share.css', import.meta.url).href });
      link.onload = resolve; link.onerror = resolve;
      document.head.append(link);
    });
  }
  return cssReady;
}

/** Korean glyphs for the cards come from a Google Fonts subset of exactly the characters used (a few KB). */
async function ensureKoreanFont(cards) {
  const chars = [...new Set(cards.map((c) => c.textContent).join('').match(/[ㄱ-힝]/g) || [])].join('');
  if (!chars) return;
  const href = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@500;700&text=${encodeURIComponent(chars)}&display=block`;
  if (!document.head.querySelector(`link[data-xc-kr="${chars}"]`)) {
    await new Promise((resolve) => {
      const link = el('link', { rel: 'stylesheet', href, 'data-xc-kr': chars });
      link.onload = resolve; link.onerror = resolve;
      document.head.append(link);
    });
  }
  try { await Promise.all([document.fonts.load('700 40px "Noto Sans KR"', chars), document.fonts.load('500 28px "Noto Sans KR"', chars)]); } catch { /* fall back */ }
}

async function ensureLatinFont() {
  try {
    await Promise.all(['400', '600', '700', '800'].map((w) => document.fonts.load(`${w} 30px "Plus Jakarta Sans"`)));
  } catch { /* fall back to the system font */ }
}

/** @font-face CSS with the font files inlined as data URLs, subset by Google Fonts to exactly the characters on the
 *  cards. Handed to html-to-image as fontEmbedCSS: the library cannot read the cross-origin Google stylesheets itself
 *  (it fell back to a system font in the first test, which pushed the footer off card 1). */
async function fontEmbedCSS(cards) {
  const text = cards.map((c) => c.textContent).join('') + '0123456789%+−–·,.*≈KM ';
  const latin = [...new Set(text.replace(/[\u3131-\uD79D]/g, ''))].join('');
  const hangul = [...new Set(text.match(/[\u3131-\uD79D]/g) || [])].join('');
  const fams = [['Plus+Jakarta+Sans', '400;600;700;800', latin]];
  if (hangul) fams.push(['Noto+Sans+KR', '500;700', hangul]);
  const parts = await Promise.all(fams.map(async ([fam, w, t]) => {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${fam}:wght@${w}&text=${encodeURIComponent(t)}`)).text();
    const urls = [...new Set(css.match(/https:[^)'"]+/g) || [])];
    const data = await Promise.all(urls.map(async (u) => {
      const b = await (await fetch(u)).blob();
      return new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
    }));
    return urls.reduce((acc, u, i) => acc.split(u).join(data[i]), css);
  }));
  return parts.join('\n');
}

/** Render the cards to PNG blobs. */
export async function renderCards(ctx) {
  await ensureCss();
  const cards = buildCards(ctx);
  const stage = el('div', { class: 'xc-stage', 'aria-hidden': 'true' });
  stage.append(...cards);
  document.body.append(stage);
  try {
    await Promise.all([ensureLatinFont(), ensureKoreanFont(cards)]);
    await document.fonts.ready;
    const [lib, fontCss] = await Promise.all([import(HTML_TO_IMAGE), fontEmbedCSS(cards).catch(() => '')]);
    const blobs = [];
    for (const c of cards) {
      blobs.push(await lib.toBlob(c, { width: 1080, height: 1350, pixelRatio: 1, cacheBust: false, fontEmbedCSS: fontCss }));
    }
    return blobs;
  } finally {
    stage.remove();
  }
}

function fileName(id, i) { return `stanstats-${id}-${i + 1}.png`; }

/** The share sheet: preview strip + Share. "Share" hands the files to the system share sheet where the browser can,
 *  and otherwise saves them as downloads (owner 2026-09-28: the button says Share on every device). */
export async function openShare(ctx) {
  let dlg = document.getElementById('share-dialog');
  if (!dlg) {
    dlg = el('dialog', { id: 'share-dialog', class: 'sheet', 'aria-labelledby': 'share-title' });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    document.body.append(dlg);
  }
  await ensureCss();
  const status = el('span', { class: 'share-status' }, 'Making the images…');
  const strip = el('div', { class: 'share-strip' });
  const shareBtn = el('button', { class: 'btn', type: 'button', disabled: true }, 'Share');
  dlg.innerHTML = '';
  dlg.append(
    el('div', { class: 'sheet-head' }, el('h3', { id: 'share-title' }, 'Share this forecast'),
      el('button', { class: 'clear', type: 'button', 'aria-label': 'Close', onclick: () => dlg.close() }, '×')),
    strip,
    el('div', { class: 'share-actions' }, shareBtn, status),
  );
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');

  let blobs;
  try { blobs = await renderCards(ctx); }
  catch (err) { console.error(err); status.textContent = 'Could not make the images. Please try again.'; return; }
  const urls = blobs.map((b) => URL.createObjectURL(b));
  strip.append(...urls.map((u, i) => el('img', { src: u, alt: `Share image ${i + 1}` })));
  dlg.addEventListener('close', () => urls.forEach((u) => URL.revokeObjectURL(u)), { once: true });
  const id = ctx.artist.meta.id;
  const files = blobs.map((b, i) => new File([b], fileName(id, i), { type: 'image/png' }));
  status.textContent = `${files.length} images`;
  shareBtn.disabled = false;
  shareBtn.addEventListener('click', async () => {
    const data = { files, title: `${ctx.artist.meta.name_en} · K-pop 초동 forecast`, text: `https://${SITE}/?id=${encodeURIComponent(id)}` };
    if (navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share(data); return; }
      catch (err) { if (err && err.name === 'AbortError') return; }
    }
    // no file sharing here: save the images instead
    urls.forEach((u, i) => {
      const a = el('a', { href: u, download: fileName(id, i) });
      document.body.append(a); a.click(); a.remove();
    });
    status.textContent = `${files.length} images saved`;
  });
}
