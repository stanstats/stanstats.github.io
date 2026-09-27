// Small shared helpers. No dependencies.
import * as CFG from '../config.js';

export const TYPE_LABEL = {
  mini: 'Mini album',
  studio: 'Full album',
  single_album: 'Single album',
  repackage: 'Repackage',
};
export const TYPES = Object.keys(TYPE_LABEL);

export const TIER_LABEL = {
  '<5k': 'under 5K',
  '5k-50k': '5K–50K',
  '50k-500k': '50K–500K',
  '>500k': 'over 500K',
};

export function typeLabel(t) { return TYPE_LABEL[t] || t || '—'; }
export function tierLabel(t) { return TIER_LABEL[t] || t || '—'; }

/** 1234567 -> "1,234,567" */
export function fmtInt(n) {
  if (n == null || isNaN(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
}

/** Short axis label: 1234567 -> "1.2M", 45000 -> "45K", 850 -> "850". */
export function fmtShort(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return trim((n / 1e6).toFixed(a >= 1e7 ? 0 : 1)) + 'M';
  if (a >= 1e3) return trim((n / 1e3).toFixed(a >= 1e5 ? 0 : (a >= 1e4 ? 0 : 1))) + 'K';
  return String(Math.round(n));
  function trim(s) { return s.replace(/\.0$/, ''); }
}

export function fmtPct(p, digits = 0) {
  if (p == null || isNaN(p)) return '—';
  const s = (p >= 0 ? '+' : '−') + Math.abs(p).toFixed(digits) + '%';
  return s;
}

export function pct100(x, digits = 0) { return (x * 100).toFixed(digits) + '%'; }

/** "2023-04" -> "Apr 2023" */
export function fmtYm(ym) {
  if (!ym) return '—';
  const [y, m] = ym.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[(m || 1) - 1]} ${y}`;
}

/** "2015-05-26" -> "26 May 2015" */
export function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${names[(m || 1) - 1]} ${y}`;
}

export function toISODate(d) {
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

/** Whole months from today to the given date, rounded, clamped to [lo, hi]. */
export function monthOffset(dateStr, lo = 1, hi = 12, base = null) {
  // Months from `base` (the grid anchor date the export was computed from; defaults to today) to `dateStr`.
  const now = base ? new Date(base) : new Date();
  const t = new Date(dateStr);
  if (isNaN(t)) return 3;
  let m = (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth());
  if (t.getDate() - now.getDate() > 15) m += 1;
  if (t.getDate() - now.getDate() < -15) m -= 1;
  return Math.min(hi, Math.max(lo, m));
}

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** Weighted random pick; weights default to popularity_weight. */
export function weightedPick(items, weightOf = (a) => a.popularity_weight || 0.01) {
  let total = 0;
  for (const it of items) total += Math.max(0, weightOf(it));
  let r = Math.random() * total;
  for (const it of items) {
    r -= Math.max(0, weightOf(it));
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

/** Weighted sample without replacement. */
export function weightedSample(items, n, weightOf) {
  const pool = items.slice();
  const out = [];
  while (pool.length && out.length < n) {
    const pick = weightedPick(pool, weightOf);
    out.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }
  return out;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Case- and symbol-insensitive normalisation used by search. Keeps Hangul. */
export function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

/** Tiny element builder: el('div', {class:'x', onclick}, children...) */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Render a masked figure ("45*,***") as plain text; the asterisks get a tabular,
 *  slightly bolder style so they line up with the digits (see .mask in style.css). */
export function maskedText(str) {
  const frag = document.createDocumentFragment();
  for (const part of String(str ?? '—').split(/(\*+)/)) {
    if (!part) continue;
    frag.append(part[0] === '*' ? el('span', { class: 'mask' }, part) : document.createTextNode(part));
  }
  return frag;
}

export function qs(name) { return new URLSearchParams(location.search).get(name); }

export function setQs(name, value) {
  const u = new URL(location.href);
  if (value == null || value === '') u.searchParams.delete(name); else u.searchParams.set(name, value);
  history.replaceState(null, '', u);
}

/** Link to a form URL from config; returns an <a> or a disabled button-like <a>. */
/** URL of the single Tally form with the message kind pre-filled (fix | add | contact); '' when not configured. */
export function formUrl(kind) {
  const u = (CFG.FORM_URL || '').trim();
  if (!u) return '';
  return u + (u.includes('?') ? '&' : '?') + 'kind=' + encodeURIComponent(kind);
}

export function formLink(url, text, cls = 'btn') {
  const a = el('a', { class: cls, href: url || '#', target: url ? '_blank' : null, rel: url ? 'noopener' : null }, text);
  if (!url) {
    a.setAttribute('aria-disabled', 'true');
    a.title = 'Form not set up yet — see site/config.js';
    a.addEventListener('click', (e) => e.preventDefault());
  }
  return a;
}

/** Inject analytics snippet so that <script> tags actually execute. */
export function injectAnalytics() {
  const snippet = CFG.ANALYTICS_SNIPPET;
  if (!snippet || !snippet.trim()) return;
  const tpl = document.createElement('template');
  tpl.innerHTML = snippet.trim();
  for (const node of Array.from(tpl.content.childNodes)) {
    if (node.tagName === 'SCRIPT') {
      const s = document.createElement('script');
      for (const a of node.attributes) s.setAttribute(a.name, a.value);
      s.text = node.text;
      document.body.append(s);
    } else {
      document.body.append(node.cloneNode(true));
    }
  }
}

/* Share-card and canonical URLs from SITE_URL (config.js). The static og:image / twitter:image tags are relative because
   the site URL is not fixed yet; here they become absolute and a canonical link is added. Limitation: most link-preview
   crawlers do not run JavaScript, so until the static tags carry the absolute URL, previews may show no image. */
export function seoMeta() {
  const base = (CFG.SITE_URL || '').trim();
  if (!base) return;
  const siteBase = base.replace(/\/?$/, '/');
  const root = new URL('../', import.meta.url);                 // site root (this file lives in js/)
  const here = new URL(location.href);
  let rel = here.pathname.startsWith(root.pathname) ? here.pathname.slice(root.pathname.length) : '';
  rel = rel.replace(/index\.html$/, '');
  const id = here.searchParams.get('id');                         // artist / home deep links keep ?id=
  const canonical = new URL(rel + (id ? `?id=${encodeURIComponent(id)}` : ''), siteBase).href;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.append(link); }
  link.href = canonical;
  const setMeta = (attr, key, value) => {
    let m = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!m) { m = document.createElement('meta'); m.setAttribute(attr, key); document.head.append(m); }
    m.setAttribute('content', value);
  };
  const img = new URL('img/og.png', siteBase).href;
  setMeta('property', 'og:url', canonical);
  setMeta('property', 'og:image', img);
  setMeta('name', 'twitter:image', img);
}

/** Mark the current nav link. */
export function markNav() {
  const here = location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.nav a').forEach((a) => {
    const target = new URL(a.getAttribute('href'), location.href).pathname.replace(/index\.html$/, '');
    if (target === here) a.setAttribute('aria-current', 'page');
  });
}

/* "Found this useful?" thumbs-up counter (user request 2026-09-13). Static site, so the count lives in GoatCounter:
   a click is recorded as the event `like`, and the public counter endpoint returns how many clicks so far.
   Without GOATCOUNTER_CODE the button still works, but only remembers the click in this browser. */
export function mountLike() {
  const foot = document.querySelector('.site-footer');
  if (!foot) return;
  const code = (CFG.GOATCOUNTER_CODE || '').trim();
  let liked = false;
  try { liked = localStorage.getItem('liked') === '1'; } catch (e) { /* storage may be unavailable */ }
  const count = el('span', { class: 'like-count' }, '');
  const btn = el('button', { class: 'like-btn' + (liked ? ' done' : ''), type: 'button', 'aria-label': 'This site was useful to me' }, liked ? '👍 Thanks!' : '👍 Useful');
  const wrap = el('div', { class: 'like-wrap' }, el('span', { class: 'like-q' }, 'Found this website useful? A thumbs-up keeps me motivated to update.'), btn, count);
  foot.append(wrap);
  const refresh = async () => {
    if (!code) return;
    try {
      const r = await fetch(`https://${code}.goatcounter.com/counter/like.json`, { cache: 'no-store' });
      if (r.ok) { const j = await r.json(); if (j.count) count.textContent = `${j.count} so far`; }
    } catch (e) { /* counter not enabled yet */ }
  };
  btn.addEventListener('click', () => {
    if (liked) return;
    liked = true; btn.classList.add('done'); btn.textContent = '👍 Thanks!';
    try { localStorage.setItem('liked', '1'); } catch (e) { /* ignore */ }
    if (code && window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: 'like', title: 'like', event: true });
      setTimeout(refresh, 1500);
    }
  });
  refresh();
}

export function boot() {
  markNav();
  seoMeta();
  injectAnalytics();
  mountLike();
}
