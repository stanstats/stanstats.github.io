// About: fill in data cutoff and placeholder links from config.
import { loadModel } from './data.js';
import * as CFG from '../config.js';
import { formUrl, boot, formLink, el, tierLabel, fmtInt } from './util.js';

boot();

loadModel().then((m) => {
  document.getElementById('data-cutoff').textContent = m.data_cutoff || '—';
  const v = document.getElementById('model-version');
  // model_version is an internal code name; show only when the model was last updated (month of generated_at).
  const upd = m.generated_at ? new Date(m.generated_at) : null;
  if (v) v.textContent = upd && !isNaN(upd) ? ` · model updated ${upd.toLocaleString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' })}` : '';
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

const repo = document.getElementById('repo-link');
if (repo) {
  if (CFG.REPO_URL) { repo.href = CFG.REPO_URL; repo.textContent = CFG.REPO_URL.replace(/^https?:\/\//, ''); }
  else repo.replaceWith(el('span', { class: 'muted' }, 'repository link coming soon'));
}
