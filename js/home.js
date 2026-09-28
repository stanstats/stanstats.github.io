// Home page: search → inputs → Go → share-friendly result card.
import { loadModel, loadIndex, loadArtist } from './data.js';
import { mountSearch } from './search.js';
import { renderAxis } from './axis.js';
import { renderTimeline } from './timeline.js';
import { mountCloud } from './cloud.js';
import { currentRoster } from './roster.js';
import * as CFG from '../config.js';
import { formUrl,
  el, boot, qs, setQs, weightedPick, shuffle, isShowcase, fmtInt, fmtDate, fmtYm, fmtPct, pct100,
  typeLabel, tierLabel, TYPES, toISODate, addDays, monthOffset, clamp, formLink,
  noForecastReasons, comparisonNote, ANOMALY_WHY, ANOMALY_ABOUT, setArtistTitle,
} from './util.js';

boot();

const $ = (id) => document.getElementById(id);
const searchBox = $('search');
const form = $('inputs');
const dateIn = $('release-date');
const typeIn = $('album-type');
const nvIn = $('n-versions');
const nvHint = $('nv-hint');
const result = $('result');
const tlView = $('timeline-view');

let model, index, artist;       // loaded data
let searchCtl;

init().catch(showError);

async function init() {
  [model, index] = await Promise.all([loadModel(), loadIndex()]);
  searchCtl = mountSearch(searchBox, index, pick, {});
  for (const t of TYPES) typeIn.append(el('option', { value: t }, typeLabel(t)));
  // Release-date window (user decision 2026-09-13): forecasts are only offered for releases up to ONE YEAR after the
  // data cutoff; beyond six months after the cutoff the card carries a staleness note.
  const cutoff = new Date(model.data_cutoff || model.grid_anchor_date || new Date());
  const maxDate = addDays(cutoff, 365);
  const today = new Date();
  dateIn.min = toISODate(today);
  dateIn.max = toISODate(maxDate);
  const dflt = addDays(today, 90);
  dateIn.value = toISODate(dflt > maxDate ? maxDate : dflt);

  const wanted = qs('id') && index.find((a) => a.id === qs('id'));
  // Random default: the same showcase rule as the word cloud (forecast exists AND >= 3 explained albums on the
  // timeline, isShowcase; owner decision 2026-09-27), narrowed further to well-known artists (user decision 2026-09-13, line drawn at Super Junior's
  // latest album, popularity_weight 0.83 = about 300K first-week copies).
  const RANDOM_MIN_WEIGHT = 0.83;
  const showcase = index.filter(isShowcase);
  const candidates = showcase.filter((a) => (a.popularity_weight || 0) >= RANDOM_MIN_WEIGHT);
  // First paint stays at the top of the page (user 2026-09-27): no scroll to the result card on load.
  await pick(wanted || weightedPick(candidates.length ? candidates : showcase), true, { scroll: false });
  const cloudWrap = $('cloud-wrap');
  if (cloudWrap) { cloudWrap.hidden = false; mountCloud($('cloud'), index, (a) => { pick(a, true); window.scrollTo({ top: result.offsetTop - 12, behavior: 'smooth' }); }); }

  form.addEventListener('submit', (e) => { e.preventDefault(); go(); });
}

async function pick(a, autoGo = false, { scroll = true } = {}) {
  searchCtl.setValue(a);
  setQs('id', a.id);
  result.innerHTML = '';
  result.append(el('p', { class: 'muted small' }, 'Loading…'));
  try {
    artist = await loadArtist(a.id);
    setArtistTitle(artist.meta, '초동 예측 · next album first-week sales forecast');
  } catch (err) {
    result.innerHTML = '';
    result.append(notice('Data not available', `We do not have a data file for ${a.name_en} yet.`));
    return;
  }
  const d = artist.defaults || {};
  typeIn.value = d.type && TYPES.includes(d.type) ? d.type : 'mini';
  const lastNv = artist.latest?.n_versions;
  nvIn.value = d.n_versions ?? lastNv ?? 1;
  nvHint.textContent = lastNv != null ? `Last album: ${lastNv} version${lastNv === 1 ? '' : 's'}` : 'Last album: version count unknown';
  if (!artist.meta.has_prediction || !artist.grid?.length) {
    result.innerHTML = '';
    result.append(coldStart(artist));
    return;
  }
  if (autoGo) go({ scroll }); else result.innerHTML = '';
}

// Calibration sentence built from model.json (warning.calibration bins), so the numbers follow every refresh.
function calibSentence(m) {
  const bins = (m && m.warning && m.warning.calibration) || [];
  const ok = bins.filter(b => b && b.n >= 30 && b.mean_predicted_pct != null && b.actual_drop_pct != null);
  if (ok.length < 2) return 'in past tests the stated chance matched how often the drop actually happened.';
  const lo = ok[Math.min(1, ok.length - 1)], hi = ok[ok.length - 1];
  return `when the model said ${lo.mean_predicted_pct}%, about ${lo.actual_drop_pct}% of those albums actually dropped that much; when it said ${hi.mean_predicted_pct}%, about ${hi.actual_drop_pct}% did.`;
}

function go({ scroll = true } = {}) {
  if (!artist) return;
  if (!artist.meta.has_prediction || !artist.grid?.length) { result.innerHTML = ''; result.append(coldStart(artist)); if (tlView) { tlView.innerHTML = ''; tlView.append(renderTimeline(artist)); } return; }
  const type = typeIn.value;
  const nv = Number(nvIn.value) || 1;
  const lastNv = artist.latest?.n_versions ?? nv;
  const nvDelta = clamp(nv - lastNv, -3, 5);
  const cutoff = new Date(model.data_cutoff || model.grid_anchor_date);
  const chosen = new Date(dateIn.value);
  result.innerHTML = '';
  if (isNaN(chosen) || chosen > addDays(cutoff, 365)) {
    result.append(el('div', { class: 'cold' },
      el('h3', {}, 'Not supported yet'),
      el('p', {}, `Our data runs to ${fmtDate(toISODate(cutoff))}. We only forecast releases up to one year after that (until ${fmtDate(toISODate(addDays(cutoff, 365)))}), because further out the data no longer supports a useful forecast.`),
    ));
    return;
  }
  const stale = chosen > addDays(cutoff, 182);
  const mo = monthOffset(dateIn.value, 1, 12, model.grid_anchor_date);
  const row = findRow(artist.grid, type, nvDelta, mo);
  result.append(renderCard(row, { type, nv, lastNv, nvDelta, mo, date: dateIn.value, stale, cutoff: toISODate(cutoff) }));
  if (tlView) { tlView.innerHTML = ''; tlView.append(renderTimeline(artist)); }
  if (scroll) result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function findRow(grid, type, nvDelta, mo) {
  let best = null, bestD = Infinity;
  for (const r of grid) {
    const d = (r.type === type ? 0 : 100) + Math.abs(r.nv_delta - nvDelta) * 2 + Math.abs(r.month_offset - mo);
    if (d < bestD) { bestD = d; best = r; }
  }
  return best;
}

function renderCard(row, sc) {
  const m = artist.meta, L = artist.latest;
  const tier = L?.tier || m.tier;
  const tm = model.tier_metrics?.[tier] || {};
  const warn = model.warning || {};
  const ctx = shuffle(artist.context_features || []).slice(0, 3);
  const kind = m.is_solo ? 'Solo' : m.gender === 'female' ? 'Girl group' : m.gender === 'male' ? 'Boy group' : 'Co-ed group';
  const names = currentRoster(artist);

  const card = el('article', { class: 'glass share-card', id: 'share-card' });

  // 1. who
  card.append(el('h2', { class: 'sc-name' }, m.name_en, el('span', { class: 'kr' }, m.name_kr || '')));

  // 1b. sub-unit / solo origin (only when the export knows it)
  const o = m.origin;
  if (o && (o.parent || o.type === 'audition_solo')) {
    const txt = o.type === 'subunit' ? `Sub-unit of ${o.parent}`
      : o.type === 'solo_from_group' ? `Solo artist from ${o.parent}`
      : 'Solo artist from an audition programme';
    card.append(el('p', { class: 'sc-origin' }, txt));
  }

  // 2. scenario, one grey line
  card.append(el('p', { class: 'sc-scenario' },
    `If the next album drops in ${fmtYm(sc.date.slice(0, 7))} as a ${typeLabel(sc.type).toLowerCase()} with ${sc.nv} version${sc.nv === 1 ? '' : 's'}`,
    sc.nvDelta !== 0 ? ` (${sc.nvDelta > 0 ? '+' : ''}${sc.nvDelta} vs last)` : '',
  ));

  if (sc.stale) {
    card.append(el('p', { class: 'sc-stale' },
      `Our data ends ${fmtDate(sc.cutoff)}. This release is more than six months past that, so the forecast is likely to be less accurate than usual.`));
  }

  // 3. the number
  card.append(el('div', { class: 'sc-big' },
    el('div', { class: 'num' }, fmtInt(row.median)),
    el('div', { class: 'lbl' }, 'our middle guess, first-week copies'),
  ));

  // 4. the range + info button
  const info = el('button', { class: 'info-btn', type: 'button', 'aria-label': 'How to read this forecast', title: 'How to read this' }, 'i');
  info.addEventListener('click', () => openInfo(row, tm));
  card.append(el('div', { class: 'sc-likely' },
    el('p', { class: 'range' }, el('span', {}, 'Likely between ', el('b', {}, fmtInt(row.lo80)), ' and ', el('b', {}, fmtInt(row.hi80))), info),
    el('p', { class: 'why' }, '80% of past albums like this landed inside · tap ⓘ to see how the bands are made'),
  ));

  // 5. axis + two-item legend
  const ax = el('div', { class: 'axis-wrap' });
  ax.append(renderAxis(row));
  card.append(ax);
  card.append(el('p', { class: 'legend' },
    el('span', {}, el('i', { class: 'sw median' }), 'our middle guess'),
    el('span', {}, el('i', { class: 'sw band' }), 'likely ranges (50%, 80%, 90%)'),
  ));

  // 6. chance of a drop (always shown; heads-up box when it is more likely than not)
  const pDrop = Number.isFinite(row.p_drop_pct) ? row.p_drop_pct : null;
  if (pDrop != null) {
    const hot = pDrop >= 50;
    card.append(el('div', { class: hot ? 'warn' : 'chance' },
      el('b', {}, hot ? '⚠ Heads-up: ' : ''),
      'Chance of selling at least 20% fewer copies than the last album: ', el('b', {}, `${pDrop}%`),
      hot ? ` — when the model has put the odds this high before, it was right about ${pct100(warn.precision ?? 0)} of the time (any album: ${pct100(warn.base_rate ?? 0)}).` : '',
    ));
  }

  // 6b. latest album skipped as a sales-data anomaly: the drop chance compares with an earlier album (export forecast_note)
  const cmp = comparisonNote(artist);
  if (cmp) card.append(cmp);

  // 7. disclaimer
  card.append(el('div', { class: 'disclaimer' },
    el('div', { class: 'big' }, 'THIS SALES FORECAST IS FOR ENTERTAINMENT ONLY'),
    el('div', { class: 'sub' },
      `For artists in the ${tierLabel(tier)} tier, ${per100(tm.above_upper_share)}% of past albums sold more than the top of our likely range, `,
      `and ${per100(tm.below_lower_share)}% sold less than the bottom. The model cannot see a breakout coming.`),
  ));

  // 8. facts list
  const facts = el('dl', { class: 'facts' });
  const fact = (cls, label, ...value) => facts.append(el('div', { class: `fact ${cls}` }, el('dt', {}, el('i', { class: 'dot' }), label), el('dd', {}, ...value)));
  fact('f-type', 'Type', kind);
  fact('f-debut', 'Debut', m.debut_date ? fmtDate(m.debut_date) : 'not in our database yet');
  // Facts only (user 2026-09-13): title, month, type and size range of the latest album; no change-vs-previous here
  // (that belongs to the timeline below).
  if (L) fact('f-last wide', 'Latest album', `${L.title} · ${fmtYm(L.release_ym)} · ${typeLabel(L.type)} · sold in the ${tierLabel(L.tier)} range`);
  if (!m.is_solo) fact('f-members wide', 'Members', names.length
    ? el('span', { class: 'pills' }, ...names.map((n) => el('span', { class: 'pill' }, n)))
    : (m.n_members != null ? `${m.n_members} member${m.n_members === 1 ? '' : 's'} (names not in our database yet)` : 'not in our database yet'));
  if (ctx.length) fact('f-model wide', 'Model looked at',
    el('ul', { class: 'ctx-list' }, ...ctx.map((c) => el('li', {}, el('span', { class: 'ctx-label' }, c.label_en), el('b', { class: 'ctx-value' }, c.value)))),
    el('p', { class: 'ctx-note' }, `Instagram and YouTube figures are the latest 3 months in our data (Instagram through ${fmtYm(model.ig_data_through || '')}${model.yt_data_through ? `, YouTube through ${fmtYm(model.yt_data_through)}` : ''}); the forecast uses the same values whatever release date you choose.`));
  card.append(facts);

  // 9. roster note + Fix data, at the very end
  card.append(el('div', { class: 'sc-fix' },
    el('span', {}, '✎ roster in our database — corrections welcome'),
    formLink(formUrl('fix'), 'Something looks off? Tell me →', 'btn sm ghost'),
  ));
  card.append(el('div', { class: 'sc-foot' },
    el('span', { class: 'logo' }, 'K-pop 초동 forecast'),
    el('span', {}, CFG.SITE_URL ? CFG.SITE_URL.replace(/^https?:\/\//, '') : `data as of ${model.data_cutoff || '—'}`),
  ));
  return card;
}

/** "How to read this" explanation with the current numbers (bottom sheet on phones). */
function openInfo(row, tm) {
  const name = artist.meta.name_en;
  const missPct = tm.median_err_x != null ? Math.round((tm.median_err_x - 1) * 100) : null;
  const over2x = tm.hit_2x != null ? Math.round((1 - tm.hit_2x) * 100) : null;
  const n = tm.n != null ? fmtInt(tm.n) : 'the';
  let dlg = document.getElementById('info-dialog');
  if (!dlg) {
    dlg = el('dialog', { id: 'info-dialog', class: 'sheet', 'aria-labelledby': 'info-title' });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    document.body.append(dlg);
  }
  dlg.innerHTML = '';
  dlg.append(
    el('div', { class: 'sheet-head' }, el('h3', { id: 'info-title' }, 'How to read this forecast'),
      el('button', { class: 'clear', type: 'button', 'aria-label': 'Close', onclick: () => dlg.close() }, '×')),
    el('p', {}, `Our middle guess for ${name}'s next album is `, el('b', {}, fmtInt(row.median)), ' first-week copies. Half of the time the real number would be above this, half below.'),
    el('p', {}, 'The three purple bands are how sure we are: there is a 50% chance the real first week lands between ',
      el('b', {}, fmtInt(row.lo50)), ' and ', el('b', {}, fmtInt(row.hi50)), ', an 80% chance it lands between ',
      el('b', {}, fmtInt(row.lo80)), ' and ', el('b', {}, fmtInt(row.hi80)), ', and a 90% chance it lands between ',
      el('b', {}, fmtInt(row.lo90)), ' and ', el('b', {}, fmtInt(row.hi90)), '.'),
    el('p', {}, `How do we know? We tested this on ${n} past albums by artists of a similar size: our guess was typically off by about `,
      el('b', {}, missPct != null ? `${missPct}%` : '?'), ' either way, and ', el('b', {}, over2x != null ? `${over2x}%` : '?'),
      ' of the time it was off by more than double. Those past misses are what set the width of the bands.'),
    el('p', {}, 'The "chance of selling at least 20% fewer" number is read off the same bands. It is honest: ' + calibSentence(model)),
    el('p', {}, 'The bands are wider on the upside because album sales move in multiples, not in fixed amounts — a jump from ',
      el('b', {}, fmtInt(row.median)), ' to ', el('b', {}, fmtInt(row.hi80)), ' and a drop to ', el('b', {}, fmtInt(row.lo80)),
      ' are the same size in percentage terms.'),
    el('p', { class: 'small muted' }, el('a', { href: './about/#how-to-read' }, 'More on the About page →')),
  );
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
}

function per100(x) { return x == null ? '?' : Math.round(x * 100); }

function coldStart(a) {
  const m = a.meta;
  // reasons read from the timeline: sales-data anomaly flags (forecast_status) and the training window (2026-09-28)
  const why = noForecastReasons(a);
  const n = notice(`${m.name_en} — no forecast`, `We can't anchor a forecast for this act. ${why.sentences.join(' ')}`);
  if (why.flagged.length) {
    n.append(el('p', { class: 'anomaly-note' }, el('b', {}, 'Sales data anomaly: '), ANOMALY_WHY, ' ',
      el('a', { href: ANOMALY_ABOUT }, 'How we spot this')));
  }
  n.append(el('p', { class: 'small muted' }, 'Think we are missing an album? '), formLink(formUrl('fix'), 'Missing an album? Tell me →', 'btn sm fix'));
  return n;
}

/** Truncate a long feature label on a word boundary (full text goes into title=). */
function shortLabel(label, max = 30) {
  const t = String(label || '');
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return (sp > 12 ? cut.slice(0, sp) : cut).replace(/[\s:,(]+$/, '') + '…';
}

function fmtX(x) { return Number(x).toFixed(2).replace(/0$/, ''); }

function notice(title, text) {
  return el('div', { class: 'glass card notice' }, el('h3', {}, title), el('p', {}, text));
}

function showError(err) {
  console.error(err);
  result.innerHTML = '';
  result.append(notice('Could not load data', String(err.message || err)));
}
