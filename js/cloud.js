// Floating word cloud of artists (shared by Home and the legacy Artists page).
import { el, weightedSample, weightedPick, isShowcase } from './util.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const POOL_TARGET = 30;

/** Mount the cloud into `cloud`; `onPick(artistRow)` is called when a name is tapped (falls back to the href). */
export function mountCloud(cloud, fullIndex, onPick) {
  // Only artists we can forecast, with at least 3 explained albums on the timeline (isShowcase, owner decision
  // 2026-09-27; before that: at least 3 albums of history, 2026-09-26 -- a cold-start act like wave to earth must not
  // float past as if it had a forecast). Same rule as the random default on Home.
  const index = fullIndex.filter(isShowcase);
  function renderCloud() {
  cloud.innerHTML = '';
  const nLanes = window.innerWidth >= 620 ? 4 : 3;
  const perLane = Math.ceil(POOL_TARGET / nLanes);
  const shown = new Set();
  const lanes = [];
  for (let i = 0; i < nLanes; i++) {
    const dir = i % 2 === 0 ? -1 : 1;                       // -1 = drifts left, +1 = drifts right
    const laneEl = el('div', { class: `lane ${dir < 0 ? 'ltr' : 'rtl'}` });
    const track = el('div', { class: 'track' });
    laneEl.append(track);
    cloud.append(laneEl);
    const lane = { el: laneEl, track, dir, offset: 0, speed: 14 + Math.random() * 14 /* px/s ≈ 20–40 s per lane width */ , born: 0 };
    lanes.push(lane);
    const picks = weightedSample(index.filter((a) => !shown.has(a.id)), perLane);
    for (const a of picks) { shown.add(a.id); track.append(pill(a, lane)); }
  }
  // make sure every track is wider than its lane so the loop has no gap
  for (const lane of lanes) {
    const need = lane.el.clientWidth * 1.6;
    let guard = 0;
    while (lane.track.scrollWidth < need && guard++ < 20) {
      const a = weightedPick(index.filter((x) => !shown.has(x.id)));
      if (!a) break;
      shown.add(a.id); lane.track.append(pill(a, lane));
    }
  }
  if (REDUCED) return;

  let last = performance.now();
  function frame(now) {
    if (!cloud.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    for (const lane of lanes) {
      lane.offset += lane.speed * dt;
      const first = lane.track.firstElementChild;
      if (first && !first.classList.contains('leave')) {
        const w = first.offsetWidth + 10;                     // 10 = flex gap
        if (lane.offset >= w) { lane.offset -= w; lane.track.append(first); }
      }
      lane.track.style.transform = `translateX(${(lane.dir * lane.offset).toFixed(1)}px)`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // rotation: new name rises into a lane, the oldest one there fades away
  const timer = setInterval(() => {
    if (!cloud.isConnected) { clearInterval(timer); return; }
    if (document.hidden) return;
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const candidates = index.filter((a) => !shown.has(a.id));
    if (!candidates.length) return;
    const a = weightedPick(candidates);
    shown.add(a.id);
    const p = pill(a, lane); p.classList.add('enter');
    lane.track.append(p);
    p.addEventListener('animationend', () => p.classList.remove('enter'), { once: true });
    // oldest pill that is not the one currently being recycled at the head
    const kids = Array.from(lane.track.children).filter((k) => !k.classList.contains('leave') && k !== p && k !== lane.track.firstElementChild);
    kids.sort((x, y) => Number(x.dataset.t) - Number(y.dataset.t));
    const old = kids[0];
    if (old) {
      old.style.width = `${old.offsetWidth}px`;
      requestAnimationFrame(() => old.classList.add('leave'));
      old.addEventListener('transitionend', () => { shown.delete(old.dataset.id); old.remove(); }, { once: true });
      setTimeout(() => { if (old.isConnected) { shown.delete(old.dataset.id); old.remove(); } }, 900);
    }
  }, 2000 + Math.random() * 1000);
}

  function pill(a, lane) {
  const w = a.popularity_weight || 0.2;
  const size = 0.7 + w * 0.5;                                  // rem
  const link = el('a', {
    href: `?id=${encodeURIComponent(a.id)}`,
    dataset: { id: a.id, t: String(lane.born++) },
    style: `font-size:${size.toFixed(2)}rem;--oy:${(Math.random() * 12 - 6).toFixed(0)}px;opacity:${(0.75 + w * 0.25).toFixed(2)};`,
  }, a.name_en, a.name_kr ? el('span', { class: 'kr' }, a.name_kr) : null);
  link.addEventListener('click', (e) => { if (onPick) { e.preventDefault(); onPick(a); } });
  return link;
}
  renderCloud();
  let rw; window.addEventListener('resize', () => { clearTimeout(rw); rw = setTimeout(renderCloud, 250); });
}
