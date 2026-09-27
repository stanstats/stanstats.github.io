// Artist page: search, floating word cloud, album timeline.
import { loadIndex, loadArtist } from './data.js';
import { mountSearch } from './search.js';
import { timelineItem } from './timeline.js';
import { mountCloud } from './cloud.js';
import { latestRoster } from './roster.js';
import * as CFG from '../config.js';
import { formUrl,
  el, boot, qs, setQs, weightedSample, weightedPick, fmtYm, maskedText, fmtDate, fmtPct, typeLabel, tierLabel, formLink,
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

  view.append(el('header', { class: 'glass artist-head' },
    el('h2', {}, m.name_en, el('span', { class: 'kr' }, m.name_kr || '')),
    el('p', { class: 'meta' },
      `${m.is_solo ? 'Solo' : m.gender === 'female' ? 'Girl group' : m.gender === 'male' ? 'Boy group' : 'Co-ed group'} · `,
      `debut ${m.debut_date ? fmtDate(m.debut_date) : 'not in our database yet'} · ${tierLabel(m.tier)} tier`,
    ),
    headRoster(a),
    el('p', { class: 'meta' },
      m.has_prediction
        ? el('a', { href: `../?id=${encodeURIComponent(m.id)}` }, 'Forecast the next album →')
        : el('span', { class: 'muted' }, 'No forecast (last usable album before 2019, or every first-week figure looks like a data anomaly).'),
    ),
  ));

  view.append(el('div', { class: 'fixbar' },
    formLink(formUrl('fix'), "I'm a fan and I want to fix the data", 'btn big fix'),
    el('p', {}, 'Anonymous, one minute, no account. Tell us the artist, the album, which number is wrong and (optionally) a source.'),
  ));

  const tl = (a.timeline || []).slice().reverse();      // newest first
  if (!tl.length) { view.append(notice('No albums yet', 'Nothing in the timeline for this artist.')); return; }

  const list = el('ol', { class: 'timeline' });
  for (const t of tl) list.append(timelineItem(t));
  view.append(list);
  view.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


/** Roster line for the artist header: names of the latest album (fallback: count). */
function headRoster(a) {
  const names = latestRoster(a);
  const m = a.meta;
  return el('div', { class: 'roster' },
    el('span', { class: 'names' }, names.length ? names.join(' · ') : (m.n_members != null ? `${m.n_members} member${m.n_members === 1 ? '' : 's'} (names not in our database yet)` : 'not in our database yet')),
    el('div', { class: 'note' },
      el('span', {}, 'This is the roster in our database — corrections welcome'),
      formLink(formUrl('fix'), 'Something looks off? Tell me →', 'btn sm ghost'),
    ),
  );
}

function notice(title, text) {
  return el('div', { class: 'glass card notice' }, el('h3', {}, title), el('p', {}, text));
}
