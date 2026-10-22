/* UI bindings for the bill, solar, EV and system-size calculators, in English or Hindi
 * (from <html lang>). Data comes from assets/data.js (window.SITE_DATA). */
(function () {
  'use strict';
  var C = window.SolarCalc;
  var D = window.SITE_DATA;
  var data = D.gujarat;
  var common = D.common;
  var india = D.india;
  var HI = document.documentElement.lang === 'hi';
  function t(en, hi) { return HI ? hi : en; }

  var inr0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  var inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function rs(x) { return '₹' + inr0.format(Math.round(x)); }
  function rs2(x) { return '₹' + inr2.format(x); }
  function num(x, d) { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: d || 0 }).format(x); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var MONTHS = HI
    ? ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सित', 'अक्टू', 'नव', 'दिस']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var U = t('units', 'यूनिट');

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
    var unitsRadio = form.querySelector('input[name="inputMode"][value="units"]');
    if (unitsRadio && q.has('units') && !q.has('inputMode') && !q.has('bill') && !q.has('amount')) unitsRadio.checked = true;
  }

  function setCategories(form) {
    var sel = form.elements.category;
    if (!sel) return;
    var tf = C.getTariff(data, form.elements.discom.value, 'urban');
    var current = sel.value;
    sel.innerHTML = tf.categories.map(function (k) {
      var c = tf.group.categories[k];
      return '<option value="' + k + '">' + esc(HI && c.labelHi ? c.labelHi : c.label) + '</option>';
    }).join('');
    sel.value = tf.categories.indexOf(current) >= 0 ? current : 'urban';
  }

  // FPPPA and duty are prefilled with estimates until the user types their own bill's figure.
  function setChargeDefaults(form) {
    var tf = C.getTariff(data, form.elements.discom.value, form.elements.category ? form.elements.category.value : 'urban');
    var f = form.elements.fppa, d = form.elements.dutyPct;
    if (f && !f.dataset.touched) f.value = tf.fppa.toFixed(2);
    if (d && !d.dataset.touched) d.value = tf.dutyPct;
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
    var w = 520, h = 170, pad = 24, n = values.length;
    var max = Math.max.apply(null, values.map(Math.abs).concat([1]));
    var min = Math.min.apply(null, values.concat([0]));
    var span = (max - Math.min(min, 0)) || 1;
    var zeroY = pad + (h - 2 * pad) * (Math.max.apply(null, values.concat([0])) / span);
    var bw = (w - 2 * pad) / n;
    var bars = values.map(function (v, i) {
      var y = v >= 0 ? zeroY - (v / span) * (h - 2 * pad) : zeroY;
      var bh = Math.abs(v / span) * (h - 2 * pad);
      var color = v >= 0 ? 'var(--good)' : 'var(--sun)';
      var label = labels[i] && (n <= 12 || i % 5 === 0 || i === n - 1)
        ? '<text x="' + (pad + i * bw + bw / 2) + '" y="' + (h - 6) + '" text-anchor="middle">' + labels[i] + '</text>' : '';
      return '<rect x="' + (pad + i * bw + 1) + '" y="' + y + '" width="' + Math.max(1, bw - 2) + '" height="' + Math.max(0.5, bh) + '" fill="' + color + '" rx="2"><title>' + esc(labels[i] + ': ' + (opts.fmt ? opts.fmt(v) : v)) + '</title></rect>' + label;
    }).join('');
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(opts.title || 'chart') + '">' +
      '<line x1="' + pad + '" x2="' + (w - pad) + '" y1="' + zeroY + '" y2="' + zeroY + '" stroke="var(--border)"/>' + bars + '</svg>';
  }

  // ---------- Plain-language helpers ----------

  // 3.67 -> "3 years 8 months" / "3 साल 8 महीने"
  function yearsText(y) {
    if (y === null || y === undefined) return t('more than 25 years', '25 साल से ज़्यादा');
    var whole = Math.floor(y), months = Math.round((y - whole) * 12);
    if (months === 12) { whole += 1; months = 0; }
    var parts = [];
    if (whole) parts.push(whole + ' ' + t(whole === 1 ? 'year' : 'years', 'साल'));
    if (months) parts.push(months + ' ' + t(months === 1 ? 'month' : 'months', 'महीने'));
    return parts.join(' ') || t('less than a month', 'एक महीने से कम');
  }

  function tile(label, value, hero) {
    return '<div class="kpi' + (hero ? ' hero' : '') + '"><div class="k">' + label + '</div><div class="v">' + value + '</div></div>';
  }

  function more(summary, inner) {
    return '<details class="more"><summary>' + summary + '</summary>' + inner + '</details>';
  }

  function estTag(form, name) {
    return isEstimate(form, name) ? ' <span class="est" title="' + t('Typical value. Enter the figure from your bill.', 'सामान्य मान। अपने बिल का आंकड़ा भरें।') + '">' + t('est.', 'अनुमान') + '</span>' : '';
  }

  var RESULT_NOTE = '<p class="result-disclaimer">' + t('Estimate for information only, based on public information. Not official.', 'केवल जानकारी के लिए अनुमान, सार्वजनिक जानकारी पर आधारित। आधिकारिक नहीं।') + '</p>';

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
    var period = o.months === 2 ? t('for 2 months', '2 महीने का') : t('for the month', 'एक महीने का');
    var rows = b.slabRows.map(function (r, i) {
      var label = i === 0 ? t('First ' + num(r.units) + ' units', 'पहली ' + num(r.units) + ' यूनिट')
        : r.to === null ? t(num(r.units) + ' units above ' + num(r.from), num(r.from) + ' से ऊपर की ' + num(r.units) + ' यूनिट')
          : t('Next ' + num(r.units) + ' units', 'अगली ' + num(r.units) + ' यूनिट');
      return '<tr><td>' + label + ' @ ' + rs2(r.rate) + '</td><td class="num">' + rs(r.amount) + '</td></tr>';
    }).join('');

    var smartLine = '';
    if (o.meter === 'postpaid') {
      var smart = C.calcBill(data, Object.assign({}, o, { meter: 'prepaid-smart', solarHoursPct: 30 }));
      smartLine = '<p class="tip"><strong>' + t('Tip:', 'सुझाव:') + '</strong> ' +
        t('with a prepaid smart meter, and running some appliances between 11 am and 5 pm, this bill would be about ' + rs(smart.total) + ' (you save ' + rs(b.total - smart.total) + ').',
          'प्रीपेड स्मार्ट मीटर हो और कुछ उपकरण सुबह 11 से शाम 5 बजे के बीच चलाएँ, तो यह बिल लगभग ' + rs(smart.total) + ' होगा (' + rs(b.total - smart.total) + ' की बचत)।') + '</p>';
    }
    var estimate = isEstimate(form, 'fppa') || isEstimate(form, 'dutyPct');
    var answer = byBill
      ? t('A bill of ' + rs(b.total) + ' means you used about <strong>' + num(b.units) + ' units</strong>. ', rs(b.total) + ' के बिल का मतलब है लगभग <strong>' + num(b.units) + ' यूनिट</strong> खर्च। ')
      : t('Your bill: <strong>' + rs(b.total) + '</strong> ' + period + '. ', 'आपका बिल: ' + period + ' <strong>' + rs(b.total) + '</strong>। ');
    answer += t('That is about <strong>' + rs2(b.effectiveRate) + ' per unit</strong> once all charges are added.', 'सभी चार्ज मिलाकर यह लगभग <strong>' + rs2(b.effectiveRate) + ' प्रति यूनिट</strong> पड़ता है।');

    out.innerHTML =
      '<p class="answer">' + answer + '</p>' +
      '<div class="kpis three">' +
        tile(o.months === 2 ? t('Bill (2 months)', 'बिल (2 महीने)') : t('Bill (1 month)', 'बिल (1 महीना)'), rs(b.total), true) +
        tile(t('Average cost per unit', 'औसत प्रति यूनिट'), rs2(b.effectiveRate)) +
        tile(t('Each extra unit costs', 'हर अतिरिक्त यूनिट'), rs2(marginal)) +
      '</div>' +
      '<h3>' + t('What you pay for', 'आप किसके पैसे देते हैं') + '</h3>' +
      '<div class="table-wrap"><table><tbody>' +
        rows +
        '<tr><td>' + t('Fixed charge', 'फ़िक्स्ड चार्ज') + '</td><td class="num">' + rs(b.fixed) + '</td></tr>' +
        '<tr><td>' + t('Fuel surcharge (FPPPA)', 'ईंधन सरचार्ज (FPPPA)') + estTag(form, 'fppa') + '</td><td class="num">' + rs(b.fppa) + '</td></tr>' +
        (b.prepaidRebate ? '<tr class="minus"><td>' + t('Prepaid meter discount', 'प्रीपेड मीटर छूट') + '</td><td class="num">−' + rs(b.prepaidRebate) + '</td></tr>' : '') +
        (b.touDiscount ? '<tr class="minus"><td>' + t('Daytime (11 am–5 pm) discount', 'दिन (11 से 5 बजे) की छूट') + '</td><td class="num">−' + rs(b.touDiscount) + '</td></tr>' : '') +
        '<tr><td>' + t('Government tax (electricity duty ' + b.dutyPct + '%)', 'सरकारी टैक्स (बिजली शुल्क ' + b.dutyPct + '%)') + estTag(form, 'dutyPct') + '</td><td class="num">' + rs(b.duty) + '</td></tr>' +
        '<tr class="total"><td>' + t('Total', 'कुल') + '</td><td class="num">' + rs(b.total) + '</td></tr>' +
      '</tbody></table></div>' +
      (estimate ? '<p class="note"><span class="est">' + t('est.', 'अनुमान') + '</span> ' + t('= our estimate. For an exact match, copy these two numbers from your bill into the form.', '= हमारा अनुमान। सटीक जवाब के लिए ये दो आंकड़े अपने बिल से फ़ॉर्म में भरें।') + '</p>' : '') +
      smartLine + RESULT_NOTE +
      '<a class="cta" href="' + link('solar-rooftop-calculator-gujarat.html', {
        discom: o.discom, category: o.category, units: Math.round(b.units / o.months), loadKw: f.loadKw,
        fppa: isEstimate(form, 'fppa') ? '' : f.fppa, dutyPct: isEstimate(form, 'dutyPct') ? '' : f.dutyPct
      }) + '">' + t('How much would solar save on this bill? →', 'इस बिल पर सोलर से कितनी बचत होगी? →') + '</a>';
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
      var ahead = r.loan.netMonthlyYear1 >= 0;
      loanHtml = '<div class="workings"><h3>' + t('With a loan', 'लोन के साथ') + '</h3><p>' +
        t('You pay <strong>' + rs(r.loan.downPayment) + '</strong> upfront and an EMI of <strong>' + rs(r.loan.emi) + ' a month</strong> for ' + r.loan.years + ' years. ',
          'आप शुरू में <strong>' + rs(r.loan.downPayment) + '</strong> देंगे और ' + r.loan.years + ' साल तक <strong>' + rs(r.loan.emi) + ' महीने</strong> की EMI। ') +
        (ahead ? t('Your bill saving is bigger than the EMI, so you are <strong>' + rs(r.loan.netMonthlyYear1) + ' a month ahead</strong> from day one.', 'आपकी बिल बचत EMI से ज़्यादा है, इसलिए पहले दिन से आप हर महीने <strong>' + rs(r.loan.netMonthlyYear1) + ' फ़ायदे</strong> में हैं।')
          : t('The EMI is ' + rs(-r.loan.netMonthlyYear1) + ' a month more than your bill saving until the loan ends.', 'लोन ख़त्म होने तक EMI आपकी बिल बचत से ' + rs(-r.loan.netMonthlyYear1) + ' महीना ज़्यादा है।')) + '</p></div>';
    }

    var cumul = r.years.map(function (y) { return y.cumulative; });
    var esc_ = o.escalationPct != null ? o.escalationPct : common.solarDefaults.tariffEscalationPctPerYear;
    out.innerHTML =
      '<p class="answer">' + t(
        'A <strong>' + num(r.kw, 1) + ' kW</strong> system costs you about <strong>' + rs(r.netCost) + '</strong> after the government subsidy. Your bill drops from ' + rs(r.billBefore) + ' to about <strong>' + rs(r.avgBillAfter) + ' a month</strong>, and the system pays for itself in <strong>' + yearsText(r.paybackYears) + '</strong>.',
        '<strong>' + num(r.kw, 1) + ' kW</strong> सिस्टम सरकारी सब्सिडी के बाद लगभग <strong>' + rs(r.netCost) + '</strong> का पड़ेगा। आपका बिल ' + rs(r.billBefore) + ' से घटकर लगभग <strong>' + rs(r.avgBillAfter) + ' महीना</strong> हो जाएगा, और <strong>' + yearsText(r.paybackYears) + '</strong> में पूरा पैसा वापस।') + '</p>' +
      '<div class="kpis">' +
        tile(t('You pay (after subsidy)', 'आप देंगे (सब्सिडी के बाद)'), rs(r.netCost), true) +
        tile(t('You save every month', 'हर महीने बचत'), rs(r.savingMonthlyYear1)) +
        tile(t('Money back in', 'पैसा वापस'), yearsText(r.paybackYears)) +
        tile(t('Solar size', 'सोलर साइज़'), num(r.kw, 1) + ' kW') +
        tile(t('Bill now', 'अभी का बिल'), rs(r.billBefore)) +
        tile(t('Bill with solar', 'सोलर के बाद बिल'), rs(r.avgBillAfter)) +
      '</div>' +
      loanHtml +
      more(t('See the full cost breakdown', 'पूरा खर्च देखें'),
        '<div class="table-wrap"><table><tbody>' +
          '<tr><td>' + t('System price', 'सिस्टम की कीमत') + ' (' + num(r.kw, 1) + ' kW)</td><td class="num">' + rs(r.grossCost) + '</td></tr>' +
          '<tr class="minus"><td>' + t('Government subsidy (PM Surya Ghar)', 'सरकारी सब्सिडी (पीएम सूर्य घर)') + '</td><td class="num">−' + rs(r.subsidy) + '</td></tr>' +
          '<tr class="total"><td>' + t('You pay', 'आप देंगे') + '</td><td class="num">' + rs(r.netCost) + '</td></tr>' +
          '<tr><td>' + t('Electricity made in a year', 'साल में बनी बिजली') + '</td><td class="num">' + num(r.generationYear1) + ' ' + U + '</td></tr>' +
          '<tr><td>' + t('Extra units sold to the grid', 'ग्रिड को बेची अतिरिक्त यूनिट') + '</td><td class="num">' + num(r.exportUnitsYear1) + ' ' + U + ' = ' + rs(r.exportIncomeYear1) + '</td></tr>' +
          '<tr><td>' + t('Total saving over 25 years (after cost)', '25 साल में कुल बचत (खर्च घटाकर)') + '</td><td class="num">' + rs(r.lifetimeNet) + '</td></tr>' +
          '<tr><td>' + t('Roof space needed', 'ज़रूरी छत') + '</td><td class="num">' + t('about ', 'लगभग ') + num(r.roofSqftNeeded) + t(' sq ft', ' वर्ग फ़ुट') + '</td></tr>' +
        '</tbody></table></div>') +
      more(t('See your saving grow year by year', 'साल-दर-साल बचत देखें'),
        svgBars(cumul, r.years.map(function (y) { return (HI ? 'सा' : 'Y') + y.year; }), { fmt: rs, title: t('Money saved minus cost, by year', 'हर साल: बचत घटा खर्च') }) +
        '<p class="note">' + t('Orange bars: still paying back. Green bars: pure profit.', 'नारंगी: पैसा अभी वापस आ रहा है। हरा: शुद्ध फ़ायदा।') + '</p>') +
      more(t('See month by month', 'महीने के अनुसार देखें'),
        '<div class="table-wrap"><table><thead><tr><th>' + t('Month', 'महीना') + '</th><th class="num">' + t('Units made', 'बनी यूनिट') + '</th><th class="num">' + t('Bill with solar', 'सोलर के बाद बिल') + '</th><th class="num">' + t('Saving', 'बचत') + '</th></tr></thead><tbody>' + monthRows + '</tbody></table></div>') +
      '<p class="note">' + t("Worked out on your company's actual tariff, before and after solar. Assumes electricity prices rise " + esc_ + '% a year. Does not include an inverter replacement (around year 10–12).',
        'सोलर से पहले और बाद, आपकी कंपनी के असली टैरिफ़ पर गणना। बिजली दर हर साल ' + esc_ + '% बढ़ने का अनुमान। इन्वर्टर बदलने का खर्च (लगभग 10–12वें साल) शामिल नहीं।') + '</p>' +
      RESULT_NOTE +
      '<a class="cta" href="' + link('ev-charging-cost-calculator-gujarat.html', {
        discom: o.discom, units: o.units, loadKw: f.loadKw, solarSurplusKwh: Math.round(r.generationMonthlyAvg * 0.3)
      }) + '">' + t('Thinking of an electric vehicle? See the charging cost →', 'इलेक्ट्रिक गाड़ी लेने की सोच रहे हैं? चार्जिंग खर्च देखें →') + '</a>';
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
    var names = {
      homeNight: t('At home (any time)', 'घर पर (कभी भी)'),
      homeDay: t('At home, 11 am–5 pm', 'घर पर, 11 से 5 बजे'),
      public: t('Public fast charger', 'बाहर का फ़ास्ट चार्जर')
    };
    var rows = Object.keys(r.scenarios).map(function (k) {
      var s = r.scenarios[k];
      return '<tr' + (k === r.best ? ' class="best"' : '') + '><td>' + names[k] + (k === r.best ? ' <span class="badge">' + t('cheapest', 'सबसे सस्ता') + '</span>' : '') + '</td><td class="num">' + rs(s.total) + '</td><td class="num">' + rs2(s.perKm) + '</td></tr>';
    }).join('');
    var fuel = { petrol: t('petrol', 'पेट्रोल'), diesel: t('diesel', 'डीज़ल'), cng: 'CNG' }[f.iceType] || f.iceType;

    out.innerHTML =
      '<p class="answer">' + t(
        'Charging costs you about <strong>' + rs(r.mix.total) + ' a month</strong> (' + rs2(r.mix.perKm) + ' per km). A ' + fuel + ' vehicle would cost ' + rs(r.iceMonthly) + ', so you save <strong>' + rs(r.savingMonthly) + ' every month</strong>.',
        'चार्जिंग का खर्च लगभग <strong>' + rs(r.mix.total) + ' महीना</strong> (' + rs2(r.mix.perKm) + ' प्रति किमी)। ' + fuel + ' गाड़ी पर ' + rs(r.iceMonthly) + ' लगते, यानी हर महीने <strong>' + rs(r.savingMonthly) + ' की बचत</strong>।') + '</p>' +
      '<div class="kpis three">' +
        tile(t('Charging cost per month', 'महीने का चार्जिंग खर्च'), rs(r.mix.total), true) +
        tile(t('Cost per km', 'प्रति किमी खर्च'), rs2(r.mix.perKm)) +
        tile(t('You save vs ', 'बचत, तुलना में ') + fuel, rs(r.savingMonthly) + t('/mo', '/माह')) +
      '</div>' +
      '<h3>' + t('Where you charge makes a big difference', 'कहाँ चार्ज करते हैं, इससे बड़ा फ़र्क पड़ता है') + '</h3>' +
      '<div class="table-wrap"><table><thead><tr><th>' + t('If you always charge', 'अगर हमेशा चार्ज करें') + '</th><th class="num">' + t('Per month', 'प्रति माह') + '</th><th class="num">' + t('Per km', 'प्रति किमी') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p>' + t('Over ' + r.years + ' years: EV about <strong>' + rs(r.evTotal) + '</strong>, ' + fuel + ' about <strong>' + rs(r.iceTotal) + '</strong>. You save about <strong>' + rs(r.savingTotal) + '</strong> on fuel.',
        r.years + ' साल में: EV पर लगभग <strong>' + rs(r.evTotal) + '</strong>, ' + fuel + ' पर लगभग <strong>' + rs(r.iceTotal) + '</strong>। ईंधन पर लगभग <strong>' + rs(r.savingTotal) + '</strong> की बचत।') + '</p>' +
      '<p class="note">' + t('Home cost is what charging adds to your electricity bill. Covers fuel and electricity only, not the vehicle price, insurance or servicing.', 'घर का खर्च = चार्जिंग से बिजली बिल में जुड़ी रकम। केवल ईंधन और बिजली; गाड़ी की कीमत, बीमा या सर्विसिंग शामिल नहीं।') + '</p>' +
      RESULT_NOTE;
  }

  // ---------- System size (any state, flat ₹/unit) ----------

  // Step-by-step explanation of the saving, using yearly averages per month.
  function workings(r, units, rate, x) {
    var gen = r.generationPerMonth;
    var surplus = r.months.reduce(function (a, m) { return a + m.surplus; }, 0) / 12;
    var used = gen - surplus;
    var buy = Math.max(0, units - used);
    var steps = [];
    if (units > 0) steps.push(t('Your home uses <strong>' + num(units) + ' units</strong> a month (' + rs(units * rate) + ' at ' + rs2(rate) + ' a unit).', 'आपका घर महीने में <strong>' + num(units) + ' यूनिट</strong> खर्च करता है (' + rs2(rate) + ' प्रति यूनिट पर ' + rs(units * rate) + ')।'));
    steps.push(t('Solar makes about <strong>' + num(gen) + ' units</strong> a month.', 'सोलर महीने में लगभग <strong>' + num(gen) + ' यूनिट</strong> बनाता है।'));
    if (units <= 0) {
      steps.push(t('Every solar unit is counted at ' + rs2(rate) + '. Saving: ' + num(gen) + ' × ' + rs2(rate) + ' = <strong>' + rs(gen * rate) + '</strong>.', 'हर सोलर यूनिट ' + rs2(rate) + ' की मानी गई। बचत: ' + num(gen) + ' × ' + rs2(rate) + ' = <strong>' + rs(gen * rate) + '</strong>।'));
    } else if (surplus < 1) {
      steps.push(t('Your home uses all ' + num(used) + ' solar units, so you buy only <strong>' + num(buy) + ' units</strong> from the electricity company.', 'घर में सारी ' + num(used) + ' सोलर यूनिट इस्तेमाल होती हैं, इसलिए बिजली कंपनी से केवल <strong>' + num(buy) + ' यूनिट</strong> खरीदनी पड़ती हैं।'));
      steps.push(t('Saving: ' + num(used) + ' units × ' + rs2(rate) + ' = <strong>' + rs(used * rate) + ' a month</strong>.', 'बचत: ' + num(used) + ' यूनिट × ' + rs2(rate) + ' = <strong>' + rs(used * rate) + ' महीना</strong>।'));
      steps.push(t('Bill: ' + rs(units * rate) + ' → about <strong>' + rs(buy * rate) + '</strong>.', 'बिल: ' + rs(units * rate) + ' → लगभग <strong>' + rs(buy * rate) + '</strong>।'));
    } else {
      if (buy >= 1) steps.push(t('Solar makes more than you use in sunny months and less in the rainy months, so some months have extra units. On average over the year:', 'धूप वाले महीनों में सोलर आपकी खपत से ज़्यादा और बारिश में कम बनाता है, इसलिए कुछ महीनों में यूनिट बचती हैं। साल का औसत:'));
      steps.push(t('Your home uses ' + num(used) + ' of them' + (buy >= 1 ? ' and buys ' + num(buy) + ' units from the company' : ', so you buy almost nothing') + '. The other <strong>' + num(surplus) + ' units</strong> go to the grid, and the company pays about ' + rs2(x) + ' each.',
        'घर में इनमें से ' + num(used) + ' यूनिट इस्तेमाल होती हैं' + (buy >= 1 ? ' और कंपनी से ' + num(buy) + ' यूनिट खरीदी जाती हैं' : ', यानी लगभग कुछ नहीं खरीदना पड़ता') + '। बाकी <strong>' + num(surplus) + ' यूनिट</strong> ग्रिड में जाती हैं, जिन पर कंपनी लगभग ' + rs2(x) + ' प्रति यूनिट देती है।'));
      steps.push(t('Saving: ', 'बचत: ') + num(used) + ' × ' + rs2(rate) + ' + ' + num(surplus) + ' × ' + rs2(x) + ' = <strong>' + rs(used * rate + surplus * x) + t(' a month', ' महीना') + '</strong>' + t('.', '।'));
      steps.push(t('Bill: ' + rs(units * rate) + ' → about <strong>' + rs(buy * rate) + '</strong> plus small fixed charges.', 'बिल: ' + rs(units * rate) + ' → लगभग <strong>' + rs(buy * rate) + '</strong> और थोड़ा फ़िक्स्ड चार्ज।'));
    }
    return '<div class="workings"><h3>' + t('How we worked it out', 'हमने कैसे निकाला') + '</h3><ol>' + steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' +
      '<p class="note">' + t('Units your home uses save the full ' + rs2(rate) + '. Extra units sold to the grid earn only about ' + rs2(x) + ', so a system that makes about as much as you use pays back fastest. Figures are monthly averages over the year.',
        'घर में इस्तेमाल हर यूनिट पूरे ' + rs2(rate) + ' बचाती है। ग्रिड को बेची अतिरिक्त यूनिट पर केवल लगभग ' + rs2(x) + ' मिलते हैं, इसलिए खपत के बराबर बनाने वाला सिस्टम सबसे जल्दी पैसा लौटाता है। आंकड़े साल भर का मासिक औसत हैं।') + '</p></div>';
  }

  function renderSize(form, out) {
    var f = readForm(form);
    var kw = Number(f.kw) || 3;
    var city = india.cities[Number(f.city) || 0];
    var cityName = HI ? city.nameHi : city.name;
    var band = C.sizePrice(india, kw);
    var costEl = form.elements.cost;
    if (costEl && !costEl.dataset.touched) costEl.value = Math.round(band.mid / 1000) * 1000;
    var rate = Number(f.rate) || india.defaultRate;
    var byUnits = f.inputMode === 'units';
    form.querySelector('[data-show="bill"]').classList.toggle('hidden', byUnits);
    form.querySelector('[data-show="units"]').classList.toggle('hidden', !byUnits);
    var units = byUnits ? Number(f.units) || 0 : Math.round((Number(f.bill) || 0) / rate);
    var exportRate = f.exportRate === '' || f.exportRate == null ? india.defaultExportRate : Number(f.exportRate);
    var r = C.solarSimple(india, common, {
      kw: kw, yieldKwhPerKwYear: city.yield, units: units,
      rate: rate, exportRate: exportRate, cost: Number(f.cost) || band.mid
    });
    var monthRows = r.months.map(function (m) {
      return '<tr><td>' + MONTHS[m.month] + '</td><td class="num">' + num(m.perDay, 1) + '</td><td class="num">' + num(m.generation) + '</td><td class="num">' + rs(m.saving) + '</td></tr>';
    }).join('');
    var tooBig = units > 0 && r.generationPerMonth > units * 1.25;
    var tooSmall = units > 0 && r.generationPerMonth < units * 0.6;
    var fit = tooBig ? '<p class="tip"><strong>' + t('Tip:', 'सुझाव:') + '</strong> ' + t(num(kw, 1) + ' kW makes more than your home uses. Extra units earn only about ' + rs2(exportRate) + ' each, so a smaller system may pay back faster.', num(kw, 1) + ' kW आपकी खपत से ज़्यादा बनाता है। अतिरिक्त यूनिट पर केवल लगभग ' + rs2(exportRate) + ' मिलते हैं, इसलिए छोटा सिस्टम जल्दी पैसा लौटा सकता है।') + '</p>'
      : tooSmall ? '<p class="tip"><strong>' + t('Tip:', 'सुझाव:') + '</strong> ' + t(num(kw, 1) + ' kW covers only part of your bill. A bigger system would save more, if your roof has space.', num(kw, 1) + ' kW आपके बिल का केवल कुछ हिस्सा कवर करता है। छत पर जगह हो तो बड़ा सिस्टम ज़्यादा बचाएगा।') + '</p>' : '';

    var gen = form.dataset.mode === 'generation';
    var answer = gen
      ? t('A <strong>' + num(kw, 1) + ' kW</strong> system in ' + esc(cityName) + ' makes about <strong>' + num(r.generationPerDay, 1) + ' units a day</strong>, or ' + num(r.generationPerMonth) + ' units a month. That is worth about <strong>' + rs(r.savingMonthly) + ' off your bill every month</strong>.',
        esc(cityName) + ' में <strong>' + num(kw, 1) + ' kW</strong> सिस्टम रोज़ लगभग <strong>' + num(r.generationPerDay, 1) + ' यूनिट</strong>, यानी महीने में ' + num(r.generationPerMonth) + ' यूनिट बनाता है। इससे बिल हर महीने लगभग <strong>' + rs(r.savingMonthly) + ' कम</strong> होता है।')
      : t('A <strong>' + num(kw, 1) + ' kW</strong> system in ' + esc(cityName) + ' costs you about <strong>' + rs(r.netCost) + '</strong> after the government subsidy. It saves about <strong>' + rs(r.savingMonthly) + ' a month</strong> and pays for itself in <strong>' + yearsText(r.paybackYears) + '</strong>.',
        esc(cityName) + ' में <strong>' + num(kw, 1) + ' kW</strong> सिस्टम सरकारी सब्सिडी के बाद लगभग <strong>' + rs(r.netCost) + '</strong> का पड़ेगा। यह हर महीने लगभग <strong>' + rs(r.savingMonthly) + '</strong> बचाता है और <strong>' + yearsText(r.paybackYears) + '</strong> में पूरा पैसा वापस।');
    var tiles = gen
      ? tile(t('Units per day', 'रोज़ की यूनिट'), num(r.generationPerDay, 1), true) + tile(t('Units per month', 'महीने की यूनिट'), num(r.generationPerMonth)) + tile(t('Saves per month', 'हर महीने बचत'), rs(r.savingMonthly))
      : tile(t('You pay (after subsidy)', 'आप देंगे (सब्सिडी के बाद)'), rs(r.netCost), true) + tile(t('You save every month', 'हर महीने बचत'), rs(r.savingMonthly)) + tile(t('Money back in', 'पैसा वापस'), yearsText(r.paybackYears));
    var gujarat = city.state === 'Gujarat'
      ? '<p class="note">' + t('Live in Gujarat? Our <a href="solar-rooftop-calculator-gujarat.html?units=' + (units || 300) + '&kw=' + kw + '">Gujarat calculator</a> uses your electricity company\'s exact rates.', 'गुजरात में रहते हैं? हमारा <a href="solar-rooftop-calculator-gujarat.html?units=' + (units || 300) + '&kw=' + kw + '">गुजरात कैलकुलेटर</a> आपकी बिजली कंपनी की सटीक दरों से गणना करता है।') + '</p>' : '';

    out.innerHTML = '<p class="answer">' + answer + '</p>' +
      '<div class="kpis three">' + tiles + '</div>' + fit + workings(r, units, rate, exportRate) +
      more(t('See the full cost breakdown', 'पूरा खर्च देखें'),
        '<div class="table-wrap"><table><tbody>' +
          '<tr><td>' + t('System price', 'सिस्टम की कीमत') + ' (' + num(kw, 1) + ' kW)</td><td class="num">' + rs(r.cost) + '</td></tr>' +
          '<tr class="minus"><td>' + t('Government subsidy (PM Surya Ghar)', 'सरकारी सब्सिडी (पीएम सूर्य घर)') + '</td><td class="num">−' + rs(r.subsidy) + '</td></tr>' +
          '<tr class="total"><td>' + t('You pay', 'आप देंगे') + '</td><td class="num">' + rs(r.netCost) + '</td></tr>' +
          '<tr><td>' + t('Solar panels', 'सोलर पैनल') + '</td><td class="num">' + r.panels + ' ' + t('panels', 'पैनल') + '</td></tr>' +
          '<tr><td>' + t('Roof space needed', 'ज़रूरी छत') + '</td><td class="num">' + t('about ', 'लगभग ') + num(r.roofSqft) + t(' sq ft', ' वर्ग फ़ुट') + '</td></tr>' +
          '<tr><td>' + t('Total saving over 25 years (after cost)', '25 साल में कुल बचत (खर्च घटाकर)') + '</td><td class="num">' + rs(r.lifetimeNet) + '</td></tr>' +
        '</tbody></table></div>') +
      more(t('See month by month', 'महीने के अनुसार देखें'),
        '<div class="table-wrap"><table><thead><tr><th>' + t('Month', 'महीना') + '</th><th class="num">' + t('Units a day', 'रोज़ की यूनिट') + '</th><th class="num">' + t('Units in month', 'महीने की यूनिट') + '</th><th class="num">' + t('Saving', 'बचत') + '</th></tr></thead><tbody>' + monthRows + '</tbody></table></div>' +
        '<p class="note">' + t('Less in the rainy months, most in March to May.', 'बारिश के महीनों में कम, मार्च से मई में सबसे ज़्यादा।') + '</p>') +
      gujarat + RESULT_NOTE;
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
      try { render(form, out); } catch (err) { out.innerHTML = '<p class="tip">' + t('Could not calculate: ', 'गणना नहीं हो सकी: ') + esc(err.message) + '</p>'; }
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
