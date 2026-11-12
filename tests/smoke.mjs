// Smoke-test: start lokale server op docs/, doorloop de hoofdflows in Chromium (Playwright).
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;

const errors = [];
let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++; };

let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire(process.execPath)('playwright')); }
const browser = await chromium.launch();
for (const [label, url, vp] of [['http desktop', base, { width: 1200, height: 900 }], ['http mobiel', base, { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp });
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${label}: ${m.text()}`); });
  await page.goto(url);
  await page.waitForSelector('.tiles');
  ok((await page.locator('.tile').count()) === 8, `${label}: 8 vaardigheden zichtbaar`);

  // Spoedcursus: leren -> oefenen -> fout antwoord -> uitleg
  await page.click('#go');
  await page.waitForSelector('.learn');
  ok(await page.locator('.trap').isVisible(), `${label}: valkuil zichtbaar`);
  await page.click('#start');
  await page.waitForSelector('.q');
  for (let i = 0; i < 4; i++) {
    if (await page.locator('#in').count()) { await page.fill('#in', '99999'); await page.keyboard.press('Enter'); }
    else await page.locator('.opt').first().click();
    await page.waitForSelector('.fb');
    ok(await page.locator('.fb').isVisible(), `${label}: feedback na antwoord ${i + 1}`);
    await page.keyboard.press('Enter');
    await page.waitForSelector('.q');
  }
  await page.click('#back');

  // Turbo en begrippen openen
  await page.click('#turbo'); await page.waitForSelector('.q'); ok(true, `${label}: turbo-mix opent`); await page.click('#back');
  await page.click('#begrip'); await page.waitForSelector('.opt'); ok(true, `${label}: begrippen openen`); await page.click('#back');
  await page.click('#spiek'); await page.waitForSelector('.spiek'); ok(true, `${label}: spiekbriefje`); await page.click('#back');

  // Proeftoets helemaal doorlopen
  await page.click('#toets');
  for (let i = 0; i < 14; i++) {
    await page.waitForSelector('.q');
    if (await page.locator('#in').count()) { await page.fill('#in', '1'); await page.keyboard.press('Enter'); }
    else await page.locator('.opt').first().click();
  }
  await page.waitForSelector('.cijfer');
  const cijfer = await page.locator('.cijfer').innerText();
  ok(/^\d+(,\d)?$/.test(cijfer), `${label}: proeftoets geeft cijfer (${cijfer})`);
  ok((await page.locator('details.rev').count()) === 14, `${label}: 14 vragen in nabespreking`);

  // Voortgang blijft bewaard na herladen (alleen http; file:// storage kan per browser verschillen)
  if (url.startsWith('http')) {
    await page.reload(); await page.waitForSelector('.tiles');
    ok(/proeftoets/.test(await page.locator('.barlabel').innerText()), `${label}: voortgang bewaard na herladen`);
  }
  await page.close();
}
// Beheersing: met vaste Math.random herhaalt dezelfde vraag zich; leer het antwoord, dan 3x goed -> 'Beheerst'
{
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`mastery: ${e.message}`));
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.goto(base);
  await page.waitForSelector('.tiles');
  await page.click('#go'); await page.click('#start'); await page.waitForSelector('#in');
  await page.fill('#in', '99999'); await page.keyboard.press('Enter');
  const ans = (await page.locator('.fb b').nth(1).innerText()).split(' ')[0];
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Enter'); await page.waitForSelector('#in');
    await page.fill('#in', ans); await page.keyboard.press('Enter'); await page.waitForSelector('.fb');
  }
  ok(await page.locator('.win').isVisible(), `beheersing na 3 goed op rij (antwoord ${ans})`);
  await page.click('#nx'); await page.waitForSelector('.learn');
  ok(/v = s/.test(await page.locator('h2').innerText()), 'door naar volgende vaardigheid');
  await page.click('#back'); await page.waitForSelector('.tiles');
  ok((await page.locator('.tile.done').count()) === 1, 'tegel 1 staat op beheerst');
  await page.close();
}
await browser.close();
server.close();
ok(errors.length === 0, `geen console-/CSP-fouten${errors.length ? ': ' + errors.join(' | ') : ''}`);
console.log(fails ? `\n${fails} FAIL` : '\nALLES GROEN');
process.exit(fails ? 1 : 0);
