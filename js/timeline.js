// Album timeline item shared by the Home page (below the forecast) and the Artists page.
import { formUrl, el, fmtYm, maskedText, fmtPct, typeLabel, formLink, anomalyNote } from './util.js';

export function timelineItem(t) {
  // Three cases, kept apart on purpose: no previous album in our database (change is null) -> 'first';
  // a change that rounds to 0% (both albums round to the same 2 significant digits) -> 'flat'; otherwise up/down.
  // 'first' used to share the 'flat' class, so an album whose sales matched the previous one was labelled as the
  // earliest album (NCT Dream, Beat It Up, 2026-09-27).
  const dir = t.change_vs_prev_pct == null ? 'first' : (t.direction || (t.change_vs_prev_pct > 0 ? 'up' : t.change_vs_prev_pct < 0 ? 'down' : 'flat'));
  const li = el('li', { class: `tl-item ${dir}` }, el('span', { class: 'node', 'aria-hidden': 'true' }));
  const card = el('div', { class: 'glass tl-card' });

  const delta = el('div', { class: `delta ${dir}` });
  if (dir === 'first') delta.append('earliest album in our database');
  else if (dir === 'flat') {
    delta.append('about the same');
    delta.setAttribute('aria-label', 'about the same first-week sales as the previous album');
  } else {
    delta.append(el('span', { class: 'tri', 'aria-hidden': 'true' }), el('span', {}, fmtPct(t.change_vs_prev_pct, 1)));
    delta.setAttribute('aria-label', `${fmtPct(t.change_vs_prev_pct, 1)} vs previous album`);
  }
  card.append(el('div', { class: 'tl-top' },
    el('div', {},
      el('div', { class: 'tl-title' }, t.title),
      el('div', { class: 'tl-sub' }, `${fmtYm(t.release_ym)} · ${typeLabel(t.type)} · ${t.n_versions == null ? 'version count unknown' : `${t.n_versions} version${t.n_versions === 1 ? '' : 's'}`}`),
    ),
    delta,
  ));

  card.append(el('div', { class: 'tl-sales' }, 'First-week: ', el('b', {}, maskedText(t.sales_masked))));

  // only what the model can explain (max 3); masked_line / masked_pct are intentionally ignored
  // The 'base' item is the level carried over from the previous album, shown as a share of it (e.g. 90%), listed first;
  // every other item is an adjustment on top of that (user framing 2026-09-13: build up from the last album, not down from 100).
  const reasons = (t.reasons || []).slice(0, 3).sort((a, b) => (a.key === 'base' ? -1 : 0) - (b.key === 'base' ? -1 : 0));
  if (reasons.length) {
    const ul = el('ul', { class: 'tl-reasons' });
    for (const r of reasons) {
      if (r.key === 'base') {
        ul.append(el('li', {},
          el('span', {}, r.label_en),
          el('span', { class: 'pct base' }, `${Math.round(100 + r.contribution_pct)}%`)));
      } else {
        ul.append(el('li', {},
          el('span', {}, r.label_en),
          el('span', { class: `pct ${r.contribution_pct >= 0 ? 'pos' : 'neg'}` }, fmtPct(r.contribution_pct, 0))));
      }
    }
    card.append(ul);
    // Albums before the training window, explained with today's coefficients (export flag; owner ruling 2026-09-27)
    if (t.explained_out_of_window && t.explain_note) card.append(el('p', { class: 'tl-note' }, t.explain_note));
  } else if (anomalyNote(t)) {
    // first-week figure judged a sales-data anomaly (export forecast_status; owner ruling 2026-09-25): say so instead of
    // the generic "too early" line, which is wrong for these albums
    card.append(anomalyNote(t));
  } else {
    card.append(el('p', { class: 'tl-none' }, 'Too early in the run to explain.'));
  }

  const members = t.members_on_stage || [];
  card.append(el('div', { class: 'roster' },
    el('span', { class: 'names' }, members.length ? members.join(' · ') : 'roster unknown'),
    el('div', { class: 'note' },
      el('span', {}, 'This is the roster in our database — corrections welcome'),
      formLink(formUrl('fix'), 'Something looks off? Tell me →', 'btn sm ghost'),
    ),
  ));

  li.append(card);
  return li;
}

/** Full timeline block: newest first. */
export function renderTimeline(a, { heading = 'Album history, and why each one moved' } = {}) {
  const wrap = el('section', { class: 'timeline-wrap' });
  const tl = (a.timeline || []).slice().reverse();
  if (!tl.length) return wrap;
  wrap.append(el('h2', { class: 'tl-heading' }, heading, el('span', { class: 'kr' }, '앨범별 초동 변화와 이유')));
  const list = el('ol', { class: 'timeline' });
  for (const t of tl) list.append(timelineItem(t));
  wrap.append(list);
  return wrap;
}
