/* UI bindings for the bill, solar and EV calculators. Data comes from assets/data.js (window.SITE_DATA). */
(function () {
  'use strict';
  var C = window.SolarCalc;
  var D = window.SITE_DATA;
  var data = D.gujarat;
  var common = D.common;
  var india = D.india;

  var inr0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  var inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function rs(x) { return '₹' + inr0.format(Math.round(x)); }
  function rs2(x) { return '₹' + inr2.format(x); }
  function num(x, d) { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: d || 0 }).format(x); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function readForm(form) {
    var o = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; return; }
      if (el.type === 'checkbox') { o[el.name] = el.checked; return; }
      o[el.name] = el.value;
    });
    return o;
  }

  // Prefill fields from the query string so results can be shared and calculators can link to each other.
  function prefill(form) {
    var q = new URLSearchParams(location.search);
    q.forEach(function (v, k) {
      var els = form.querySelectorAll('[name="' + CSS.escape(k) + '"]');
      Array.prototype.forEach.call(els, function (el) {
        if (el.type === 'radio') el.checked = el.value === v;
        else if (el.type === 'checkbox') el.checked = v === '1' || v === 'true';
        else el.value = v;
      });
    });
  }

  function setCategories(form) {
    var sel = form.elements.category;
    if (!sel) return;
    var t = C.getTariff(data, form.elements.discom.value, 'urban');
    var current = sel.value;
    sel.innerHTML = t.categories.map(function (k) {
      return '<option value="' + k + '">' + esc(t.group.categories[k].label) + '</option>';
    }).join('');
    sel.value = t.categories.indexOf(current) >= 0 ? current : 'urban';
  }

  // FPPPA and duty are prefilled with estimates until the user types their own bill's figure.
  function setChargeDefaults(form) {
    var t = C.getTariff(data, form.elements.discom.value, form.elements.category ? form.elements.category.value : 'urban');
    var f = form.elements.fppa, d = form.elements.dutyPct;
    if (f && !f.dataset.touched) f.value = t.fppa.toFixed(2);
    if (d && !d.dataset.touched) d.value = t.dutyPct;
  }

  function isEstimate(form, name) {
    var el = form.elements[name];
    return el && !el.dataset.touched;
  }

  function toggleSmart(form) {
    var smart = /smart/.test(form.elements.meter.value);
    var row = form.querySelector('[data-show="smart"]');
    if (row) row.classList.toggle('hidden', !smart);
  }

  function billOpts(f) {
    return {
      discom: f.discom,
      category: f.category || 'urban',
      loadKw: Number(f.loadKw) || 1,
      phase: f.phase || 'single',
      fppa: f.fppa,
      dutyPct: f.dutyPct,
      meter: f.meter || 'postpaid',
      solarHoursPct: Number(f.solarHoursPct) || 0
    };
  }

  function link(path, params) {
    var q = new URLSearchParams();
    Object.keys(params).forEach(function (k) { if (params[k] !== undefined && params[k] !== '') q.set(k, params[k]); });
    return path + '?' + q.toString();
  }

  function svgBars(values, labels, opts) {
    opts = opts || {};
    var w = 520, h = 160, pad = 24, n = values.length;
    var max = Math.max.apply(null, values.map(Math.abs).concat([1]));
    var min = Math.min.apply(null, values.concat([0]));
    var span = (max - Math.min(min, 0)) || 1;
    var zeroY = pad + (h - 2 * pad) * (Math.max.apply(null, values.concat([0])) / span);
    var bw = (w - 2 * pad) / n;
    var bars = values.map(function (v, i) {
      var y = v >= 0 ? zeroY - (v / span) * (h - 2 * pad) : zeroY;
      var bh = Math.abs(v / span) * (h - 2 * pad);
      var color = v >= 0 ? 'var(--brand)' : 'var(--accent)';
      var label = labels[i] && (n <= 12 || i % 5 === 0 || i === n - 1)
        ? '<text x="' + (pad + i * bw + bw / 2) + '" y="' + (h - 6) + '" text-anchor="middle">' + labels[i] + '</text>' : '';
      return '<rect x="' + (pad + i * bw + 1) + '" y="' + y + '" width="' + Math.max(1, bw - 2) + '" height="' + Math.max(0.5, bh) + '" fill="' + color + '" rx="2"><title>' + esc(labels[i] + ': ' + (opts.fmt ? opts.fmt(v) : v)) + '</title></rect>' + label;
    }).join('');
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(opts.title || 'chart') + '">' +
      '<line x1="' + pad + '" x2="' + (w - pad) + '" y1="' + zeroY + '" y2="' + zeroY + '" stroke="var(--border)"/>' + bars + '</svg>';
  }

  function estTag(form, name) {
    return isEstimate(form, name) ? ' <span class="est" title="Default estimate. Enter the figure from your bill.">est.</span>' : '';
  }

  // ---------- Bill calculator ----------

  function renderBill(form, out) {
    var f = readForm(form);
    var o = billOpts(f);
    o.months = Number(f.months) || 1;
    var byBill = f.inputMode === 'amount';
    form.querySelector('[data-show="units"]').classList.toggle('hidden', byBill);
    form.querySelector('[data-show="amount"]').classList.toggle('hidden', !byBill);
    o.units = byBill ? C.unitsFromBill(data, o, Number(f.amount) || 0) : Number(f.units) || 0;

    var b = C.calcBill(data, o);
    var marginal = C.marginalRate(data, o);
    var periodLabel = o.months === 2 ? '2-month bill' : 'Monthly bill';
    var rows = b.slabRows.map(function (r) {
      return '<tr><td>' + (r.to === null ? 'Above ' + num(r.from) : num(r.from + 1) + '–' + num(r.to)) + ' units</td><td class="num">' + num(r.units, 1) + ' × ' + rs2(r.rate) + '</td><td class="num">' + rs2(r.amount) + '</td></tr>';
    }).join('');

    var smartCompare = '';
    if (o.meter === 'postpaid') {
      var smart = C.calcBill(data, Object.assign({}, o, { meter: 'prepaid-smart', solarHoursPct: 30 }));
      smartCompare = '<p class="note">With a prepaid smart meter (3% rebate on energy charges) and 30% of your use between ' +
        esc(data.common.tou.window) + ' (60 paise/unit ToU discount), this bill would be about <strong>' + rs(smart.total) +
        '</strong>, saving ' + rs(b.total - smart.total) + '.</p>';
    }

    out.innerHTML =
      '<div class="kpis">' +
        '<div class="kpi hero"><div class="k">' + periodLabel + '</div><div class="v">' + rs(b.total) + '</div></div>' +
        '<div class="kpi"><div class="k">Units</div><div class="v">' + num(b.units) + '</div></div>' +
        '<div class="kpi"><div class="k">Effective rate</div><div class="v">' + rs2(b.effectiveRate) + '/unit</div></div>' +
        '<div class="kpi"><div class="k">Next unit costs</div><div class="v">' + rs2(marginal) + '</div></div>' +
        '<div class="kpi"><div class="k">Energy charge</div><div class="v">' + rs(b.energy) + '</div></div>' +
        '<div class="kpi"><div class="k">FPPPA + duty</div><div class="v">' + rs(b.fppa + b.duty) + '</div></div>' +
      '</div>' +
      '<div class="table-wrap"><table><thead><tr><th>Bill item</th><th class="num">Calculation</th><th class="num">Amount</th></tr></thead><tbody>' +
        '<tr><td>Fixed charge</td><td class="num">' + esc(f.loadKw) + ' kW load</td><td class="num">' + rs2(b.fixed) + '</td></tr>' +
        rows +
        '<tr><td>FPPPA (fuel surcharge)' + estTag(form, 'fppa') + '</td><td class="num">' + num(b.units, 1) + ' × ' + rs2(b.fppaRate) + '</td><td class="num">' + rs2(b.fppa) + '</td></tr>' +
        (b.prepaidRebate ? '<tr class="minus"><td>Prepaid rebate (3% of energy)</td><td></td><td class="num">−' + rs2(b.prepaidRebate) + '</td></tr>' : '') +
        (b.touDiscount ? '<tr class="minus"><td>ToU discount ' + esc(data.common.tou.window) + '</td><td class="num">' + num(b.solarHoursUnits, 1) + ' × ₹0.60</td><td class="num">−' + rs2(b.touDiscount) + '</td></tr>' : '') +
        '<tr><td>Electricity duty' + estTag(form, 'dutyPct') + '</td><td class="num">' + b.dutyPct + '%</td><td class="num">' + rs2(b.duty) + '</td></tr>' +
        '<tr class="total"><td>Total</td><td></td><td class="num">' + rs2(b.total) + '</td></tr>' +
      '</tbody></table></div>' +
      smartCompare +
      '<p class="note">Based on the GERC ' + esc(data.tariffYear) + ' tariff.' +
        (isEstimate(form, 'fppa') || isEstimate(form, 'dutyPct') ? ' Items marked <span class="est">est.</span> use our default estimate; enter the figures printed on your bill under “From your bill” for an exact match.' : ' Using the FPPPA and duty you entered.') +
        ' Meter rent, rounding and arrears are not included.</p>' +
      '<a class="cta" href="' + link('solar-rooftop-calculator-gujarat.html', {
        discom: o.discom, category: o.category, units: Math.round(b.units / o.months), loadKw: f.loadKw,
        fppa: isEstimate(form, 'fppa') ? '' : f.fppa, dutyPct: isEstimate(form, 'dutyPct') ? '' : f.dutyPct
      }) + '">See how much rooftop solar saves on this bill →</a>';
  }

  // ---------- Solar ROI ----------

  function renderSolar(form, out) {
    var f = readForm(form);
    var o = billOpts(f);
    o.units = Number(f.units) || 0;
    var city = data.cities[Number(f.city) || 0];
    o.yieldKwhPerKwYear = Number(f.yield) || city.yieldKwhPerKwYear;
    o.kw = Number(f.kw) || 0;
    o.roofSqft = Number(f.roofSqft) || 0;
    o.costPerKw = Number(f.costPerKw) || common.solarDefaults.costPerKw;
    o.escalationPct = f.escalationPct === '' ? undefined : Number(f.escalationPct);
    o.degradationPct = f.degradationPct === '' ? undefined : Number(f.degradationPct);
    o.surplusRate = f.surplusRate === '' ? undefined : Number(f.surplusRate);
    o.loan = { enabled: f.loanEnabled, sharePct: Number(f.loanSharePct), ratePct: Number(f.loanRate), years: Number(f.loanYears) };
    form.querySelector('[data-show="loan"]').classList.toggle('hidden', !f.loanEnabled);

    var r = C.solarRoi(data, common, o);
    var monthRows = r.months.map(function (m) {
      return '<tr><td>' + MONTHS[m.month] + '</td><td class="num">' + num(m.generation) + '</td><td class="num">' + rs(m.billAfter) + '</td><td class="num">' + num(m.surplus) + '</td><td class="num">' + rs(m.saving) + '</td></tr>';
    }).join('');

    var loanHtml = '';
    if (r.loan) {
      loanHtml = '<h3>Loan</h3><div class="kpis">' +
        '<div class="kpi"><div class="k">Down payment</div><div class="v">' + rs(r.loan.downPayment) + '</div></div>' +
        '<div class="kpi"><div class="k">EMI (' + r.loan.years + ' yr @ ' + r.loan.ratePct + '%)</div><div class="v">' + rs(r.loan.emi) + '</div></div>' +
        '<div class="kpi"><div class="k">Saving − EMI / month</div><div class="v">' + rs(r.loan.netMonthlyYear1) + '</div></div>' +
        '</div><p class="note">Total interest paid: ' + rs(r.loan.totalInterest) + '. Banks offer collateral-free loans under PM Surya Ghar; the rate here is an assumption.</p>';
    }

    var cumul = r.years.map(function (y) { return y.cumulative; });
    out.innerHTML =
      '<div class="kpis">' +
        '<div class="kpi hero"><div class="k">Payback</div><div class="v">' + (r.paybackYears === null ? '> ' + r.years.length + ' yr' : num(r.paybackYears, 1) + ' yr') + '</div></div>' +
        '<div class="kpi"><div class="k">System size</div><div class="v">' + num(r.kw, 1) + ' kW</div></div>' +
        '<div class="kpi"><div class="k">Monthly saving (yr 1)</div><div class="v">' + rs(r.savingMonthlyYear1) + '</div></div>' +
        '<div class="kpi"><div class="k">Cost after subsidy</div><div class="v">' + rs(r.netCost) + '</div></div>' +
        '<div class="kpi"><div class="k">' + r.years.length + '-yr net saving</div><div class="v">' + rs(r.lifetimeNet) + '</div></div>' +
        '<div class="kpi"><div class="k">IRR</div><div class="v">' + (r.irr === null ? '—' : num(r.irr * 100, 1) + '%') + '</div></div>' +
      '</div>' +
      '<div class="table-wrap"><table><tbody>' +
        '<tr><td>System cost (' + num(r.kw, 1) + ' kW × ' + rs(o.costPerKw) + ')</td><td class="num">' + rs(r.grossCost) + '</td></tr>' +
        '<tr class="minus"><td>PM Surya Ghar subsidy</td><td class="num">−' + rs(r.subsidy) + '</td></tr>' +
        '<tr class="total"><td>Your cost</td><td class="num">' + rs(r.netCost) + '</td></tr>' +
        '<tr><td>Bill now (per month)</td><td class="num">' + rs(r.billBefore) + '</td></tr>' +
        '<tr><td>Average bill after solar</td><td class="num">' + rs(r.avgBillAfter) + '</td></tr>' +
        '<tr><td>Generation (year 1)</td><td class="num">' + num(r.generationYear1) + ' kWh (' + num(r.generationMonthlyAvg) + '/month)</td></tr>' +
        '<tr><td>Surplus exported (year 1)</td><td class="num">' + num(r.exportUnitsYear1) + ' kWh → ' + rs(r.exportIncomeYear1) + '</td></tr>' +
        '<tr><td>Roof area needed</td><td class="num">~' + num(r.roofSqftNeeded) + ' sq ft</td></tr>' +
        '<tr><td>CO₂ avoided over ' + r.years.length + ' years</td><td class="num">' + num(r.co2Tonnes, 1) + ' tonnes</td></tr>' +
      '</tbody></table></div>' +
      loanHtml +
      '<h3>Cumulative cash position by year</h3>' +
      svgBars(cumul, r.years.map(function (y) { return 'Y' + y.year; }), { fmt: rs, title: 'Cumulative savings minus cost by year' }) +
      '<h3>Year 1 month by month</h3>' +
      '<div class="table-wrap"><table><thead><tr><th>Month</th><th class="num">Solar kWh</th><th class="num">Bill after</th><th class="num">Export kWh</th><th class="num">Saving</th></tr></thead><tbody>' + monthRows + '</tbody></table></div>' +
      '<p class="note">Savings are computed slab by slab on your DISCOM tariff, net-metered per month, with tariffs rising ' + (o.escalationPct != null ? o.escalationPct : common.solarDefaults.tariffEscalationPctPerYear) + '%/yr and panels degrading ' + (o.degradationPct != null ? o.degradationPct : common.solarDefaults.degradationPctPerYear) + '%/yr. Inverter replacement and maintenance are not included.</p>' +
      '<a class="cta" href="' + link('ev-charging-cost-calculator-gujarat.html', {
        discom: o.discom, units: o.units, loadKw: f.loadKw, solarSurplusKwh: Math.round(r.generationMonthlyAvg * 0.3)
      }) + '">Add an EV: what does charging cost? →</a>';
  }

  // ---------- EV ----------

  function applyPreset(form) {
    var p = common.evPresets.find(function (x) { return x.id === form.elements.vehicle.value; });
    if (!p) return;
    if (p.id !== 'custom') form.elements.kwhPerKm.value = p.kwhPerKm;
    form.elements.iceType.value = p.iceType;
    form.elements.iceKmPerUnit.value = p.iceKmPerUnit;
    applyFuelPrice(form);
  }

  function applyFuelPrice(form) {
    var map = { petrol: common.fuel.petrolPerLitre, diesel: common.fuel.dieselPerLitre, cng: common.fuel.cngPerKg };
    form.elements.icePrice.value = map[form.elements.iceType.value];
  }

  function renderEv(form, out) {
    var f = readForm(form);
    var o = billOpts(f);
    o.units = Number(f.units) || 0;
    o.kwhPerKm = Number(f.kwhPerKm) || 0.13;
    o.kmPerMonth = Number(f.kmPerMonth) || 0;
    o.split = { homeDay: Number(f.homeDay) || 0, homeNight: Number(f.homeNight) || 0, public: Number(f.publicPct) || 0 };
    o.publicRate = Number(f.publicRate);
    o.solarSurplusKwh = Number(f.solarSurplusKwh) || 0;
    o.ice = { pricePerUnit: Number(f.icePrice) || 0, kmPerUnit: Number(f.iceKmPerUnit) || 0 };
    o.years = Number(f.years) || common.evDefaults.years;

    var r = C.evCost(data, common, o);
    var names = { homeNight: 'Home, night / normal hours', homeDay: 'Home, ' + data.common.tou.window + ' (solar hours)', public: 'Public fast charger' };
    var rows = Object.keys(r.scenarios).map(function (k) {
      var s = r.scenarios[k];
      return '<tr' + (k === r.best ? ' style="font-weight:700"' : '') + '><td>' + names[k] + (k === r.best ? ' ✓' : '') + '</td><td class="num">' + rs(s.total) + '</td><td class="num">' + rs2(s.perKm) + '</td></tr>';
    }).join('');
    var unit = f.iceType === 'cng' ? 'kg' : 'L';

    out.innerHTML =
      '<div class="kpis">' +
        '<div class="kpi hero"><div class="k">Your charging cost / month</div><div class="v">' + rs(r.mix.total) + '</div></div>' +
        '<div class="kpi"><div class="k">Cost per km</div><div class="v">' + rs2(r.mix.perKm) + '</div></div>' +
        '<div class="kpi"><div class="k">Saving vs ' + esc(f.iceType) + ' / month</div><div class="v">' + rs(r.savingMonthly) + '</div></div>' +
        '<div class="kpi"><div class="k">Energy needed</div><div class="v">' + num(r.gridKwh) + ' kWh</div></div>' +
        '<div class="kpi"><div class="k">Solar covers</div><div class="v">' + num(r.mix.solarOffsetPct) + '%</div></div>' +
        '<div class="kpi"><div class="k">Home rate (next unit)</div><div class="v">' + rs2(r.marginalRate) + '</div></div>' +
      '</div>' +
      '<h3>Where you charge changes the cost</h3>' +
      '<div class="table-wrap"><table><thead><tr><th>100% charged at</th><th class="num">₹ / month</th><th class="num">₹ / km</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<h3>' + r.years + '-year running cost</h3>' +
      '<div class="table-wrap"><table><tbody>' +
        '<tr><td>EV (your charging mix, with battery ageing)</td><td class="num">' + rs(r.evTotal) + '</td></tr>' +
        '<tr><td>' + esc(f.iceType) + ' vehicle (' + esc(f.iceKmPerUnit) + ' km/' + unit + ' at ' + rs2(o.ice.pricePerUnit) + ')</td><td class="num">' + rs(r.iceTotal) + '</td></tr>' +
        '<tr class="total"><td>EV saves</td><td class="num">' + rs(r.savingTotal) + '</td></tr>' +
      '</tbody></table></div>' +
      '<p class="note">Home cost is the extra amount added to your electricity bill, so it uses your DISCOM\'s higher slabs, FPPPA and duty. Solar-hours charging gets the 60 paise ToU discount only with a smart meter. Charging from surplus rooftop solar is valued at the ₹' + data.common.netMetering.surplusRatePerUnit + '/unit export income you give up. Fuel and energy only; excludes purchase price, insurance and maintenance.</p>';
  }

  // ---------- System size (any state, flat ₹/unit) ----------

  function renderSize(form, out) {
    var f = readForm(form);
    var kw = Number(f.kw) || 3;
    var city = india.cities[Number(f.city) || 0];
    var band = C.sizePrice(india, kw);
    var costEl = form.elements.cost;
    if (costEl && !costEl.dataset.touched) costEl.value = Math.round(band.mid / 1000) * 1000;
    var r = C.solarSimple(india, common, {
      kw: kw, yieldKwhPerKwYear: city.yield, units: Number(f.units) || 0,
      rate: Number(f.rate) || india.defaultRate, exportRate: f.exportRate, cost: Number(f.cost) || band.mid
    });
    var mode = form.dataset.mode || 'price';
    var monthRows = r.months.map(function (m) {
      return '<tr><td>' + MONTHS[m.month] + '</td><td class="num">' + num(m.perDay, 1) + '</td><td class="num">' + num(m.generation) + '</td><td class="num">' + rs(m.saving) + '</td></tr>';
    }).join('');
    var kpis = mode === 'generation'
      ? '<div class="kpi hero"><div class="k">Units per day</div><div class="v">' + num(r.generationPerDay, 1) + '</div></div>' +
        '<div class="kpi"><div class="k">Units per month</div><div class="v">' + num(r.generationPerMonth) + '</div></div>' +
        '<div class="kpi"><div class="k">Units per year</div><div class="v">' + num(r.generationYear1) + '</div></div>' +
        '<div class="kpi"><div class="k">Saving per month</div><div class="v">' + rs(r.savingMonthly) + '</div></div>' +
        '<div class="kpi"><div class="k">Panels (' + india.panelWatt + ' W)</div><div class="v">' + r.panels + '</div></div>' +
        '<div class="kpi"><div class="k">Roof needed</div><div class="v">~' + num(r.roofSqft) + ' sq ft</div></div>'
      : '<div class="kpi hero"><div class="k">You pay after subsidy</div><div class="v">' + rs(r.netCost) + '</div></div>' +
        '<div class="kpi"><div class="k">Subsidy</div><div class="v">' + rs(r.subsidy) + '</div></div>' +
        '<div class="kpi"><div class="k">Payback</div><div class="v">' + (r.paybackYears === null ? '—' : num(r.paybackYears, 1) + ' yr') + '</div></div>' +
        '<div class="kpi"><div class="k">Saving per month</div><div class="v">' + rs(r.savingMonthly) + '</div></div>' +
        '<div class="kpi"><div class="k">Units per day</div><div class="v">' + num(r.generationPerDay, 1) + '</div></div>' +
        '<div class="kpi"><div class="k">25-yr net saving</div><div class="v">' + rs(r.lifetimeNet) + '</div></div>';
    var gujarat = city.state === 'Gujarat'
      ? '<p class="note">In Gujarat? The <a href="solar-rooftop-calculator-gujarat.html?units=' + (Number(f.units) || 300) + '&kw=' + kw + '">Gujarat solar calculator</a> works out savings slab by slab on your DISCOM\'s exact tariff.</p>' : '';
    out.innerHTML = '<div class="kpis">' + kpis + '</div>' +
      '<div class="table-wrap"><table><tbody>' +
        '<tr><td>System price (' + num(kw, 1) + ' kW)</td><td class="num">' + rs(r.cost) + '</td></tr>' +
        '<tr class="minus"><td>PM Surya Ghar subsidy</td><td class="num">−' + rs(r.subsidy) + '</td></tr>' +
        '<tr class="total"><td>Your cost</td><td class="num">' + rs(r.netCost) + '</td></tr>' +
        '<tr><td>Generation in ' + esc(city.name) + '</td><td class="num">' + num(city.yield) + ' units per kW per year</td></tr>' +
        '<tr><td>CO₂ avoided over 25 years</td><td class="num">' + num(r.co2Tonnes, 1) + ' tonnes</td></tr>' +
      '</tbody></table></div>' +
      '<h3>Month by month in ' + esc(city.name) + '</h3>' +
      '<div class="table-wrap"><table><thead><tr><th>Month</th><th class="num">Units/day</th><th class="num">Units/month</th><th class="num">Saving</th></tr></thead><tbody>' + monthRows + '</tbody></table></div>' +
      '<p class="note">Savings value each solar unit you use at ₹' + esc(f.rate || india.defaultRate) + '/unit and surplus units at the export rate. Inverter replacement (about year 10–12) and cleaning are not included.</p>' + gujarat;
  }

  // ---------- Wiring ----------

  function bind(form, render) {
    var out = document.getElementById(form.dataset.output);
    var query = new URLSearchParams(location.search);
    ['fppa', 'dutyPct', 'cost'].forEach(function (n) {
      var el = form.elements[n];
      if (!el) return;
      if (query.get(n)) el.dataset.touched = '1'; // a shared link carries the user's own bill figures
      el.addEventListener('input', function () { this.dataset.touched = this.value === '' ? '' : '1'; });
    });
    prefill(form);
    if (form.elements.discom && form.elements.category) {
      setCategories(form);
      prefill(form); // category options exist now
      setChargeDefaults(form);
    }
    if (form.elements.meter) toggleSmart(form);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    function run() {
      try { render(form, out); } catch (err) { out.innerHTML = '<p class="verify">Could not calculate: ' + esc(err.message) + '</p>'; }
    }
    form.addEventListener('input', run);
    form.addEventListener('change', function (e) {
      if (e.target.name === 'discom') { setCategories(form); setChargeDefaults(form); }
      if (e.target.name === 'category') setChargeDefaults(form);
      if (e.target.name === 'meter') toggleSmart(form);
      if (e.target.name === 'city' && form.elements.discom) {
        var c = data.cities[Number(e.target.value)];
        if (c) { form.elements.discom.value = c.discom; setCategories(form); setChargeDefaults(form); }
        if (form.elements.yield) form.elements.yield.value = '';
      }
      if (e.target.name === 'kw' && form.elements.cost) form.elements.cost.dataset.touched = '';
      if (e.target.name === 'vehicle') applyPreset(form);
      if (e.target.name === 'iceType') applyFuelPrice(form);
      run();
    });
    run();
  }

  var forms = { bill: renderBill, solar: renderSolar, ev: renderEv, size: renderSize };
  Array.prototype.forEach.call(document.querySelectorAll('form[data-calc]'), function (form) {
    if (form.dataset.calc === 'ev' && !new URLSearchParams(location.search).has('kwhPerKm')) applyPreset(form);
    bind(form, forms[form.dataset.calc]);
  });
})();
