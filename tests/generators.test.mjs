import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeQuestion, check, parseNum, mulberry32, GENERATORS, nl } from '../docs/js/generators.js';

const SKILLS = Object.keys(GENERATORS);
const N = 600;

for (const skill of SKILLS) {
  test(`generator ${skill}: ${N} vragen geldig en nakijkbaar`, () => {
    for (let seed = 1; seed <= N; seed++) {
      const q = makeQuestion(skill, mulberry32(seed * 7919));
      const ctx = `${skill} seed ${seed}: ${q.prompt}`;
      assert.ok(q.prompt && q.explain, 'prompt+explain ' + ctx);
      assert.ok(!/NaN|undefined|Infinity/.test(q.prompt + q.explain + (q.svg || '')), 'geen NaN/undefined ' + ctx);
      if (q.svg) assert.match(q.svg, /^<svg[\s\S]*<\/svg>$/, 'svg ' + ctx);
      if (q.kind === 'num') {
        assert.ok(Number.isFinite(q.answer), 'eindig antwoord ' + ctx);
        // Leerling typt afgerond antwoord met komma
        const dec = Math.abs(q.answer) >= 100 ? 1 : 2;
        assert.ok(check(q, nl(q.answer, dec)), `afgerond antwoord ${nl(q.answer, dec)} moet goed zijn: ${ctx}`);
        assert.ok(check(q, String(q.answer)), 'exact met punt ' + ctx);
        if (Math.abs(q.answer) > 0.5) assert.ok(!check(q, String(q.answer * 1.3)), '30% ernaast moet fout ' + ctx);
        assert.ok(!check(q, 'abc'), 'onzin fout ' + ctx);
      } else {
        assert.equal(q.kind, 'mc', ctx);
        assert.ok(q.answer >= 0 && q.answer < q.options.length, 'mc index ' + ctx);
        assert.equal(new Set(q.options).size, q.options.length, 'unieke opties ' + ctx);
        assert.ok(check(q, String(q.answer)));
        assert.ok(!check(q, String((q.answer + 1) % q.options.length)));
      }
    }
  });
}

test('parseNum accepteert NL-notatie en eenheden', () => {
  assert.equal(parseNum('3,6'), 3.6);
  assert.equal(parseNum(' 25 m/s'), 25);
  assert.equal(parseNum('0.75'), 0.75);
  assert.equal(parseNum(',5'), 0.5);
  assert.ok(Number.isNaN(parseNum('')));
});

test('kernsommen uit het boek kloppen', () => {
  // n beelden -> n-1 tussenpozen: 9 beelden, 0,4 s -> 3,2 s
  assert.equal(Math.round((9 - 1) * 0.4 * 10) / 10, 3.2);
  // remweg n^2: 40->120 km/h, 10 m -> 90 m
  assert.equal(10 * (120 / 40) ** 2, 90);
  // stopafstand 45 km/h, 0,8 s, remweg 12 m -> 22 m
  assert.equal((45 / 3.6) * 0.8 + 12, 22);
});

test('alle vaardigheden leveren variatie', () => {
  for (const skill of SKILLS) {
    const set = new Set();
    for (let s = 1; s <= 80; s++) { const q = makeQuestion(skill, mulberry32(s)); set.add(q.prompt + (q.svg || "")); }
    assert.ok(set.size >= 8, `${skill} te weinig variatie: ${set.size}`);
  }
});
