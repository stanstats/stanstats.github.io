// Site configuration. Edit this file only; nothing else needs to change.
// All values are plain strings so the site keeps working with empty placeholders.

// Where the JSON data lives, relative to this file (site root).
//   './data/'      -> production export written by src/site/export.py
//   './data-mock/' -> fictional data for local front-end development
export const DATA_BASE = './data/';

// One anonymous form (Tally, free). The site appends ?kind=fix / ?kind=add / ?kind=contact so the form's hidden
// "kind" field tells you what the message is about. Leave empty to show a "not set up yet" notice instead of a broken link.
export const FORM_URL = 'https://tally.so/r/kdqo7j';

// "Buy the developer a coffee" link (Ko-fi / Buy Me a Coffee). Empty = plain text, no link.
export const COFFEE_URL = '';

// Public code repository (used for "open source" and findings links). Empty = links hidden.
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
