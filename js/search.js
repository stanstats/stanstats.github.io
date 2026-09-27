// Artist search box: fuse.js (CDN, global `Fuse`) with a built-in fallback
// so the page still works if the CDN is blocked.
import { formUrl, el, normalize, formLink } from './util.js';

function buildMatcher(index) {
  const docs = index.map((a) => ({
    ...a,
    _n: [a.name_en, a.name_kr, ...(a.aliases || [])].map(normalize).join(' '),
  }));
  if (window.Fuse) {
    const fuse = new window.Fuse(docs, {
      keys: [
        { name: 'name_en', weight: 0.5 },
        { name: 'name_kr', weight: 0.4 },
        { name: 'aliases', weight: 0.3 },
        { name: '_n', weight: 0.6 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 1,
      isCaseSensitive: false,
      ignoreDiacritics: true,
    });
    return (q) => {
      const nq = normalize(q);
      const hits = fuse.search(q).map((r) => r.item);
      const hits2 = nq ? fuse.search(nq).map((r) => r.item) : [];
      const seen = new Set();
      const out = [];
      for (const h of [...exact(docs, nq), ...hits, ...hits2]) {
        if (!seen.has(h.id)) { seen.add(h.id); out.push(h); }
      }
      return out.slice(0, 8);
    };
  }
  // Fallback: normalised substring / prefix match.
  return (q) => {
    const nq = normalize(q);
    if (!nq) return [];
    const scored = docs
      .map((d) => {
        const i = d._n.indexOf(nq);
        if (i < 0) return null;
        return { d, s: (i === 0 ? 0 : 1) + (1 - (d.popularity_weight || 0)) };
      })
      .filter(Boolean)
      .sort((a, b) => a.s - b.s);
    return scored.slice(0, 8).map((x) => x.d);
  };
}

function exact(docs, nq) {
  if (!nq) return [];
  return docs.filter((d) => d._n.split(' ').some((t) => t === nq || t.startsWith(nq)));
}

/**
 * Mount a search box. Returns { setValue(artist) }.
 * onSelect(artistIndexRow) is called when the user picks one.
 */
export function mountSearch(container, index, onSelect, opts = {}) {
  const match = buildMatcher(index);
  const input = el('input', {
    class: 'input', type: 'text', autocomplete: 'off', spellcheck: 'false',
    placeholder: opts.placeholder || 'Artist name — English or 한국어',
    'aria-label': 'Search artist', 'aria-autocomplete': 'list', 'aria-expanded': 'false',
    role: 'combobox', 'aria-controls': 'search-list',
  });
  const clear = el('button', { class: 'clear', type: 'button', 'aria-label': 'Clear' }, '×');
  const list = el('ul', { class: 'dropdown glass', id: 'search-list', role: 'listbox', hidden: true });
  const box = el('div', { class: 'search' }, input, clear, list);
  container.append(box);

  let items = [];
  let active = -1;
  let current = null;

  function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; }
  function render(q) {
    items = match(q);
    list.innerHTML = '';
    if (!q.trim()) { close(); return; }
    if (!items.length) {
      const li = el('li', { class: 'empty' },
        el('span', {}, `No match for “${q}”. Not in our database yet?`),
        formLink(formUrl('add'), 'Add this artist →', 'btn sm'));
      list.append(li);
    }
    items.forEach((a, i) => {
      const li = el('li', { role: 'option', id: `opt-${i}`, 'aria-selected': 'false' },
        el('span', {}, a.name_en, ' ', el('span', { class: 'kr' }, a.name_kr || '')),
        el('span', { class: 'tag' }, a.has_prediction ? (a.is_solo ? 'solo' : 'group') : 'no forecast'));
      li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(a); });
      list.append(li);
    });
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    active = -1;
  }
  function choose(a) {
    current = a;
    input.value = a.name_en;
    close();
    onSelect(a);
  }
  function highlight() {
    Array.from(list.children).forEach((li, i) => li.setAttribute('aria-selected', i === active ? 'true' : 'false'));
    if (active >= 0) list.children[active].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', () => render(input.value));
  input.addEventListener('focus', () => { if (input.value && current && input.value === current.name_en) input.select(); });
  input.addEventListener('keydown', (e) => {
    if (list.hidden && (e.key === 'ArrowDown') && input.value) { render(input.value); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 1); highlight(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); highlight(); }
    else if (e.key === 'Enter') {
      if (!list.hidden && items.length) { e.preventDefault(); choose(items[Math.max(0, active)]); }
    } else if (e.key === 'Escape') close();
  });
  input.addEventListener('blur', () => setTimeout(close, 120));
  clear.addEventListener('click', () => { input.value = ''; current = null; close(); input.focus(); });

  return {
    setValue(a) { current = a; input.value = a ? a.name_en : ''; close(); },
    input,
  };
}
