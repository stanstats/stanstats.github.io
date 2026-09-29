// Site configuration. Edit this file only; nothing else needs to change.
// All values are plain strings so the site keeps working with empty placeholders.

// Where the JSON data lives, relative to this file (site root).
//   './data/'      -> production export written by src/site/export.py
//   './data-mock/' -> fictional data for local front-end development
export const DATA_BASE = './data/';

// One anonymous form (Tally, free). The site appends ?kind=fix / ?kind=add / ?kind=contact so the form's hidden
// "kind" field tells you what the message is about. Leave empty to show a "not set up yet" notice instead of a broken link.
export const FORM_URL = 'https://tally.so/r/kdqo7j';


// Public code repository, read only by js/findings.js ("Read the experiment note" links). Owner ruling 2026-09-28:
// the code stays private and only the site repository is public, so this stays empty (links hidden). The About page
// no longer links a repository.
export const REPO_URL = '';

// Analytics: paste the one-line snippet from Cloudflare Web Analytics or
// GoatCounter as an HTML string, e.g.
//   '<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{"token": "..."}\'></script>'
// Empty string = no analytics. Scripts are re-created so they actually execute.
export const ANALYTICS_SNIPPET = '<script data-goatcounter="https://stanstats.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>';

// GoatCounter site code (the part before .goatcounter.com), used for the "found this useful" thumbs-up counter.
// Requires "Allow adding visitor counts on your website" to be ON in GoatCounter settings. Empty = button works locally only.
export const GOATCOUNTER_CODE = 'stanstats';

// Canonical site URL, printed at the bottom of the share card (optional).
export const SITE_URL = 'https://stanstats.github.io';

// Resolved absolute URL for the data folder (do not edit).
export const DATA_URL = new URL(DATA_BASE, import.meta.url).href;
