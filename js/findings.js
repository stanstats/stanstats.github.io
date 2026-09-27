// Findings: one card per finding from findings.json.
import { loadFindings } from './data.js';
import { REPO_URL } from '../config.js';
import { el, boot } from './util.js';

boot();
const root = document.getElementById('findings');

loadFindings().then((items) => {
  root.innerHTML = '';
  if (!items.length) { root.append(el('p', { class: 'muted' }, 'No findings published yet.')); return; }
  for (const f of items) {
    const card = el('article', { class: 'glass finding', id: f.id });
    if (f.number) card.append(el('div', { class: 'num' }, f.number));
    card.append(el('h2', {}, f.title_en, f.title_kr ? el('span', { class: 'kr' }, f.title_kr) : null));
    if (f.subtitle_en) card.append(el('p', { class: 'sub' }, f.subtitle_en));
    if (f.figure) card.append(el('img', { class: 'figure', src: `../${f.figure}`.replace('../findings/', './'), alt: '', loading: 'lazy' }));
    if (f.body_en) card.append(el('p', { class: 'body' }, f.body_en));
    if (f.table_md) card.append(mdTable(f.table_md));
    if (f.link && REPO_URL) {
      const href = /^https?:/.test(f.link) ? f.link : `${REPO_URL.replace(/\/$/, '')}/blob/main/${f.link}`;
      card.append(el('a', { class: 'link', href, target: '_blank', rel: 'noopener' }, 'Read the experiment note →'));
    }  // no REPO_URL yet: show no source path (2026-09-13; a bare repo path means nothing to a public reader)
    root.append(card);
  }
}).catch((err) => {
  console.error(err);
  root.innerHTML = '';
  root.append(el('p', { class: 'muted' }, `Could not load findings: ${err.message || err}`));
});


/** Tiny renderer for a markdown pipe table (header row, separator row, body rows); a trailing plain line becomes a caption. */
function mdTable(md) {
  const lines = md.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows = lines.filter((l) => l.startsWith('|'));
  const caption = lines.filter((l) => !l.startsWith('|')).join(' ');
  const cells = (l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const wrap = el('div', { class: 'table-wrap' });
  const table = el('table', { class: 'mini' });
  if (rows.length) {
    table.append(el('thead', {}, el('tr', {}, ...cells(rows[0]).map((c) => el('th', {}, c)))));
    const body = el('tbody', {});
    rows.slice(1).filter((l) => !/^\|?\s*:?-{2,}/.test(l)).forEach((l) => body.append(el('tr', {}, ...cells(l).map((c) => el('td', {}, c)))));
    table.append(body);
  }
  wrap.append(table);
  if (caption) wrap.append(el('p', { class: 'muted small' }, caption.replace(/^\(|\)$/g, '')));
  return wrap;
}
