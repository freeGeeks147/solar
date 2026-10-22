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

  // ---------- Plain-language helpers ----------

  // 3.67 -> "3 years 8 months"
  function yearsText(y) {
    if (y === null || y === undefined) return 'more than 25 years';
    var whole = Math.floor(y), months = Math.round((y - whole) * 12);
    if (months === 12) { whole += 1; months = 0; }
    var parts = [];
    if (whole) parts.push(whole + (whole === 1 ? ' year' : ' years'));
    if (months) parts.push(months + (months === 1 ? ' month' : ' months'));
    return parts.join(' ') || 'less than a month';
  }

  function tile(label, value, hero) {
    return '<div class="kpi' + (hero ? ' hero' : '') + '"><div class="k">' + label + '</div><div class="v">' + value + '</div></div>';
  }

  function more(summary, inner) {
    return '<details class="more"><summary>' + summary + '</summary>' + inner + '</details>';
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
    var period = o.months === 2 ? 'for 2 months' : 'for the month';
    var rows = b.slabRows.map(function (r, i) {
      var label = i === 0 ? 'First ' + num(r.units) + ' units' : (r.to === null ? num(r.units) + ' units above ' + num(r.from) : 'Next ' + num(r.units) + ' units');
      return '<tr><td>' + label + ' at ' + rs2(r.rate) + '</td><td class="num">' + rs(r.amount) + '</td></tr>';
    }).join('');

    var smartLine = '';
    if (o.meter === 'postpaid') {
      var smart = C.calcBill(data, Object.assign({}, o, { meter: 'prepaid-smart', solarHoursPct: 30 }));
      smartLine = '<p class="note"><strong>Tip:</strong> with a prepaid smart meter, and running some appliances between 11 am and 5 pm, this bill would be about ' + rs(smart.total) + ' (you save ' + rs(b.total - smart.total) + ').</p>';
    }
    var estimate = isEstimate(form, 'fppa') || isEstimate(form, 'dutyPct');

    out.innerHTML =
      '<p class="answer">' + (byBill ? 'A bill of ' + rs(b.total) + ' means you used about <strong>' + num(b.units) + ' units</strong>. ' : 'Your bill: <strong>' + rs(b.total) + '</strong> ' + period + '. ') +
        'That is about <strong>' + rs2(b.effectiveRate) + ' per unit</strong> once all charges are added.</p>' +
      '<div class="kpis three">' +
        tile(o.months === 2 ? 'Bill (2 months)' : 'Bill (1 month)', rs(b.total), true) +
        tile('Average cost per unit', rs2(b.effectiveRate)) +
        tile('Each extra unit costs', rs2(marginal)) +
      '</div>' +
      '<h3>What you pay for</h3>' +
      '<div class="table-wrap"><table><tbody>' +
        rows +
        '<tr><td>Fixed charge</td><td class="num">' + rs(b.fixed) + '</td></tr>' +
        '<tr><td>Fuel surcharge (FPPPA)' + estTag(form, 'fppa') + '</td><td class="num">' + rs(b.fppa) + '</td></tr>' +
        (b.prepaidRebate ? '<tr class="minus"><td>Prepaid meter discount</td><td class="num">−' + rs(b.prepaidRebate) + '</td></tr>' : '') +
        (b.touDiscount ? '<tr class="minus"><td>Daytime (11 am–5 pm) discount</td><td class="num">−' + rs(b.touDiscount) + '</td></tr>' : '') +
        '<tr><td>Government tax (electricity duty ' + b.dutyPct + '%)' + estTag(form, 'dutyPct') + '</td><td class="num">' + rs(b.duty) + '</td></tr>' +
        '<tr class="total"><td>Total</td><td class="num">' + rs(b.total) + '</td></tr>' +
      '</tbody></table></div>' +
      (estimate ? '<p class="note"><span class="est">est.</span> = our estimate. For an exact match, copy these two numbers from your bill into the box on the left.</p>' : '') +
      smartLine +
      '<a class="cta" href="' + link('solar-rooftop-calculator-gujarat.html', {
        discom: o.discom, category: o.category, units: Math.round(b.units / o.months), loadKw: f.loadKw,
        fppa: isEstimate(form, 'fppa') ? '' : f.fppa, dutyPct: isEstimate(form, 'dutyPct') ? '' : f.dutyPct
      }) + '">How much would solar save on this bill? →</a>';
  }

  // ---------- Solar ROI (Gujarat, exact tariff) ----------

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
      return '<tr><td>' + MONTHS[m.month] + '</td><td class="num">' + num(m.generation) + '</td><td class="num">' + rs(m.billAfter) + '</td><td class="num">' + rs(m.saving) + '</td></tr>';
    }).join('');

    var loanHtml = '';
    if (r.loan) {
      var covers = r.loan.netMonthlyYear1 >= 0;
      loanHtml = '<h3>With a loan</h3><p>You pay <strong>' + rs(r.loan.downPayment) + '</strong> upfront and an EMI of <strong>' + rs(r.loan.emi) + ' a month</strong> for ' + r.loan.years + ' years. ' +
        (covers ? 'Your bill saving is bigger than the EMI, so you are <strong>' + rs(r.loan.netMonthlyYear1) + ' a month ahead</strong> from day one.' : 'The EMI is ' + rs(-r.loan.netMonthlyYear1) + ' a month more than your bill saving until the loan ends.') + '</p>';
    }

    var cumul = r.years.map(function (y) { return y.cumulative; });
    out.innerHTML =
      '<p class="answer">A <strong>' + num(r.kw, 1) + ' kW</strong> system costs you about <strong>' + rs(r.netCost) + '</strong> after the government subsidy. ' +
        'Your bill drops from ' + rs(r.billBefore) + ' to about <strong>' + rs(r.avgBillAfter) + ' a month</strong>, and the system pays for itself in <strong>' + yearsText(r.paybackYears) + '</strong>.</p>' +
      '<div class="kpis">' +
        tile('You pay (after subsidy)', rs(r.netCost), true) +
        tile('You save every month', rs(r.savingMonthlyYear1)) +
        tile('Money back in', yearsText(r.paybackYears)) +
        tile('System size', num(r.kw, 1) + ' kW') +
        tile('Bill now', rs(r.billBefore)) +
        tile('Bill with solar', rs(r.avgBillAfter)) +
      '</div>' +
      loanHtml +
      more('See the full cost breakdown',
        '<div class="table-wrap"><table><tbody>' +
          '<tr><td>System price (' + num(r.kw, 1) + ' kW)</td><td class="num">' + rs(r.grossCost) + '</td></tr>' +
          '<tr class="minus"><td>Government subsidy (PM Surya Ghar)</td><td class="num">−' + rs(r.subsidy) + '</td></tr>' +
          '<tr class="total"><td>You pay</td><td class="num">' + rs(r.netCost) + '</td></tr>' +
          '<tr><td>Electricity made in a year</td><td class="num">' + num(r.generationYear1) + ' units</td></tr>' +
          '<tr><td>Extra units sold to the grid</td><td class="num">' + num(r.exportUnitsYear1) + ' units = ' + rs(r.exportIncomeYear1) + '</td></tr>' +
          '<tr><td>Total saving over 25 years (after cost)</td><td class="num">' + rs(r.lifetimeNet) + '</td></tr>' +
          '<tr><td>Roof space needed</td><td class="num">about ' + num(r.roofSqftNeeded) + ' sq ft</td></tr>' +
        '</tbody></table></div>') +
      more('See your saving grow year by year',
        svgBars(cumul, r.years.map(function (y) { return 'Y' + y.year; }), { fmt: rs, title: 'Money saved minus cost, by year' }) +
        '<p class="note">Orange bars: still paying back. Green bars: pure profit.</p>') +
      more('See month by month',
        '<div class="table-wrap"><table><thead><tr><th>Month</th><th class="num">Units made</th><th class="num">Bill with solar</th><th class="num">Saving</th></tr></thead><tbody>' + monthRows + '</tbody></table></div>') +
      '<p class="note">Worked out on your company\'s actual tariff, before and after solar. Assumes electricity prices rise ' + (o.escalationPct != null ? o.escalationPct : common.solarDefaults.tariffEscalationPctPerYear) + '% a year. Does not include an inverter replacement (around year 10–12).</p>' +
      '<a class="cta" href="' + link('ev-charging-cost-calculator-gujarat.html', {
        discom: o.discom, units: o.units, loadKw: f.loadKw, solarSurplusKwh: Math.round(r.generationMonthlyAvg * 0.3)
      }) + '">Thinking of an electric vehicle? See the charging cost →</a>';
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
    var names = { homeNight: 'At home (any time)', homeDay: 'At home, 11 am–5 pm', public: 'Public fast charger' };
    var rows = Object.keys(r.scenarios).map(function (k) {
      var s = r.scenarios[k];
      return '<tr' + (k === r.best ? ' style="font-weight:700"' : '') + '><td>' + names[k] + (k === r.best ? ' (cheapest)' : '') + '</td><td class="num">' + rs(s.total) + '</td><td class="num">' + rs2(s.perKm) + '</td></tr>';
    }).join('');
    var fuel = esc(f.iceType);

    out.innerHTML =
      '<p class="answer">Charging costs you about <strong>' + rs(r.mix.total) + ' a month</strong> (' + rs2(r.mix.perKm) + ' per km). ' +
        'A ' + fuel + ' vehicle would cost ' + rs(r.iceMonthly) + ', so you save <strong>' + rs(r.savingMonthly) + ' every month</strong>.</p>' +
      '<div class="kpis three">' +
        tile('Charging cost per month', rs(r.mix.total), true) +
        tile('Cost per km', rs2(r.mix.perKm)) +
        tile('You save vs ' + fuel, rs(r.savingMonthly) + '/mo') +
      '</div>' +
      '<h3>Where you charge makes a big difference</h3>' +
      '<div class="table-wrap"><table><thead><tr><th>If you always charge</th><th class="num">Per month</th><th class="num">Per km</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p>Over ' + r.years + ' years: EV about <strong>' + rs(r.evTotal) + '</strong>, ' + fuel + ' about <strong>' + rs(r.iceTotal) + '</strong>. You save about <strong>' + rs(r.savingTotal) + '</strong> on fuel.</p>' +
      '<p class="note">Home cost is what charging adds to your electricity bill. Covers fuel and electricity only, not the vehicle price, insurance or servicing.</p>';
  }

  // ---------- System size (any state, flat ₹/unit) ----------

  // Step-by-step explanation of the saving, using yearly averages per month.
  function workings(r, units, rate, exportRate) {
    var gen = r.generationPerMonth;
    var surplus = r.months.reduce(function (a, m) { return a + m.surplus; }, 0) / 12;
    var used = gen - surplus;
    var buy = Math.max(0, units - used);
    var steps = [];
    if (units > 0) steps.push('Your home uses <strong>' + num(units) + ' units</strong> a month (' + rs(units * rate) + ' at ' + rs2(rate) + ' a unit).');
    steps.push('Solar makes about <strong>' + num(gen) + ' units</strong> a month.');
    if (units <= 0) {
      steps.push('Every solar unit is counted at ' + rs2(rate) + '. Saving: ' + num(gen) + ' × ' + rs2(rate) + ' = <strong>' + rs(gen * rate) + '</strong>.');
    } else if (surplus < 1) {
      steps.push('Your home uses all ' + num(used) + ' solar units, so you buy only <strong>' + num(buy) + ' units</strong> from the electricity company.');
      steps.push('Saving: ' + num(used) + ' units × ' + rs2(rate) + ' = <strong>' + rs(used * rate) + ' a month</strong>.');
      steps.push('Bill: ' + rs(units * rate) + ' → about <strong>' + rs(buy * rate) + '</strong>.');
    } else {
      if (buy >= 1) steps.push('Solar makes more than you use in sunny months and less in the rainy months, so some months have extra units. On average over the year:');
      steps.push('Your home uses ' + num(used) + ' of them' + (buy >= 1 ? ' and buys ' + num(buy) + ' units from the company' : ', so you buy almost nothing') + '. The other <strong>' + num(surplus) + ' units</strong> go to the grid, and the company pays about ' + rs2(Number(exportRate)) + ' each.');
      steps.push('Saving: ' + num(used) + ' × ' + rs2(rate) + ' + ' + num(surplus) + ' × ' + rs2(Number(exportRate)) + ' = <strong>' + rs(used * rate + surplus * exportRate) + ' a month</strong>.');
      steps.push('Bill: ' + rs(units * rate) + ' → about <strong>' + rs(buy * rate) + '</strong> plus small fixed charges.');
    }
    return '<div class="workings"><h3>How we worked it out</h3><ol>' + steps.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>' +
      '<p class="note">Units your home uses save the full ' + rs2(rate) + '. Extra units sold to the grid earn only about ' + rs2(Number(exportRate)) + ', so a system that makes about as much as you use pays back fastest. Figures are monthly averages over the year.</p></div>';
  }

  function renderSize(form, out) {
    var f = readForm(form);
    var kw = Number(f.kw) || 3;
    var city = india.cities[Number(f.city) || 0];
    var band = C.sizePrice(india, kw);
    var costEl = form.elements.cost;
    if (costEl && !costEl.dataset.touched) costEl.value = Math.round(band.mid / 1000) * 1000;
    var rate = Number(f.rate) || india.defaultRate;
    var byUnits = f.inputMode === 'units';
    form.querySelector('[data-show="bill"]').classList.toggle('hidden', byUnits);
    form.querySelector('[data-show="units"]').classList.toggle('hidden', !byUnits);
    var units = byUnits ? Number(f.units) || 0 : Math.round((Number(f.bill) || 0) / rate);
    var bill = units * rate;
    var r = C.solarSimple(india, common, {
      kw: kw, yieldKwhPerKwYear: city.yield, units: units,
      rate: rate, exportRate: f.exportRate, cost: Number(f.cost) || band.mid
    });
    var monthRows = r.months.map(function (m) {
      return '<tr><td>' + MONTHS[m.month] + '</td><td class="num">' + num(m.perDay, 1) + '</td><td class="num">' + num(m.generation) + '</td><td class="num">' + rs(m.saving) + '</td></tr>';
    }).join('');
    var tooBig = units > 0 && r.generationPerMonth > units * 1.25;
    var tooSmall = units > 0 && r.generationPerMonth < units * 0.6;
    var fit = tooBig ? '<p class="note"><strong>Tip:</strong> ' + num(kw, 1) + ' kW makes more than your home uses. Extra units earn only about ₹' + (f.exportRate || india.defaultExportRate) + ' each, so a smaller system may pay back faster.</p>'
      : tooSmall ? '<p class="note"><strong>Tip:</strong> ' + num(kw, 1) + ' kW covers only part of your bill. A bigger system would save more, if your roof has space.</p>' : '';

    var answer = form.dataset.mode === 'generation'
      ? '<p class="answer">A <strong>' + num(kw, 1) + ' kW</strong> system in ' + esc(city.name) + ' makes about <strong>' + num(r.generationPerDay, 1) + ' units a day</strong>, or ' + num(r.generationPerMonth) + ' units a month. That is worth about <strong>' + rs(r.savingMonthly) + ' off your bill every month</strong>.</p>'
      : '<p class="answer">A <strong>' + num(kw, 1) + ' kW</strong> system in ' + esc(city.name) + ' costs you about <strong>' + rs(r.netCost) + '</strong> after the government subsidy. It saves about <strong>' + rs(r.savingMonthly) + ' a month</strong> and pays for itself in <strong>' + yearsText(r.paybackYears) + '</strong>.</p>';
    var tiles = form.dataset.mode === 'generation'
      ? tile('Units per day', num(r.generationPerDay, 1), true) + tile('Units per month', num(r.generationPerMonth)) + tile('Saves per month', rs(r.savingMonthly))
      : tile('You pay (after subsidy)', rs(r.netCost), true) + tile('You save every month', rs(r.savingMonthly)) + tile('Money back in', yearsText(r.paybackYears));
    var gujarat = city.state === 'Gujarat'
      ? '<p class="note">Live in Gujarat? Our <a href="solar-rooftop-calculator-gujarat.html?units=' + (units || 300) + '&kw=' + kw + '">Gujarat calculator</a> uses your electricity company\'s exact rates.</p>' : '';

    out.innerHTML = answer +
      '<div class="kpis three">' + tiles + '</div>' + fit + workings(r, units, rate, f.exportRate || india.defaultExportRate) +
      more('See the full cost breakdown',
        '<div class="table-wrap"><table><tbody>' +
          '<tr><td>System price (' + num(kw, 1) + ' kW)</td><td class="num">' + rs(r.cost) + '</td></tr>' +
          '<tr class="minus"><td>Government subsidy (PM Surya Ghar)</td><td class="num">−' + rs(r.subsidy) + '</td></tr>' +
          '<tr class="total"><td>You pay</td><td class="num">' + rs(r.netCost) + '</td></tr>' +
          '<tr><td>Solar panels</td><td class="num">' + r.panels + ' panels</td></tr>' +
          '<tr><td>Roof space needed</td><td class="num">about ' + num(r.roofSqft) + ' sq ft</td></tr>' +
          '<tr><td>Total saving over 25 years (after cost)</td><td class="num">' + rs(r.lifetimeNet) + '</td></tr>' +
        '</tbody></table></div>') +
      more('See month by month',
        '<div class="table-wrap"><table><thead><tr><th>Month</th><th class="num">Units a day</th><th class="num">Units in month</th><th class="num">Saving</th></tr></thead><tbody>' + monthRows + '</tbody></table></div>' +
        '<p class="note">Less in the rainy months, most in March to May.</p>') +
      gujarat;
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
