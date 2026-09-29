// Album timeline item shared by the Home page (below the forecast) and the Artists page.
import { el, fmtYm, maskedText, fmtPct, typeLabel, anomalyNote } from './util.js';

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
      el('div', { class: 'tl-sub' }, `${fmtYm(t.release_ym)} · ${typeLabel(t.type)} · ${t.n_versions == null ? 'version count unknown' : `${t.n_versions} album version${t.n_versions === 1 ? '' : 's'}`}`),
    ),
    delta,
  ));

  card.append(el('div', { class: 'tl-sales' }, 'First-week: ', el('b', {}, maskedText(t.sales_masked))));

  // only what the model can explain (max 3); masked_line / masked_pct are intentionally ignored.
  // Ledger in % of the last album's first week (owner 2026-09-28): the baseline is shown as a share of the last album
  // (76%), and because the model's items multiply, each later item is turned into the percentage points it adds or removes
  // on the running total, so the lines can be added up. Only the top items are listed, so the ledger is not
  // meant to reach the actual result, and it says nothing about that on purpose (owner: readers get it).
  const lines = ledger(t.reasons);
  if (lines.length) {
    card.append(el('p', { class: 'tl-reasons-head' }, 'What the model reads into this change'));
    const ul = el('ul', { class: 'tl-reasons' });
    for (const l of lines) ul.append(el('li', {}, el('span', {}, l.label), el('span', { class: `pct ${l.cls}` }, l.text)));
    card.append(ul);
    // Albums before the training window, explained with today's coefficients (export flag; owner ruling 2026-09-27)
    if (t.explained_out_of_window && t.explain_note) card.append(el('p', { class: 'tl-note' }, t.explain_note));
  } else if (anomalyNote(t)) {
    // first-week figure judged a sales-data anomaly (export forecast_status; owner ruling 2026-09-25): say so instead of
    // the generic "too early" line, which is wrong for these albums
    card.append(anomalyNote(t));
  } else if (t.reasons_note) {
    // every item read a different "previous album" than the one above (export reasons_withheld; owner ruling 2026-09-28)
    card.append(el('p', { class: 'tl-none' }, t.reasons_note));
  } else if (dir !== 'first') {
    // the earliest album already says so in its delta badge; others simply have no model reading (review 2026-09-28)
    card.append(el('p', { class: 'tl-none' }, 'The model has no reading for this album.'));
  }

  const members = t.members_on_stage || [];
  card.append(el('div', { class: 'roster' },
    el('span', { class: 'names' }, members.length ? members.join(' · ') : 'roster unknown'),
    // one quiet text link per card; the loud buttons live in the page header and at the end of long timelines
    el('div', { class: 'note' }, el('span', {}, 'This is the roster in our database — corrections welcome')),
  ));

  li.append(card);
  return li;
}

/** Full timeline block: newest first. */
export function renderTimeline(a, { heading = 'Album history, and how the model reads each change' } = {}) {
  const wrap = el('section', { class: 'timeline-wrap' });
  const tl = (a.timeline || []).slice().reverse();
  if (!tl.length) return wrap;
  wrap.append(el('h2', { class: 'tl-heading' }, heading, el('span', { class: 'kr' }, '앨범별 초동 변화와 이유')));
  wrap.append(timelineKey());
  const list = el('ol', { class: 'timeline' });
  for (const t of tl) list.append(timelineItem(t));
  wrap.append(list);
  return wrap;
}

/** One line above every timeline: units and the masking stars, said once instead of on every card (owner 2026-09-28). */
export function timelineKey() {
  return el('p', { class: 'tl-key' }, 'First-week sales are in copies. We show the first two digits and hide the rest (45*,***).');
}

/** Index points for the ledger: whole numbers, thousands separators (48,662 for the extreme pre-2019 rows). */
function fmtIndex(v) {
  return Math.round(v).toLocaleString('en-US');
}

/** The reasons as ledger lines, shared by the timeline and the share cards (share.js) so both read the same numbers.
 *  Baseline first as a share of the last album (e.g. 76%); each later item multiplies, so it is shown as the percentage
 *  points it adds to or removes from the running total. Returns [{ key, label, text, cls }], at most 3 lines. */
export function ledger(reasons) {
  const rs = (reasons || []).slice(0, 3).sort((a, b) => (a.key === 'base' ? -1 : 0) - (b.key === 'base' ? -1 : 0));
  const out = [];
  let run = 100;
  for (const r of rs) {
    if (r.key === 'base') {
      run = 100 * (1 + r.contribution_pct / 100);
      out.push({ key: r.key, label: "Baseline from the last album's sales", text: `${fmtIndex(run)}%`, cls: 'base' });
    } else {
      const d = run * r.contribution_pct / 100;
      run += d;
      // keep "(6 → 15)" in one piece: it broke as "(6" / "→ 15)" on phones (layout pass 2026-09-28)
      const label = String(r.label_en).replace(/\((\d+) → (\d+)\)/, '($1\u00a0→\u00a0$2)');
      out.push({ key: r.key, label, text: `${d >= 0 ? '+' : '−'}${fmtIndex(Math.abs(d))}%`, cls: d >= 0 ? 'pos' : 'neg' });
    }
  }
  return out;
}
