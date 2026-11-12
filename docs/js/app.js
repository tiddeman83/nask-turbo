import { SKILLS } from './content.js';
import { makeQuestion, check, nl } from './generators.js';

const KEY = 'naskturbo.v1';
const STREAK_GOAL = 3; // 3 goed op rij = vaardigheid beheerst
const $app = document.getElementById('app');

// ---------- opslag ----------
function load() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY));
    if (p && p.skills) return p;
  } catch { /* leeg of geblokkeerd */ }
  return { skills: {}, tests: [] };
}
let P = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(P)); } catch { /* privé-modus: gewoon doorgaan */ }
}
function st(id) {
  if (!P.skills[id]) P.skills[id] = { ok: 0, total: 0, streak: 0, mastered: false };
  return P.skills[id];
}
function record(id, good) {
  const s = st(id);
  s.total++;
  if (good) { s.ok++; s.streak++; } else s.streak = 0;
  if (s.streak >= STREAK_GOAL) s.mastered = true;
  save();
}
const masteredCount = () => SKILLS.filter((s) => st(s.id).mastered).length;
const nextSkill = () => SKILLS.find((s) => !st(s.id).mastered);

// ---------- helpers ----------
function h(html) { $app.innerHTML = html; window.scrollTo(0, 0); }
function on(sel, ev, fn) { const el = $app.querySelector(sel); if (el) el.addEventListener(ev, fn); return el; }
function acc(id) { const s = st(id); return s.total ? Math.round((100 * s.ok) / s.total) : null; }

// ---------- HOME ----------
function home() {
  const m = masteredCount();
  const nxt = nextSkill();
  const tiles = SKILLS.map((s, i) => {
    const x = st(s.id);
    const a = acc(s.id);
    return `<button class="tile ${x.mastered ? 'done' : ''}" data-skill="${s.id}">
      <span class="num">${i + 1}</span><span class="par">${s.par}</span>
      <span class="ttl">${s.title}</span>
      <span class="meta">${x.mastered ? '✔ beheerst' : 'nog doen'}${a !== null ? ` · ${a}% goed` : ''}</span></button>`;
  }).join('');
  const lastTest = P.tests.length ? P.tests[P.tests.length - 1] : null;
  h(`
  <header class="hero">
    <h1>NASK Turbo <small>H5 Bewegen</small></h1>
    <p>Minimale inspanning, maximaal resultaat. Werk het plan van boven naar beneden af.</p>
    <div class="bar"><div style="width:${(m / SKILLS.length) * 100}%"></div></div>
    <p class="barlabel">${m} / ${SKILLS.length} vaardigheden beheerst${lastTest ? ` · laatste proeftoets: <b>${nl(lastTest.cijfer, 1)}</b>` : ''}</p>
  </header>
  <section class="plan">
    <h2>Plan voor vanavond (±75 min)</h2>
    <ol>
      <li><b>Spoedcursus</b>: per vaardigheid regel lezen → ${STREAK_GOAL} goed op rij (±40 min)</li>
      <li><b>Begrippen</b>: tot je er 10 goed hebt (±10 min)</li>
      <li><b>Proeftoets</b>: 14 vragen, cijfer erbij (±15 min)</li>
      <li><b>Turbo-mix</b> op je zwakste punten tot je moe bent. Daarna: slapen.</li>
    </ol>
    <div class="actions">
      ${nxt ? `<button class="primary" id="go">▶ Verder: ${nxt.title}</button>` : '<button class="primary" id="toets2">Alles beheerst! → Proeftoets</button>'}
      <button id="turbo">⚡ Turbo-mix</button>
      <button id="begrip">Begrippen</button>
      <button id="toets">Proeftoets</button>
      <button id="spiek">Spiekbriefje</button>
    </div>
  </section>
  <section><h2>De 8 vaardigheden</h2><div class="tiles">${tiles}</div></section>
  <footer><button class="link" id="reset">voortgang wissen</button></footer>`);
  if (nxt) on('#go', 'click', () => learn(nxt.id));
  on('#toets2', 'click', toets);
  on('#turbo', 'click', () => drill({ mode: 'turbo' }));
  on('#begrip', 'click', () => drill({ mode: 'begrip' }));
  on('#toets', 'click', toets);
  on('#spiek', 'click', spiek);
  on('#reset', 'click', () => {
    if (confirm('Alle voortgang wissen?')) { P = { skills: {}, tests: [] }; save(); home(); }
  });
  $app.querySelectorAll('.tile').forEach((b) => b.addEventListener('click', () => learn(b.dataset.skill)));
}

// ---------- LEREN ----------
function learn(id) {
  const s = SKILLS.find((x) => x.id === id);
  const i = SKILLS.indexOf(s);
  h(`
  <nav><button class="link" id="back">← overzicht</button><span>${i + 1}/${SKILLS.length}</span></nav>
  <article class="card learn">
    <p class="par">${s.par}</p>
    <h2>${s.title}</h2>
    <h3>Regel</h3><ul>${s.rule.map((r) => `<li>${r}</li>`).join('')}</ul>
    <h3>Voorbeeld</h3><p>${s.example}</p>
    <div class="trap"><b>Valkuil</b><br>${s.trap}</div>
    <button class="primary big" id="start">Oefenen → ${STREAK_GOAL} goed op rij</button>
  </article>`);
  on('#back', 'click', home);
  on('#start', 'click', () => drill({ mode: 'skill', skill: id }));
}

// ---------- OEFENEN ----------
function pickTurboSkill() {
  const ids = [...SKILLS.map((s) => s.id), 'begrip'];
  const w = ids.map((id) => {
    const s = st(id);
    const a = s.total ? s.ok / s.total : 0.3;
    return (1.2 - a) + (s.mastered ? 0 : 0.6);
  });
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ids.length; i++) { r -= w[i]; if (r <= 0) return ids[i]; }
  return ids[0];
}

function drill(opts) {
  let streak = 0, done = 0, good = 0;
  const begripGoal = 10;
  const title = opts.mode === 'turbo' ? '⚡ Turbo-mix' : opts.mode === 'begrip' ? 'Begrippen' : SKILLS.find((s) => s.id === opts.skill).title;

  function next() {
    const id = opts.mode === 'skill' ? opts.skill : opts.mode === 'begrip' ? 'begrip' : pickTurboSkill();
    const q = makeQuestion(id);
    let answered = false;
    const status = opts.mode === 'skill'
      ? `<span class="dots">${Array.from({ length: STREAK_GOAL }, (_, i) => `<i class="${i < streak ? 'on' : ''}"></i>`).join('')}</span>`
      : opts.mode === 'begrip' ? `<span>${good}/${begripGoal} goed</span>` : `<span>${good}/${done} goed · reeks ${streak}</span>`;
    const label = SKILLS.find((s) => s.id === q.skill);
    h(`
    <nav><button class="link" id="back">← overzicht</button><b>${title}</b>${status}</nav>
    <article class="card q">
      ${opts.mode === 'turbo' ? `<p class="par">${label ? label.title : 'Begrippen'}</p>` : ''}
      <p class="prompt">${q.prompt}</p>
      ${q.svg ? `<div class="fig">${q.svg}</div>` : ''}
      ${q.kind === 'num'
        ? `<form id="f" autocomplete="off"><div class="inrow"><input id="in" inputmode="decimal" placeholder="antwoord" aria-label="antwoord"><span class="unit">${q.unit || ''}</span></div>
           <button class="primary big" type="submit">Check (Enter)</button></form>`
        : `<div class="mc">${q.options.map((o, i) => `<button class="opt" data-i="${i}">${String.fromCharCode(65 + i)}. ${o}</button>`).join('')}</div>`}
      <div id="fb" aria-live="polite"></div>
    </article>`);
    on('#back', 'click', home);
    const inp = $app.querySelector('#in');
    if (inp) inp.focus();

    function finish(ok, given) {
      if (answered) return;
      answered = true;
      done++;
      if (ok) { good++; streak++; } else streak = 0;
      record(q.skill, ok);
      if (q.kind === 'mc') {
        $app.querySelectorAll('.opt').forEach((b, i) => {
          b.disabled = true;
          if (i === q.answer) b.classList.add('right');
          else if (i === Number(given)) b.classList.add('wrong');
        });
      } else if (inp) { inp.disabled = true; const sb = $app.querySelector('#f button'); if (sb) sb.remove(); }
      const reached = (opts.mode === 'skill' && streak >= STREAK_GOAL) || (opts.mode === 'begrip' && good >= begripGoal);
      const correctTxt = q.kind === 'num' ? `Antwoord: <b>${nl(q.answer, 2)} ${q.unit || ''}</b><br>` : '';
      $app.querySelector('#fb').innerHTML = `
        <div class="fb ${ok ? 'ok' : 'no'}"><b>${ok ? 'Goed!' : 'Fout.'}</b><br>${ok ? '' : correctTxt}${q.explain}</div>
        ${reached
          ? `<div class="win">Beheerst! ${opts.mode === 'skill' && nextSkill() ? `Door naar: <b>${nextSkill().title}</b>` : ''}</div>
             <button class="primary big" id="nx">${opts.mode === 'skill' && nextSkill() ? 'Volgende vaardigheid →' : 'Naar overzicht →'}</button>`
          : `<button class="primary big" id="nx">Volgende (Enter) →</button>`}`;
      const nx = $app.querySelector('#nx');
      nx.focus();
      nx.addEventListener('click', () => {
        if (reached) { const n = nextSkill(); if (opts.mode === 'skill' && n) learn(n.id); else home(); } else next();
      });
    }
    on('#f', 'submit', (e) => {
      e.preventDefault();
      if (!inp.value.trim()) return;
      finish(check(q, inp.value), inp.value);
    });
    $app.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => finish(check(q, b.dataset.i), b.dataset.i)));
  }
  next();
}

// ---------- PROEFTOETS ----------
const TOETS_MIX = ['omrekenen', 'omrekenen', 'vst', 'vst', 'strobo', 'xt', 'soort', 'vgem', 'ontmoet', 'rem', 'rem', 'begrip', 'begrip', 'begrip'];

function toets() {
  const qs = TOETS_MIX.map((id) => makeQuestion(id));
  const answers = [];
  const t0 = Date.now();
  let i = 0;
  function show() {
    const q = qs[i];
    h(`
    <nav><button class="link" id="back">← stoppen</button><b>Proeftoets</b><span>${i + 1}/${qs.length}</span></nav>
    <div class="bar"><div style="width:${(i / qs.length) * 100}%"></div></div>
    <article class="card q">
      <p class="prompt">${q.prompt}</p>
      ${q.svg ? `<div class="fig">${q.svg}</div>` : ''}
      ${q.kind === 'num'
        ? `<form id="f" autocomplete="off"><div class="inrow"><input id="in" inputmode="decimal" placeholder="antwoord" aria-label="antwoord"><span class="unit">${q.unit || ''}</span></div>
           <button class="primary big" type="submit">Volgende →</button></form>`
        : `<div class="mc">${q.options.map((o, k) => `<button class="opt" data-i="${k}">${String.fromCharCode(65 + k)}. ${o}</button>`).join('')}</div>`}
    </article>`);
    on('#back', 'click', () => { if (confirm('Toets stoppen?')) home(); });
    const inp = $app.querySelector('#in');
    if (inp) inp.focus();
    const go = (val) => { answers[i] = val; i++; if (i < qs.length) show(); else result(); };
    on('#f', 'submit', (e) => { e.preventDefault(); if (inp.value.trim()) go(inp.value); });
    $app.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => go(b.dataset.i)));
  }
  function result() {
    const oks = qs.map((q, k) => check(q, answers[k]));
    qs.forEach((q, k) => record(q.skill, oks[k]));
    const score = oks.filter(Boolean).length;
    const cijfer = Math.round((1 + (9 * score) / qs.length) * 10) / 10;
    const min = Math.round((Date.now() - t0) / 60000);
    P.tests.push({ cijfer, score, n: qs.length, date: new Date().toISOString() });
    save();
    const review = qs.map((q, k) => `
      <details class="rev ${oks[k] ? 'ok' : 'no'}" ${oks[k] ? '' : 'open'}>
        <summary>${oks[k] ? '✔' : '✘'} Vraag ${k + 1}</summary>
        <p>${q.prompt}</p>${q.svg ? `<div class="fig">${q.svg}</div>` : ''}
        <p>Jouw antwoord: <b>${q.kind === 'mc' ? (q.options[answers[k]] ?? '-') : String(answers[k]).replace(/[<>&"]/g, '')}</b></p>
        <p>${q.kind === 'num' ? `Goed: <b>${nl(q.answer, 2)} ${q.unit || ''}</b> — ` : ''}${q.explain}</p>
      </details>`).join('');
    h(`
    <nav><button class="link" id="back">← overzicht</button><b>Resultaat</b><span>${min} min</span></nav>
    <article class="card center">
      <p class="cijfer ${cijfer >= 5.5 ? 'ok' : 'no'}">${nl(cijfer, 1)}</p>
      <p>${score} van de ${qs.length} goed. ${cijfer >= 8 ? 'Sterk. Klaar voor morgen.' : cijfer >= 5.5 ? 'Voldoende. Herhaal de fouten hieronder en doe nog een Turbo-mix.' : 'Nog niet. Lees de rode uitleg, doe de spoedcursus van die vaardigheden opnieuw.'}</p>
      <div class="actions"><button class="primary" id="again">Nieuwe proeftoets</button><button id="turbo">⚡ Turbo-mix</button></div>
    </article>
    <section>${review}</section>`);
    on('#back', 'click', home);
    on('#again', 'click', toets);
    on('#turbo', 'click', () => drill({ mode: 'turbo' }));
  }
  show();
}

// ---------- SPIEKBRIEFJE ----------
function spiek() {
  h(`
  <nav><button class="link" id="back">← overzicht</button><b>Spiekbriefje</b><span></span></nav>
  <article class="card spiek">
    ${SKILLS.map((s) => `<h3>${s.title}</h3><ul>${s.rule.map((r) => `<li>${r}</li>`).join('')}</ul><p class="trapline">⚠ ${s.trap}</p>`).join('')}
    <h3>Aanpak bij elke rekenvraag</h3>
    <ol><li><b>gegevens</b> (met eenheden, eerst omrekenen)</li><li><b>gevraagd</b></li><li><b>formule</b></li><li><b>invullen</b></li><li><b>antwoord + eenheid</b></li></ol>
  </article>`);
  on('#back', 'click', home);
}

home();
