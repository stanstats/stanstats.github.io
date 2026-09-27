// JSON loaders. Everything comes from DATA_URL (see config.js); nothing external.
import { DATA_URL } from '../config.js';

const cache = new Map();

async function getJson(path) {
  if (cache.has(path)) return cache.get(path);
  const p = fetch(new URL(path, DATA_URL), { cache: 'no-cache' }).then(async (r) => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${path}`);
    return r.json();
  });
  cache.set(path, p);
  p.catch(() => cache.delete(path));
  return p;
}

export const loadModel = () => getJson('model.json');
export const loadIndex = () => getJson('artists_index.json');
export const loadArtist = (id) => getJson(`artists/${encodeURIComponent(id)}.json`);
export const loadFindings = () => getJson('findings.json');
