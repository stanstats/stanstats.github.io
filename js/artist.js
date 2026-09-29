// Artist page: search, floating word cloud, album timeline.
import { loadIndex, loadArtist } from './data.js';
import { mountSearch } from './search.js';
import { timelineItem, timelineKey } from './timeline.js';
import { mountCloud } from './cloud.js';
import { currentRoster } from './roster.js';
import * as CFG from '../config.js';
import { formUrl,
  el, boot, qs, setQs, weightedSample, weightedPick, fmtYm, maskedText, fmtDate, fmtPct, typeLabel, tierLabel, formLink,
  comparisonNote, setArtistTitle, actKind, fixLink, NO_FORECAST_TEXT,
} from './util.js';

boot();

const $ = (id) => document.getElementById(id);
const searchBox = $('search');
const cloud = $('cloud');
const view = $('artist-view');

let index, searchCtl;

init().catch((err) => {
  console.error(err);
  view.innerHTML = '';
  view.append(notice('Could not load data', String(err.message || err)));
});

async function init() {
  index = await loadIndex();
  searchCtl = mountSearch(searchBox, index, (a) => show(a.id));
  mountCloud(cloud, index, (x) => show(x.id));
  // A-Z list written by src/site/prerender.py: plain ?id= links; once the index is loaded, open in place without a reload.
  $('artist-index')?.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[href^="./?id="]');
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
    ev.preventDefault();
    show(new URLSearchParams(a.getAttribute('href').slice(2)).get('id'));
  });
  const id = qs('id');
  if (id) await show(id);
}

/* ---------------- timeline ---------------- */
async function show(id) {
  const row = index.find((a) => a.id === id);
  if (row) searchCtl.setValue(row);
  setQs('id', id);
  view.innerHTML = '';
  view.append(el('p', { class: 'muted small' }, 'Loading…'));
  let a;
  try { a = await loadArtist(id); }
  catch (err) {
    view.innerHTML = '';
    view.append(notice('Data not available', `We do not have a data file for ${row ? row.name_en : id} yet.`));
    return;
  }
  view.innerHTML = '';
  const m = a.meta;
  setArtistTitle(m, '앨범별 초동 기록 · album-by-album first-week sales');

  view.append(el('header', { class: 'glass artist-head' },
    el('h2', {}, m.name_en, el('span', { class: 'kr' }, m.name_kr || '')),
    el('p', { class: 'meta' },
      `${actKind(m) === 'data not available' ? 'Type: data not available' : actKind(m)} · `,
      `debut ${m.debut_date ? fmtDate(m.debut_date) : 'date not in our database yet'} · last album's first week ${tierLabel(m.tier)}`,
    ),
    headRoster(a),
    el('p', { class: 'meta' },
      m.has_prediction
        ? el('a', { href: `../?id=${encodeURIComponent(m.id)}` }, 'Forecast the next album →')
        : el('span', { class: 'muted' }, `No forecast. ${NO_FORECAST_TEXT}`),
    ),
    // latest album skipped as a sales-data anomaly (export forecast_note, forecast artists only)
    m.has_prediction ? comparisonNote(a) : null,
  ));


  const tl = (a.timeline || []).slice().reverse();      // newest first
  if (!tl.length) { view.append(notice('No albums yet', 'Nothing in the timeline for this artist.')); return; }

  view.append(timelineKey());
  const list = el('ol', { class: 'timeline' });
  for (const t of tl) list.append(timelineItem(t));
  view.append(list);
  view.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


/** Roster line for the artist header: current members (fallback: latest album, then count). */
function headRoster(a) {
  const names = currentRoster(a);
  const m = a.meta;
  return el('div', { class: 'roster' },
    el('span', { class: 'names' }, names.length ? names.join(' · ') : (m.n_members != null ? `${m.n_members} member${m.n_members === 1 ? '' : 's'} (names not in our database yet)` : 'not in our database yet')),
    el('div', { class: 'note' }, el('span', {}, 'This is the roster in our database — ', fixLink())),
  );
}

function notice(title, text) {
  return el('div', { class: 'glass card notice' }, el('h3', {}, title), el('p', {}, text));
}
