const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../site/assets/calc.js');
const data = require('../data/gujarat.json');
const common = require('../data/common.json');

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('UGVCL urban 300 units: slab maths by hand', () => {
  const b = C.calcBill(data, { discom: 'ugvcl', category: 'urban', loadKw: 3, units: 300, fppa: 2.3 });
  // 50*3.05 + 50*3.50 + 150*4.15 + 50*5.20 = 152.5 + 175 + 622.5 + 260
  near(b.energy, 1210);
  assert.equal(b.fixed, 25);
  near(b.fppa, 690);
  near(b.duty, (25 + 1210 + 690) * 0.15);
  near(b.total, (25 + 1210 + 690) * 1.15);
  assert.equal(b.slabRows.length, 4);
});

test('two-month bill doubles slab limits and fixed charge', () => {
  const one = C.calcBill(data, { discom: 'pgvcl', loadKw: 2, units: 180 });
  const two = C.calcBill(data, { discom: 'pgvcl', loadKw: 2, units: 360, months: 2 });
  near(two.total, one.total * 2);
});

test('fixed charge steps by load', () => {
  const steps = data.tariffGroups['gujarat-state'].categories.urban.fixed;
  assert.equal(C.fixedCharge(steps, 2), 15);
  assert.equal(C.fixedCharge(steps, 2.5), 25);
  assert.equal(C.fixedCharge(steps, 6), 45);
  assert.equal(C.fixedCharge(steps, 8), 70);
  const tpl = data.tariffGroups['torrent-ahmedabad'].categories.urban.fixed;
  assert.equal(C.fixedCharge(tpl, 3), 25);
  assert.equal(C.fixedCharge(tpl, 3, 'three'), 65);
  assert.equal(C.fixedCharge(tpl, 8), 65);
});

test('Torrent Ahmedabad slabs', () => {
  const b = C.calcBill(data, { discom: 'torrent-ahmedabad', loadKw: 3, units: 250, fppa: 0 });
  near(b.energy, 50 * 3.2 + 150 * 3.95 + 50 * 5.0);
});

test('rural duty is 7.5%', () => {
  const b = C.calcBill(data, { discom: 'mgvcl', category: 'rural', loadKw: 1, units: 100, fppa: 0 });
  near(b.energy, 50 * 2.65 + 50 * 3.10);
  near(b.duty, (15 + b.energy) * 0.075);
});

test('prepaid smart meter rebate and ToU discount', () => {
  const base = { discom: 'dgvcl', loadKw: 2, units: 200, fppa: 2.3 };
  const post = C.calcBill(data, base);
  const pre = C.calcBill(data, { ...base, meter: 'prepaid-smart', solarHoursPct: 25 });
  near(pre.prepaidRebate, post.energy * 0.03);
  near(pre.touDiscount, 50 * 0.6);
  assert.ok(pre.total < post.total);
  // ToU discount does not apply to a non-smart meter
  assert.equal(C.calcBill(data, { ...base, solarHoursPct: 25 }).touDiscount, 0);
});

test('unitsFromBill inverts calcBill', () => {
  const opts = { discom: 'ugvcl', loadKw: 3 };
  const amount = C.calcBill(data, { ...opts, units: 420 }).total;
  assert.equal(C.unitsFromBill(data, opts, amount), 420);
});

test('PM Surya Ghar subsidy', () => {
  assert.equal(C.pmSuryaGharSubsidy(common, 1), 30000);
  assert.equal(C.pmSuryaGharSubsidy(common, 2), 60000);
  assert.equal(C.pmSuryaGharSubsidy(common, 2.5), 69000);
  assert.equal(C.pmSuryaGharSubsidy(common, 3), 78000);
  assert.equal(C.pmSuryaGharSubsidy(common, 10), 78000);
});

test('solar ROI is sane for a typical 3 kW Ahmedabad home', () => {
  const r = C.solarRoi(data, common, {
    discom: 'torrent-ahmedabad', loadKw: 4, units: 400, yieldKwhPerKwYear: 1500, costPerKw: 55000
  });
  assert.equal(r.kw, 3); // 4800 kWh/yr / 1500 = 3.2, floored to 0.5 kW steps
  assert.equal(r.subsidy, 78000);
  assert.equal(r.netCost, 3 * 55000 - 78000);
  near(r.generationYear1, 4500, 1);
  assert.ok(r.avgBillAfter < r.billBefore / 2);
  assert.ok(r.paybackYears > 1.5 && r.paybackYears < 6, `payback ${r.paybackYears}`);
  assert.ok(r.irr > 0.15);
  assert.equal(r.years.length, 25);
});

test('recommendKw respects roof and load limits', () => {
  assert.equal(C.recommendKw(common, { units: 400, yieldKwhPerKwYear: 1500, roofSqft: 0, loadKw: 10 }), 3);
  assert.equal(C.recommendKw(common, { units: 400, yieldKwhPerKwYear: 1500, roofSqft: 150, loadKw: 10 }), 1.5);
  assert.equal(C.recommendKw(common, { units: 1000, yieldKwhPerKwYear: 1500, roofSqft: 0, loadKw: 4 }), 4);
});

test('EMI and IRR', () => {
  near(C.emi(100000, 12, 1), 8884.88);
  near(C.irr([-100, 110]), 0.10, 1e-6);
});

test('EV: solar-hours home charging is cheapest with surplus solar', () => {
  const r = C.evCost(data, common, {
    discom: 'ugvcl', loadKw: 4, units: 250, meter: 'postpaid-smart',
    kwhPerKm: 0.14, kmPerMonth: 1000, split: { homeNight: 100 },
    publicRate: 20, solarSurplusKwh: 200,
    ice: { pricePerUnit: 94.5, kmPerUnit: 15 }
  });
  assert.equal(r.best, 'homeDay');
  assert.ok(r.scenarios.public.total > r.scenarios.homeNight.total);
  near(r.iceMonthly, 1000 / 15 * 94.5);
  assert.ok(r.savingMonthly > 0);
});

test('FPPPA and duty from the user\'s bill override the defaults', () => {
  const base = { discom: 'ugvcl', loadKw: 3, units: 300 };
  const def = C.calcBill(data, base);
  assert.equal(def.dutyPct, 15);
  near(def.fppaRate, 2.3);
  const own = C.calcBill(data, { ...base, fppa: '2.85', dutyPct: '12' });
  near(own.fppa, 300 * 2.85);
  near(own.duty, (own.fixed + own.energy + own.fppa) * 0.12);
  // empty fields fall back to the defaults
  near(C.calcBill(data, { ...base, fppa: '', dutyPct: '' }).total, def.total);
});
