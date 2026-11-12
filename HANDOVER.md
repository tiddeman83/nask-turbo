# Handover → Claude Code: NASK Turbo

**Live:** https://tiddeman83.github.io/nask-turbo/ (GitHub Pages, branch `main`, map `/docs`, geen Actions).
Repo: https://github.com/tiddeman83/nask-turbo

## Lokaal werken
```
git clone https://github.com/tiddeman83/nask-turbo.git && cd nask-turbo
npm install && npx playwright install chromium
npm run check      # unit + smoke, moet groen zijn
npm run serve      # http://localhost:8080
```
Wijzigen = bestanden in `docs/js/` aanpassen → `npm run check` → commit → `git push`. Pages update binnen ~1 minuut.

## Mogelijke volgende stappen (na de toets)
- Foute antwoorden bewaren en gericht herhalen ("foutenbak").
- Meer vraagtypes: plaats-tijdtabel invullen, finishfoto, stappenteller-sommen.
