// Vraaggeneratoren. Puur (geen DOM) → testbaar in Node.
// Elke vraag: { skill, kind: 'num'|'mc', prompt, svg?, answer, unit?, tol?, options?, explain }
import { svgGraph, svgStrobe, sample } from './graph.js';
import { BEGRIPPEN, FACTS } from './content.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const r2 = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
export const nl = (x, d = 2) => String(r2(x, d)).replace('.', ',');

const mk = (rng) => ({
  int: (a, b) => a + Math.floor(rng() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(rng() * arr.length)],
  shuffle: (arr) => {
    const c = [...arr];
    for (let i = c.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [c[i], c[j]] = [c[j], c[i]];
    }
    return c;
  },
});

// Maak MC-vraag met geschudde opties; correct = index in originele options-array
function mc(R, base, options, correct) {
  const order = R.shuffle(options.map((_, i) => i));
  return { ...base, kind: 'mc', options: order.map((i) => options[i]), answer: order.indexOf(correct) };
}

// ---------- §2 Omrekenen ----------
function genOmrekenen(R) {
  const type = R.pick(['ms2kmh', 'kmh2ms', 'kmh2ms', 'ms2kmh', 'tijd']);
  if (type === 'ms2kmh') {
    const v = R.pick([2, 2.5, 5, 8, 10, 12, 15, 20, 25, 30, 0.75, 4.5, 80]);
    return { skill: 'omrekenen', kind: 'num', prompt: `Reken om: <b>${nl(v)} m/s</b> = … km/h`, answer: v * 3.6, unit: 'km/h', tol: 0.011,
      explain: `m/s → km/h: keer 3,6. ${nl(v)} × 3,6 = <b>${nl(v * 3.6, 2)} km/h</b>.` };
  }
  if (type === 'kmh2ms') {
    const v = R.pick([18, 36, 54, 72, 90, 108, 126, 45, 27, 5.4, 15.3, 120, 50, 30, 270]);
    return { skill: 'omrekenen', kind: 'num', prompt: `Reken om: <b>${nl(v)} km/h</b> = … m/s`, answer: v / 3.6, unit: 'm/s', tol: 0.011,
      explain: `km/h → m/s: delen door 3,6. ${nl(v)} : 3,6 = <b>${nl(v / 3.6, 2)} m/s</b>.` };
  }
  const t = R.pick([
    ['15 min', 's', 900, '15 × 60 = 900 s'],
    ['12 min', 'uur', 0.2, '12 : 60 = 0,2 uur'],
    ['45 min', 'uur', 0.75, '45 : 60 = 0,75 uur'],
    ['0,3 uur', 'min', 18, '0,3 × 60 = 18 min'],
    ['0,3 uur', 's', 1080, '0,3 × 3600 = 1080 s'],
    ['9000 s', 'uur', 2.5, '9000 : 3600 = 2,5 uur'],
    ['2,5 uur', 'min', 150, '2,5 × 60 = 150 min'],
    ['90 s', 'min', 1.5, '90 : 60 = 1,5 min'],
    ['1 uur', 's', 3600, '1 × 3600 = 3600 s'],
    ['6,5 min', 's', 390, '6,5 × 60 = 390 s'],
  ]);
  return { skill: 'omrekenen', kind: 'num', prompt: `Reken om: <b>${t[0]}</b> = … ${t[1]}`, answer: t[2], unit: t[1], tol: 0.01, explain: t[3] + '.' };
}

// ---------- §2 v = s/t ----------
function genVst(R) {
  const type = R.pick(['v_ms', 'v_kmh_min', 's', 't_h', 't_min', 'v_mix']);
  if (type === 'v_ms') {
    const s = R.pick([100, 200, 400, 60, 1500]);
    const t = r2(s / R.pick([6, 7, 8, 9, 9.5, 5, 4]), 1);
    const v = s / t;
    return { skill: 'vst', kind: 'num', prompt: `Een atleet loopt <b>${s} m</b> in <b>${nl(t, 1)} s</b>. Bereken de gemiddelde snelheid in m/s.`, answer: v, unit: 'm/s', tol: 0.02,
      explain: `v = s / t = ${s} / ${nl(t, 1)} = <b>${nl(v)} m/s</b>.` };
  }
  if (type === 'v_kmh_min') {
    const tmin = R.pick([15, 20, 30, 40, 45, 80, 90]);
    const v = R.pick([12, 15, 18, 24, 30, 36, 60, 90]);
    const s = r2((v * tmin) / 60, 2);
    return { skill: 'vst', kind: 'num', prompt: `Iemand legt <b>${nl(s)} km</b> af in <b>${tmin} min</b>. Bereken de gemiddelde snelheid in km/h.`, answer: v, unit: 'km/h', tol: 0.02,
      explain: `Eerst de tijd in uur: ${tmin} min = ${nl(tmin / 60, 3)} h. v = ${nl(s)} / ${nl(tmin / 60, 3)} = <b>${nl(v)} km/h</b>.` };
  }
  if (type === 's') {
    const v = R.pick([18, 24, 60, 80, 90, 100, 120]);
    const t = R.pick([1.5, 2, 2.5, 3, 4, 6, 0.5]);
    return { skill: 'vst', kind: 'num', prompt: `Een voertuig rijdt gemiddeld <b>${v} km/h</b> gedurende <b>${nl(t)} uur</b>. Bereken de afgelegde afstand in km.`, answer: v * t, unit: 'km', tol: 0.01,
      explain: `s = v · t = ${v} × ${nl(t)} = <b>${nl(v * t)} km</b>.` };
  }
  if (type === 't_h') {
    const v = R.pick([4, 5, 18, 15, 20]);
    const s = v * R.pick([2.5, 3, 3.5, 12.5, 1.5]);
    return { skill: 'vst', kind: 'num', prompt: `Een tocht van <b>${nl(s)} km</b> met een gemiddelde snelheid van <b>${v} km/h</b>. Hoeveel uur duurt de tocht?`, answer: s / v, unit: 'uur', tol: 0.01,
      explain: `t = s / v = ${nl(s)} / ${v} = <b>${nl(s / v)} uur</b>.` };
  }
  if (type === 't_min') {
    const v = R.pick([90, 120, 60, 460, 300]);
    const s = R.pick([20, 30, 45, 350, 100]);
    const tmin = (s / v) * 60;
    return { skill: 'vst', kind: 'num', prompt: `Een voertuig legt <b>${s} km</b> af met <b>${v} km/h</b>. Bereken de tijd in <b>minuten</b>.`, answer: tmin, unit: 'min', tol: 0.02,
      explain: `t = s / v = ${s} / ${v} = ${nl(s / v, 3)} h → × 60 = <b>${nl(tmin, 1)} min</b>.` };
  }
  // v_mix: km + min → m/s
  const km = R.pick([4.2, 3, 6, 2.4, 9]);
  const min = R.pick([12, 10, 15, 20, 6.5]);
  const v = (km * 1000) / (min * 60);
  return { skill: 'vst', kind: 'num', prompt: `Rieke fietst <b>${nl(km)} km</b> in <b>${nl(min)} min</b>. Bereken haar gemiddelde snelheid in <b>m/s</b>.`, answer: v, unit: 'm/s', tol: 0.02,
    explain: `s = ${km * 1000} m, t = ${nl(min)} × 60 = ${nl(min * 60)} s. v = ${km * 1000} / ${nl(min * 60)} = <b>${nl(v)} m/s</b>.` };
}

// ---------- §1 Stroboscoop ----------
function genStrobo(R) {
  const type = R.pick(['tijd', 'tijd', 'v', 'soort']);
  if (type === 'tijd') {
    const n = R.int(6, 15);
    const dt = R.pick([0.05, 0.1, 0.15, 0.2, 0.25, 0.4, 0.5]);
    const word = R.pick(['beeldjes van de bal', 'momentopnames', 'keer flitste de lamp (= aantal beeldjes)']);
    return { skill: 'strobo', kind: 'num', prompt: `Op een stroboscopische foto zie je <b>${n}</b> ${word}. De tijd tussen twee flitsen is <b>${nl(dt)} s</b>. Hoe lang duurde de vastgelegde beweging (eerste tot laatste beeld)?`, answer: (n - 1) * dt, unit: 's', tol: 0.01,
      explain: `${n} beeldjes → ${n - 1} tussenpozen. t = ${n - 1} × ${nl(dt)} = <b>${nl((n - 1) * dt)} s</b>. (Niet ${n} × ${nl(dt)}!)` };
  }
  if (type === 'v') {
    const n = R.int(5, 9);
    const gap = R.pick([5, 8, 10, 12, 15]);
    const start = R.pick([0, 2, 5]);
    const dt = R.pick([0.2, 0.4, 0.5]);
    const pos = Array.from({ length: n }, (_, i) => start + i * gap);
    const max = Math.ceil((pos[n - 1] + 5) / 10) * 10;
    const s = pos[n - 1] - pos[0];
    const t = (n - 1) * dt;
    const v = s / 100 / t;
    return { skill: 'strobo', kind: 'num', prompt: `Stroboscopische foto van een speelgoedauto die eenparig beweegt. De tijd tussen twee flitsen is <b>${nl(dt)} s</b>. Beeld A staat bij <b>${pos[0]} cm</b>, het laatste beeld (${String.fromCharCode(64 + n)}) bij <b>${pos[n - 1]} cm</b>. Bereken de snelheid in <b>m/s</b>.`,
      svg: svgStrobe(pos, max), answer: v, unit: 'm/s', tol: 0.03,
      explain: `s = ${pos[n - 1]} − ${pos[0]} = ${s} cm = ${nl(s / 100)} m. ${n} beelden → ${n - 1} tussenpozen → t = ${n - 1} × ${nl(dt)} = ${nl(t)} s. v = ${nl(s / 100)} / ${nl(t)} = <b>${nl(v)} m/s</b>.` };
  }
  const kind = R.pick(['versneld', 'vertraagd', 'eenparig']);
  const n = 7;
  let pos;
  if (kind === 'eenparig') pos = Array.from({ length: n }, (_, i) => 5 + i * 14);
  else if (kind === 'versneld') pos = Array.from({ length: n }, (_, i) => 5 + 2.6 * i * i);
  else pos = Array.from({ length: n }, (_, i) => 5 + 2.6 * (36 - (6 - i) * (6 - i)));
  return mc(R, { skill: 'strobo', prompt: 'De bal rolt van A naar G. Wat voor beweging is dit?', svg: svgStrobe(pos, 100),
    explain: kind === 'eenparig' ? 'Gelijke afstanden per flits → constante snelheid → <b>eenparig</b>.' : kind === 'versneld' ? 'Afstanden worden steeds groter → <b>versneld</b>.' : 'Afstanden worden steeds kleiner → <b>vertraagd</b>.' },
  ['versneld', 'eenparig', 'vertraagd'], ['versneld', 'eenparig', 'vertraagd'].indexOf(kind));
}

// ---------- §1–2 (x,t)-diagram aflezen ----------
function genXt(R) {
  // stukjes rechte lijn op hele rasterpunten
  const segs = R.int(3, 4);
  const pts = [[0, 0]];
  let x = 0;
  for (let i = 1; i <= segs; i++) {
    const dx = R.pick([0, 10, 20, 30, 40, 10, 20]);
    x += dx;
    pts.push([i * 2, x]);
  }
  const tMax = segs * 2;
  const yMax = Math.max(40, Math.ceil(x / 20) * 20);
  const svg = svgGraph({ xLabel: 't (s)', yLabel: 'x (m)', xMax: tMax, yMax, xStep: 1, yStep: yMax > 80 ? 20 : 10, series: [{ points: pts }] });
  const type = R.pick(['afstand', 'aflezen', 'v', 'stil']);
  if (type === 'afstand') {
    const i = R.int(0, segs - 1);
    const j = R.int(i + 1, segs);
    const s = pts[j][1] - pts[i][1];
    return { skill: 'xt', kind: 'num', prompt: `Hoeveel meter is er afgelegd tussen t = ${pts[i][0]} s en t = ${pts[j][0]} s?`, svg, answer: s, unit: 'm', tol: 0.5,
      explain: `Aflezen: x(${pts[i][0]}) = ${pts[i][1]} m en x(${pts[j][0]}) = ${pts[j][1]} m. s = ${pts[j][1]} − ${pts[i][1]} = <b>${s} m</b>.` };
  }
  if (type === 'aflezen') {
    const i = R.int(1, segs);
    return { skill: 'xt', kind: 'num', prompt: `Op welke plaats (in m) is het voorwerp op t = ${pts[i][0]} s?`, svg, answer: pts[i][1], unit: 'm', tol: 0.5,
      explain: `Ga bij t = ${pts[i][0]} s recht omhoog naar de lijn en dan naar links: <b>${pts[i][1]} m</b>.` };
  }
  if (type === 'stil') {
    const hasStil = pts.some((p, i) => i > 0 && p[1] === pts[i - 1][1]);
    return mc(R, { skill: 'xt', prompt: 'Staat het voorwerp ergens in deze grafiek stil?', svg,
      explain: 'Stilstaan = <b>horizontaal</b> stuk in het (x,t)-diagram (plaats verandert niet).' }, ['ja', 'nee'], hasStil ? 0 : 1);
  }
  let i = R.int(1, segs);
  for (let k = 0; k < segs && pts[i][1] === pts[i - 1][1]; k++) i = (i % segs) + 1;
  const dx = pts[i][1] - pts[i - 1][1];
  const v = dx / 2;
  return { skill: 'xt', kind: 'num', prompt: `Bereken de snelheid (m/s) tussen t = ${pts[i - 1][0]} s en t = ${pts[i][0]} s.`, svg, answer: v, unit: 'm/s', tol: 0.05,
    explain: `v = Δx / Δt = (${pts[i][1]} − ${pts[i - 1][1]}) / 2 = <b>${nl(v)} m/s</b>.` };
}

// ---------- §3 Soort beweging ----------
function genSoort(R) {
  const graph = R.pick(['xt', 'vt']);
  const kind = R.pick(graph === 'xt' ? ['versneld', 'eenparig', 'vertraagd', 'stilstand'] : ['versneld', 'eenparig', 'vertraagd']);
  let pts;
  const a = R.pick([1, 1.2, 1.4, 1.6]);
  const lo = R.pick([0, 5, 10]);
  const slope = R.pick([4, 5, 6]);
  if (graph === 'xt') {
    pts = kind === 'versneld' ? sample((t) => lo + a * t * t, 0, 5)
      : kind === 'vertraagd' ? sample((t) => lo + a * 25 - a * (5 - t) * (5 - t), 0, 5)
      : kind === 'eenparig' ? sample((t) => lo + slope * t, 0, 5, 2) : sample(() => lo + 15, 0, 5, 2);
  } else {
    const hi = R.pick([25, 30, 35, 40]);
    pts = kind === 'versneld' ? [[0, lo], [5, hi]] : kind === 'vertraagd' ? [[0, hi], [5, lo]] : [[0, lo + 15], [5, lo + 15]];
  }
  const svg = svgGraph({ xLabel: 't (s)', yLabel: graph === 'xt' ? 'x (m)' : 'v (m/s)', xMax: 5, yMax: 50, xStep: 1, yStep: 10, series: [{ points: pts }] });
  const opts = ['versneld', 'eenparig', 'vertraagd', 'stilstand'];
  const why = {
    xt: { versneld: 'kromme die steeds steiler wordt', vertraagd: 'kromme die steeds vlakker wordt', eenparig: 'rechte schuine lijn', stilstand: 'horizontale lijn: plaats verandert niet' },
    vt: { versneld: 'lijn gaat omhoog: snelheid neemt toe', vertraagd: 'lijn gaat omlaag: snelheid neemt af', eenparig: 'horizontale lijn: snelheid constant' },
  };
  return mc(R, { skill: 'soort', prompt: `Dit is een <b>${graph === 'xt' ? '(x,t)' : '(v,t)'}-diagram</b>. Wat voor beweging zie je?`, svg,
    explain: `${graph === 'xt' ? '(x,t)' : '(v,t)'}: ${why[graph][kind]} → <b>${kind}</b>.` }, opts, opts.indexOf(kind));
}

// ---------- §2 v_gem bij regelmatige verandering ----------
function genVgem(R) {
  const T = R.pick([4, 5, 8, 10, 20]);
  const up = R.int(0, 1) === 1;
  let vb = R.pick([0, 5, 10, 20]);
  let ve = vb + R.pick([10, 20, 30]);
  if (!up) [vb, ve] = [ve, vb];
  const vmax = Math.max(vb, ve);
  const yMax = Math.ceil((vmax + 5) / 10) * 10;
  const svg = svgGraph({ xLabel: 't (s)', yLabel: 'v (m/s)', xMax: T, yMax, xStep: T >= 10 ? (T === 20 ? 5 : 2) : 1, yStep: 10, series: [{ points: [[0, vb], [T, ve]] }] });
  const vgem = (vb + ve) / 2;
  const type = R.pick(['vgem', 's', 's', 'kmh']);
  if (type === 'vgem') {
    return { skill: 'vgem', kind: 'num', prompt: 'Bepaal met het (v,t)-diagram de gemiddelde snelheid (m/s) tussen begin en eind.', svg, answer: vgem, unit: 'm/s', tol: 0.05,
      explain: `v<sub>gem</sub> = (v<sub>begin</sub> + v<sub>eind</sub>)/2 = (${vb} + ${ve})/2 = <b>${nl(vgem)} m/s</b>.` };
  }
  if (type === 's') {
    return { skill: 'vgem', kind: 'num', prompt: `Bereken de afgelegde afstand (m) tussen t = 0 en t = ${T} s.`, svg, answer: vgem * T, unit: 'm', tol: 0.5,
      explain: `v<sub>gem</sub> = (${vb} + ${ve})/2 = ${nl(vgem)} m/s. s = v<sub>gem</sub> · t = ${nl(vgem)} × ${T} = <b>${nl(vgem * T)} m</b>.` };
  }
  const v = R.pick([100, 50, 72, 108, 36]);
  const t = R.pick([3.2, 4, 5, 8, 10]);
  const ms = v / 3.6;
  return { skill: 'vgem', kind: 'num', prompt: `Een auto trekt vanuit stilstand <b>regelmatig</b> op tot <b>${v} km/h</b> in <b>${nl(t)} s</b>. Bereken de afgelegde afstand in m.`, answer: (ms / 2) * t, unit: 'm', tol: 0.02,
    explain: `${v} km/h = ${nl(ms)} m/s. v<sub>gem</sub> = (0 + ${nl(ms)})/2 = ${nl(ms / 2)} m/s. s = ${nl(ms / 2)} × ${nl(t)} = <b>${nl((ms / 2) * t, 1)} m</b>.` };
}

// ---------- §3 Tegenkomen & inhalen ----------
function genOntmoet(R) {
  const inhalen = R.int(0, 1) === 1;
  const tStar = R.pick([5, 10, 20]);
  let vA = R.pick([2, 3, 4, 5]);
  let vB = R.pick([1, 2]);
  if (inhalen && vB >= vA) vA = vB + 2;
  const D = inhalen ? (vA - vB) * tStar : (vA + vB) * tStar;
  const xMeet = vA * tStar;
  const tMax = tStar * 1.4;
  const yTop = Math.max(D, xMeet, vA * tMax, inhalen ? D + vB * tMax : D);
  const yMax = Math.ceil(yTop / 20) * 20;
  const A = [[0, 0], [tMax, vA * tMax]];
  const B = inhalen ? [[0, D], [tMax, D + vB * tMax]] : [[0, D], [tMax, D - vB * tMax]];
  const svg = svgGraph({ xLabel: 't (s)', yLabel: 'x (m)', xMax: Math.ceil(tMax / 5) * 5, yMax, xStep: tStar >= 10 ? 5 : 1, yStep: yMax > 100 ? 20 : 10,
    series: [{ points: A, color: '#2a7', label: 'Bram' }, { points: B, color: '#d33', label: 'Lisa' }] });
  const story = inhalen
    ? `Bram fietst met <b>${vA} m/s</b> vanaf x = 0. Lisa heeft <b>${D} m</b> voorsprong en gaat dezelfde kant op met <b>${vB} m/s</b>.`
    : `Bram vertrekt met <b>${vA} m/s</b> vanaf x = 0. Lisa komt hem tegemoet vanaf x = <b>${D} m</b> met <b>${vB} m/s</b>.`;
  const formula = inhalen ? `t = voorsprong / (v<sub>1</sub> − v<sub>2</sub>) = ${D} / (${vA} − ${vB})` : `t = afstand / (v<sub>1</sub> + v<sub>2</sub>) = ${D} / (${vA} + ${vB})`;
  if (R.int(0, 1)) {
    return { skill: 'ontmoet', kind: 'num', prompt: `${story} Na hoeveel seconden ${inhalen ? 'haalt Bram Lisa in' : 'ontmoeten ze elkaar'}?`, svg, answer: tStar, unit: 's', tol: 0.3,
      explain: `${formula} = <b>${tStar} s</b>. (Of: snijpunt van de grafieken aflezen.)` };
  }
  return { skill: 'ontmoet', kind: 'num', prompt: `${story} Op hoeveel meter van Brams startpunt ${inhalen ? 'haalt hij haar in' : 'ontmoeten ze elkaar'}?`, svg, answer: xMeet, unit: 'm', tol: 1,
    explain: `${formula} = ${tStar} s. x = v<sub>Bram</sub> · t = ${vA} × ${tStar} = <b>${xMeet} m</b>.` };
}

// ---------- §4 Remweg & stopafstand ----------
function genRem(R) {
  const type = R.pick(['n2', 'n2', 'reactie', 'stop', 'tweesec', 'feit']);
  if (type === 'n2') {
    const v1 = R.pick([30, 40, 50, 60]);
    const k = R.pick([2, 3, 1.5, 0.5, 4]);
    const v2 = v1 * k;
    const s1 = R.pick([6.4, 10, 5.3, 8, 15]);
    return { skill: 'rem', kind: 'num', prompt: `Bij <b>${v1} km/h</b> is de remweg <b>${nl(s1)} m</b>. Bereken de remweg bij <b>${nl(v2)} km/h</b> (zelfde omstandigheden).`, answer: s1 * k * k, unit: 'm', tol: 0.02,
      explain: `n = ${nl(v2)} / ${v1} = ${nl(k)}. Remweg × n² = × ${nl(k * k)}. ${nl(s1)} × ${nl(k * k)} = <b>${nl(s1 * k * k, 1)} m</b>.` };
  }
  if (type === 'reactie') {
    const v = R.pick([30, 36, 45, 50, 54, 72, 90, 108, 120]);
    const tr = R.pick([0.7, 0.75, 0.8, 0.9, 1.0]);
    const s = (v / 3.6) * tr;
    return { skill: 'rem', kind: 'num', prompt: `Een automobilist rijdt <b>${v} km/h</b> en heeft een reactietijd van <b>${nl(tr)} s</b>. Bereken de reactie-afstand in m.`, answer: s, unit: 'm', tol: 0.03,
      explain: `${v} km/h : 3,6 = ${nl(v / 3.6)} m/s. s = v · t = ${nl(v / 3.6)} × ${nl(tr)} = <b>${nl(s, 1)} m</b>.` };
  }
  if (type === 'stop') {
    const v = R.pick([36, 45, 54, 72, 90]);
    const tr = R.pick([0.8, 1.0, 0.7]);
    const rw = R.pick([8, 12, 20, 35, 50]);
    const s = (v / 3.6) * tr + rw;
    return { skill: 'rem', kind: 'num', prompt: `Snelheid <b>${v} km/h</b>, reactietijd <b>${nl(tr)} s</b>, remweg <b>${rw} m</b>. Bereken de stopafstand in m.`, answer: s, unit: 'm', tol: 0.03,
      explain: `Reactie-afstand = ${nl(v / 3.6)} × ${nl(tr)} = ${nl((v / 3.6) * tr, 1)} m. Stopafstand = ${nl((v / 3.6) * tr, 1)} + ${rw} = <b>${nl(s, 1)} m</b>.` };
  }
  if (type === 'tweesec') {
    const v = R.pick([100, 130, 120, 80]);
    const s = (v / 3.6) * 2;
    return { skill: 'rem', kind: 'num', prompt: `Twee auto's rijden <b>${v} km/h</b> achter elkaar en houden zich aan de tweesecondenregel. Hoe groot is de afstand tussen de auto's (m)?`, answer: s, unit: 'm', tol: 0.03,
      explain: `${v} : 3,6 = ${nl(v / 3.6)} m/s. s = ${nl(v / 3.6)} × 2 = <b>${nl(s, 1)} m</b>.` };
  }
  return genFact(R, 'rem');
}

function genFact(R, skill = 'begrip') {
  const f = R.pick(FACTS);
  return mc(R, { skill, prompt: f.q, explain: f.explain }, f.options, f.a);
}

export function genBegrip(R) {
  if (R.int(0, 3) === 0) return genFact(R, 'begrip');
  const [term, def] = R.pick(BEGRIPPEN);
  const others = R.shuffle(BEGRIPPEN.filter((b) => b[0] !== term)).slice(0, 3);
  if (R.int(0, 1)) {
    return mc(R, { skill: 'begrip', prompt: `Welk begrip hoort bij: <i>"${def}"</i>`, explain: `<b>${term}</b>: ${def}` }, [term, ...others.map((o) => o[0])], 0);
  }
  return mc(R, { skill: 'begrip', prompt: `Wat is de betekenis van <b>${term}</b>?`, explain: `<b>${term}</b>: ${def}` }, [def, ...others.map((o) => o[1])], 0);
}

export const GENERATORS = {
  omrekenen: genOmrekenen, vst: genVst, strobo: genStrobo, xt: genXt, soort: genSoort,
  vgem: genVgem, ontmoet: genOntmoet, rem: genRem, begrip: genBegrip,
};

export function makeQuestion(skill, rng = Math.random) {
  const R = mk(rng);
  const g = GENERATORS[skill];
  if (!g) throw new Error('onbekende vaardigheid: ' + skill);
  return g(R);
}

// Antwoord nakijken. Accepteert "3,6", "3.6", "3,6 m/s", " 25 ".
export function parseNum(input) {
  if (typeof input !== 'string') return NaN;
  const m = input.replace(/\s/g, '').replace(',', '.').match(/^-?\d*\.?\d+/);
  return m ? parseFloat(m[0]) : NaN;
}

export function check(q, input) {
  if (q.kind === 'mc') return Number(input) === q.answer;
  const x = parseNum(input);
  if (!Number.isFinite(x)) return false;
  const tol = q.tol ?? 0.02;
  // tol < 0.1 → relatief; anders absoluut
  if (tol < 0.1) return Math.abs(x - q.answer) <= Math.max(Math.abs(q.answer) * tol, 0.011);
  return Math.abs(x - q.answer) <= tol;
}
