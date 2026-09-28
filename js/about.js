// About: fill in data cutoff, the accuracy table and its tested years, and placeholder links from config.
import { loadModel } from './data.js';
import * as CFG from '../config.js';
import { formUrl, boot, formLink, el, tierLabel, fmtInt, fmtDate } from './util.js';

boot();

loadModel().then((m) => {
  document.getElementById('data-cutoff').textContent = m.data_cutoff || '—';
  const v = document.getElementById('model-version');
  // model_version is an internal code name; show only when the model was last updated (month of generated_at).
  const upd = m.generated_at ? new Date(m.generated_at) : null;
  if (v) v.textContent = upd && !isNaN(upd) ? ` · model updated ${upd.toLocaleString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' })}` : '';
  oosSentence(m);
  const tb = document.querySelector('#tier-table tbody');
  if (tb && m.tier_metrics) {
    for (const [tier, tm] of Object.entries(m.tier_metrics)) {
      tb.append(el('tr', {},
        el('td', {}, tierLabel(tier)),
        el('td', {}, tm.n != null ? fmtInt(tm.n) : '—'),
        el('td', {}, tm.median_err_x != null ? `about ${Math.round((tm.median_err_x - 1) * 100)}% either way` : '—'),
        el('td', {}, tm.hit_2x != null ? `${Math.round((1 - tm.hit_2x) * 100)}% of the time` : '—')));
    }
  }
}).catch(() => { document.getElementById('data-cutoff').textContent = '—'; });

const coffee = document.getElementById('coffee');
if (coffee) {
  if (CFG.COFFEE_URL) { coffee.href = CFG.COFFEE_URL; coffee.target = '_blank'; coffee.rel = 'noopener'; }
  else { coffee.replaceWith(el('span', {}, coffee.textContent)); }
}

const contact = document.getElementById('contact-links');
if (contact) {
  contact.append(formLink(formUrl('contact'), 'Fix a number, add an artist, or just say hi →', 'btn'));
}

// "How do we know?" sentence: the tested years, last tested day and album count follow model.json, like calibSentence()
// on Home. src/site/export.py scores the rolling out-of-sample years TEST_YEARS.start + 1 .. the last test year (the first
// test year, 2021, has no earlier year for the drift correction). The deployed model.json has no provenance block
// (src/site/build.sh strips it), so: first year = provenance text when present, else the static 2022 in about/index.html;
// last year and last day = data_cutoff (the newest scored release); count = the sum of tier_metrics n (= n_oof_rows).
function oosSentence(m) {
  const set = (id, txt) => { const x = document.getElementById(id); if (x && txt) x.textContent = txt; };
  const yrs = /release year (\d{4})\D(\d{4})/.exec((m && m.provenance && m.provenance.tier_metrics_warning_coverage) || '');
  if (yrs) set('oos-from', yrs[1]);
  if (m && /^\d{4}-\d{2}-\d{2}/.test(m.data_cutoff || '')) {
    const y = m.data_cutoff.slice(0, 4);
    set('oos-to', y); set('oos-to-2', y); set('oos-until', fmtDate(m.data_cutoff));
  }
  const n = Object.values((m && m.tier_metrics) || {}).reduce((s, t) => s + (t.n || 0), 0);
  if (n > 0) set('oos-n', fmtInt(n));
}
