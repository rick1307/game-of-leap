# The Game of LEAP

Sailing Frog's LEAP is a distribution game on the XRP Ledger. Players start with 100 LEAP, distribute LEAP to other people, and earn points toward requesting another 200 LEAP distribution.

## Project pages

- `index.html` — Game overview, rules, and player onboarding
- `leaderboard.html` — Player leaderboard and progress toward the next distribution
- `distributionMining.html` — Explains the distribution mining concept
- `newToCryptos.html` — Getting started with an XRP Ledger wallet and LEAP

## Assets and scripts

- `gameOfLeap.png`, `gameplay.png`, and `images/` contain site graphics.
- `js/leapParticipant.js` and `js/leapScore.js` support player and score data.
- `.well-known/xrp-ledger.toml` publishes the site's XRP Ledger token information.
- `CNAME` configures the custom domain for GitHub Pages.

The site is a static HTML project. The player leaderboard and game data read public XRP Ledger information; onboarding and distribution requests use the forms and services configured in the site pages.
