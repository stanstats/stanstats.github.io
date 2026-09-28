// Member names for an artist: the roster of the latest album in the timeline
// (members_on_stage); a solo artist is listed by name. Returns [] if unknown.
export function latestRoster(artist) {
  const m = artist.meta || {};
  const tl = artist.timeline || [];
  for (let i = tl.length - 1; i >= 0; i--) {
    const names = tl[i].members_on_stage;
    if (Array.isArray(names) && names.length) return names;
  }
  if (m.is_solo) return [m.name_en];
  return [];
}

// Group-level member list for the artist header and the home card (2026-09-28): meta.members_current
// (everyone on the roster today, members on hiatus or in service included); falls back to the
// latest album's roster when the export has no list.
export function currentRoster(artist) {
  const cur = (artist.meta || {}).members_current;
  if (Array.isArray(cur) && cur.length) return cur;
  return latestRoster(artist);
}
