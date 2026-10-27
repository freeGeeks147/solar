const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../site/assets/calc.js');
const common = require('../data/common.json');
const mh = require('../data/states/maharashtra.json');
const mp = require('../data/states/madhya-pradesh.json');
const br = require('../data/states/bihar.json');

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('every state file has the shape the calculators need', () => {
  for (const s of [mh, mp, br]) {
    assert.ok(s.stateSlug && s.tariffYear && s.sourceUrl, s.state);
    assert.ok(s.cities.length >= 5, s.state);
    for (const c of s.cities) assert.ok(s.discoms.some((d) => d.id === c.discom), `${s.state}: ${c.name}`);
    for (const d of s.discoms) {
      const g = s.tariffGroups[d.tariffGroup];
      assert.ok(g && g.categories.urban, `${s.state}: ${d.id}`);
      for (const cat of Object.values(g.categories)) assert.equal(cat.slabs[cat.slabs.length - 1].upto, null);
    }
    assert.equal(s.solarMonthlyShare.length, 12);
    near(s.solarMonthlyShare.reduce((a, b) => a + b, 0), 1, 0.001);
  }
});

test('Maharashtra 300 units: telescopic slabs incl. wheeling, 16% duty', () => {
  const b = C.calcBill(mh, { discom: 'msedcl', loadKw: 2, units: 300, fppa: 0 });
  // 100*5.52 + 200*10.60
  near(b.energy, 2672);
  assert.equal(b.fixed, 130);
  near(b.total, (130 + 2672) * 1.16);
});

test('Madhya Pradesh fixed charge depends on monthly units', () => {
  const f = mp.tariffGroups.mp.categories.urban.fixed;
  assert.equal(C.fixedCharge(f, 2, 'single', 50), 81);
  assert.equal(C.fixedCharge(f, 2, 'single', 150), 134);
  assert.equal(C.fixedCharge(f, 2, 'single', 151), 30 * 11);
  assert.equal(C.fixedCharge(f, 2, 'single', 300), 30 * 20);
  const b = C.calcBill(mp, { discom: 'mpcz', category: 'urban', loadKw: 2, units: 200, fppa: 0, dutyPct: 0 });
  // 50*4.71 + 100*5.67 + 50*7.05 + fixed 14 blocks * 30
  near(b.total, 235.5 + 567 + 352.5 + 420);
});

test('Bihar: first 125 units free, fixed charge per kW', () => {
  const free = C.calcBill(br, { discom: 'sbpdcl', category: 'urban', loadKw: 2, units: 125, fppa: 0 });
  near(free.energy, 0);
  assert.equal(free.fixed, 160);
  const b = C.calcBill(br, { discom: 'nbpdcl', category: 'rural', loadKw: 1, units: 225, fppa: 0, dutyPct: 0 });
  near(b.total, 40 + 100 * 2.45);
});

test('state top-up subsidy is added only where the state has one', () => {
  assert.equal(C.stateSubsidy(br, 1), 10000);
  assert.equal(C.stateSubsidy(br, 3), 20000);
  assert.equal(C.stateSubsidy(mh, 3), 0);
  const r = C.solarRoi(br, common, { discom: 'sbpdcl', category: 'urban', loadKw: 3, units: 300, kw: 3, yieldKwhPerKwYear: 1350 });
  assert.equal(r.subsidy, 78000 + 20000);
  assert.equal(r.subsidyState, 20000);
});
