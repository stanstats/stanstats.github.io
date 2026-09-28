# stanstats · K-pop first-week album sales, forecast before the comeback

**Live site: https://stanstats.github.io/**

A non-profit, ad-free data project by a K-pop fan. It answers one question: *if an artist announces a comeback today,
how many copies will the album sell in its first week (초동), and how sure can anyone be?* Every prediction uses only
what is knowable about 120 days before release — the previous album, the artist's history and public activity — so
it is a green-light tool, not a hindsight chart. For entertainment only.

## What is on the site

- **Forecast** — pick any of 500 artists, an album type and a version count; get the median first week, the 50/80/90% bands
  and the chance of a drop versus the last album.
- **Artist timelines** — every past album with the model's after-the-fact prediction next to the real outcome, so you can
  see where the model is good and where it is not.
- **Findings** — short, sourced write-ups of what the data actually shows (list below).
- **About** — method, error rates by artist size, data sources and licenses, and a contact form.

## Findings

- [What adding an album version does to first-week sales](https://stanstats.github.io/findings/#card-02-what-adding-an-album-version-does-to-fir) — **+10%**
  Adding versions does not raise sales in proportion — doubling the versions adds about a quarter, not double.
- [The last album already tells you most of the next one](https://stanstats.github.io/findings/#card-04-the-last-album-already-tells-you-most-of) — **79%**
  Know one number — last comeback's first week — and you know most of what can be known.
- [The whole market swings year to year](https://stanstats.github.io/findings/#card-05-the-whole-market-swings-year-to-year) — **+39% → 0%**
  From one year to the next, the typical comeback's growth over its predecessor has moved by up to 22 points: about +30% a year in 2019–2022, +10% in 2023, flat since 2024.
- [The longer the silence, the smaller the first week](https://stanstats.github.io/findings/#card-07-the-longer-the-silence-the-smaller-the-f) — **−6%**
  The typical comeback arrives about eight and a half months after the previous album. Wait a year or two instead and the first week is about 6% smaller; wait four years or more and it is about 13% smaller.
- [K-pop albums became a fan-only market: the first week went from a quarter to over 80% of total sales](https://stanstats.github.io/findings/#card-09-k-pop-albums-became-a-fan-only-market-th) — **26% → 84%**
  In 2015 the first week was about a quarter of an album's Korean sales. In 2025 it was 84%, and 2026 so far is higher still.
- [The typical fan stays for about three years](https://stanstats.github.io/findings/#card-10-the-typical-fan-stays-for-about-three-ye) — **about 3 years**
  Every comeback wins a new group of fans, and each group's support tapers on the albums that follow. The fan life cycle that best fits the data: half of a group is gone after roughly two years.
- [How album type affects first-week sales](https://stanstats.github.io/findings/#card-13-how-album-type-affects-first-week-sales) — **+15% / −28% / −47%**
  Compared with a mini album by the same artist, a full album sells about 15% more, a single album about 28% less, and a repackage about half.
- [A drop in sales is a one-off, not a trend](https://stanstats.github.io/findings/#card-14-a-drop-in-sales-is-a-one-off-not-a-trend) — **23% vs 25%**
  After an album falls by more than 20%, the chance that the next one falls again is 23%, about the same as for any album (25%). The lost ground usually stays lost, but the slide does not continue.
- [Boy-group fans stay longer; solo fans come and go](https://stanstats.github.io/findings/#card-17-boy-group-fans-stay-longer-solo-fans-com) — **80% / 75% / 60%**
  A boy group keeps at least 80% of its previous first week 80% of the time, a girl group 75% of the time, and a soloist about 60% of the time.
- [Release weekday does not affect first-week sales; it affects which charts an album lands on](https://stanstats.github.io/findings/#card-19-release-weekday-does-not-affect-first-we) — **0**
  Albums released on any weekday sell about the same relative to the artist's last album. The weekday matters for weekly charts that close on a fixed day, not for the seven-day first-week count.
- [Follower count tells you how big an artist is; follower growth tells you where they are going](https://stanstats.github.io/findings/#card-20-follower-count-tells-you-how-big-an-arti) — **×1.34 vs ×1.00**
  Without sales history, follower count is the single most useful number. Once you know the last album, it adds nothing, but how fast the fanbase grew during the gap still does: the fastest-growing quarter sells 1.34 times the last album, the slowest quarter 1.00.
- [Messy data is not why forecasts miss: source disagreement is 3% of the error](https://stanstats.github.io/findings/#card-22-messy-data-is-not-why-forecasts-miss-sou) — **3%**
  We checked first-week figures against multiple sources. Where sources disagree, they differ by about 13%. Our forecast error is far larger, so almost all of it is real variation in what fans did.

## How it works, in one paragraph

A linear model with a handful of interpretable terms (previous album, album type, version-count change, fan growth,
time since the last release) sets the centre; two tree-based members refine it; the bands come from the model's own
out-of-sample misses on past albums by artists of similar size. The evaluation is rolling: each test year is predicted
by a model that never saw it. Sales figures are never shown raw — only ratios, tiers and masked numbers.

## Data and refresh

- Data as of **2026-09-03**; the site is rebuilt monthly and the footer shows the date.
- Sales come from an internal dataset compiled from public sales summaries and charts; artist facts from Wikipedia and
  Soridata; fan growth from public follower counts. Details and licenses are on the About page.
- This repository holds only the static site (HTML, JS, CSS) and the model's published outputs (JSON). It contains no
  raw sales data. The code behind the forecasts (data collection, features, model and evaluation) is private; the
  About page describes the methods, the data sources and the limits of the model.

## Contact

Corrections, missing artists and other messages go through the form linked on every page. Source maintainers who want
a credit worded differently, or something removed, are welcome to use it too.

*Generated 2026-09-28 by the site build.*
