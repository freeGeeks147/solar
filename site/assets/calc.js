/*
 * Calculation engine: electricity bill, rooftop solar ROI and EV charging cost.
 * Pure functions with no DOM access. Runs in the browser (window.SolarCalc) and in Node (require) for tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SolarCalc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function round2(x) { return Math.round(x * 100) / 100; }

  // ---------- Tariff lookup ----------

  function getDiscom(data, discomId) {
    var d = data.discoms.find(function (x) { return x.id === discomId; });
    if (!d) throw new Error('Unknown DISCOM: ' + discomId);
    return d;
  }

  function getTariff(data, discomId, category) {
    var discom = getDiscom(data, discomId);
    var group = data.tariffGroups[discom.tariffGroup];
    var cat = group.categories[category] || group.categories.urban;
    var catKey = group.categories[category] ? category : 'urban';
    var dutyKey = cat.dutyKey || catKey;
    return {
      discom: discom,
      group: group,
      category: catKey,
      cat: cat,
      fppa: group.fppaPerUnit,
      dutyPct: data.common.electricityDutyPct[dutyKey],
      categories: Object.keys(group.categories)
    };
  }

  // ---------- Bill components ----------

  function fixedCharge(fixed, loadKw, phase) {
    if (fixed.type === 'flat') return fixed.amount;
    if (fixed.type === 'byPhase') {
      var three = phase === 'three' || loadKw > fixed.singlePhaseMaxKw;
      return three ? fixed.three : fixed.single;
    }
    for (var i = 0; i < fixed.steps.length; i++) {
      var s = fixed.steps[i];
      if (s.uptoKw === null || loadKw <= s.uptoKw) return s.amount;
    }
    return fixed.steps[fixed.steps.length - 1].amount;
  }

  // Splits `units` across slabs. `months` scales slab limits for multi-month bills.
  function energyCharge(slabs, units, months) {
    months = months || 1;
    var rows = [];
    var total = 0;
    var prev = 0;
    for (var i = 0; i < slabs.length && units > prev; i++) {
      var upper = slabs[i].upto === null ? Infinity : slabs[i].upto * months;
      var inSlab = Math.min(units, upper) - prev;
      if (inSlab > 0) {
        var amt = inSlab * slabs[i].rate;
        rows.push({ from: prev, to: upper === Infinity ? null : upper, units: inSlab, rate: slabs[i].rate, amount: amt });
        total += amt;
      }
      prev = upper;
    }
    return { total: total, rows: rows };
  }

  /*
   * opts: { discom, category, loadKw, phase, units, months, fppa, meter, solarHoursPct, solarHoursUnits }
   * meter: 'postpaid' | 'postpaid-smart' | 'prepaid-smart'
   */
  function calcBill(data, opts) {
    var t = getTariff(data, opts.discom, opts.category || 'urban');
    var months = opts.months || 1;
    var units = Math.max(0, Number(opts.units) || 0);
    var fppaRate = opts.fppa != null && opts.fppa !== '' ? Number(opts.fppa) : t.fppa;
    var meter = opts.meter || 'postpaid';
    var smart = meter === 'postpaid-smart' || meter === 'prepaid-smart';

    var fixed = fixedCharge(t.cat.fixed, Number(opts.loadKw) || 1, opts.phase) * months;
    var energy = energyCharge(t.cat.slabs, units, months);
    var fppa = units * fppaRate;
    var prepaidRebate = meter === 'prepaid-smart' ? energy.total * data.common.prepaidRebatePctOnEnergy / 100 : 0;

    var solarHoursUnits = 0;
    if (smart) {
      solarHoursUnits = opts.solarHoursUnits != null
        ? Math.min(units, Math.max(0, opts.solarHoursUnits))
        : units * (Number(opts.solarHoursPct) || 0) / 100;
    }
    var touDiscount = solarHoursUnits * data.common.tou.solarHoursDiscountPerUnit;

    var dutyBase = Math.max(0, fixed + energy.total + fppa - prepaidRebate - touDiscount);
    var duty = dutyBase * t.dutyPct / 100;
    var total = dutyBase + duty;

    return {
      tariff: t,
      units: units,
      months: months,
      fixed: fixed,
      energy: energy.total,
      slabRows: energy.rows,
      fppaRate: fppaRate,
      fppa: fppa,
      prepaidRebate: prepaidRebate,
      touDiscount: touDiscount,
      solarHoursUnits: solarHoursUnits,
      dutyPct: t.dutyPct,
      duty: duty,
      total: total,
      effectiveRate: units > 0 ? total / units : 0
    };
  }

  // Cost of the next unit at the current consumption level (Rs/kWh), ignoring ToU.
  function marginalRate(data, opts) {
    var base = Object.assign({}, opts, { solarHoursPct: 0, solarHoursUnits: null });
    var a = calcBill(data, base).total;
    var b = calcBill(data, Object.assign({}, base, { units: (Number(opts.units) || 0) + 1 })).total;
    return b - a;
  }

  // Inverts calcBill: units that produce `amount`. Bill is monotonic in units.
  function unitsFromBill(data, opts, amount) {
    var lo = 0, hi = 100000;
    if (calcBill(data, Object.assign({}, opts, { units: 0 })).total >= amount) return 0;
    for (var i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2;
      if (calcBill(data, Object.assign({}, opts, { units: mid })).total < amount) lo = mid; else hi = mid;
    }
    return Math.round((lo + hi) / 2);
  }

  // ---------- Rooftop solar ----------

  function pmSuryaGharSubsidy(common, kw) {
    var s = common.pmSuryaGhar;
    var first = Math.min(kw, 2) * s.perKwFirst2;
    var third = Math.max(0, Math.min(kw, 3) - 2) * s.perKwThird;
    return Math.min(first + third, s.cap);
  }

  function recommendKw(common, o) {
    var annualUnits = o.units * 12;
    var kw = annualUnits / o.yieldKwhPerKwYear;
    if (o.roofSqft > 0) kw = Math.min(kw, o.roofSqft / common.solarDefaults.sqftPerKw);
    if (o.loadKw > 0) kw = Math.min(kw, o.loadKw);
    kw = Math.floor(kw * 2) / 2; // 0.5 kW steps
    return Math.max(1, kw);
  }

  function emi(principal, ratePct, years) {
    if (principal <= 0) return 0;
    var r = ratePct / 1200, n = years * 12;
    if (r === 0) return principal / n;
    return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  }

  function irr(cashflows) {
    function npv(rate) {
      return cashflows.reduce(function (acc, cf, i) { return acc + cf / Math.pow(1 + rate, i); }, 0);
    }
    var lo = -0.99, hi = 1.0;
    if (npv(lo) * npv(hi) > 0) return null;
    for (var i = 0; i < 200; i++) {
      var mid = (lo + hi) / 2;
      if (npv(mid) > 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /*
   * opts: bill opts (discom, category, loadKw, phase, units, fppa, meter, solarHoursPct)
   *   + yieldKwhPerKwYear, kw (optional; auto if empty), roofSqft, costPerKw, escalationPct,
   *     degradationPct, surplusRate, lifeYears, loan: { enabled, sharePct, ratePct, years }
   */
  function solarRoi(data, common, opts) {
    var d = common.solarDefaults;
    var share = data.solarMonthlyShare;
    var yieldY = Number(opts.yieldKwhPerKwYear);
    var kw = Number(opts.kw) > 0 ? Number(opts.kw) : recommendKw(common, {
      units: Number(opts.units) || 0, yieldKwhPerKwYear: yieldY,
      roofSqft: Number(opts.roofSqft) || 0, loadKw: Number(opts.loadKw) || 0
    });
    var costPerKw = Number(opts.costPerKw) || d.costPerKw;
    var esc = (opts.escalationPct != null ? Number(opts.escalationPct) : d.tariffEscalationPctPerYear) / 100;
    var deg = (opts.degradationPct != null ? Number(opts.degradationPct) : d.degradationPctPerYear) / 100;
    var surplusRate = opts.surplusRate != null ? Number(opts.surplusRate) : data.common.netMetering.surplusRatePerUnit;
    var life = Number(opts.lifeYears) || d.lifeYears;
    var units = Number(opts.units) || 0;

    var billBefore = calcBill(data, opts).total;

    var gross = kw * costPerKw;
    var subsidy = pmSuryaGharSubsidy(common, kw);
    var netCost = Math.max(0, gross - subsidy);

    var years = [];
    var cashflows = [-netCost];
    var cumulative = -netCost;
    var payback = null;
    var totalGen = 0;
    var firstYearMonths = [];

    for (var y = 1; y <= life; y++) {
      var genFactor = Math.pow(1 - deg, y - 1);
      var escFactor = Math.pow(1 + esc, y - 1);
      var gen = 0, billSave = 0, exportIncome = 0, exportUnits = 0;
      for (var m = 0; m < 12; m++) {
        var g = kw * yieldY * share[m] * genFactor;
        var net = units - g;
        var after = calcBill(data, Object.assign({}, opts, { units: Math.max(0, net), solarHoursPct: 0, solarHoursUnits: null })).total;
        var surplus = Math.max(0, -net);
        var saving = (billBefore - after) * escFactor;
        gen += g;
        billSave += saving;
        exportUnits += surplus;
        exportIncome += surplus * surplusRate;
        if (y === 1) firstYearMonths.push({ month: m, generation: g, billAfter: after, surplus: surplus, saving: saving + surplus * surplusRate });
      }
      var total = billSave + exportIncome;
      totalGen += gen;
      var prevCum = cumulative;
      cumulative += total;
      if (payback === null && cumulative >= 0) payback = (y - 1) + (-prevCum) / total;
      cashflows.push(total);
      years.push({ year: y, generation: gen, billSaving: billSave, exportUnits: exportUnits, exportIncome: exportIncome, saving: total, cumulative: cumulative });
    }
    if (netCost === 0) payback = 0;

    var y1 = years[0];
    var avgBillAfter = firstYearMonths.reduce(function (a, x) { return a + x.billAfter; }, 0) / 12;

    var loan = null;
    if (opts.loan && opts.loan.enabled) {
      var principal = netCost * (Number(opts.loan.sharePct) || 0) / 100;
      var rate = Number(opts.loan.ratePct) || d.loanRatePct;
      var tenure = Number(opts.loan.years) || d.loanTenureYears;
      var monthlyEmi = emi(principal, rate, tenure);
      loan = {
        principal: principal,
        downPayment: netCost - principal,
        ratePct: rate,
        years: tenure,
        emi: monthlyEmi,
        totalInterest: monthlyEmi * tenure * 12 - principal,
        monthlySavingYear1: y1.saving / 12,
        netMonthlyYear1: y1.saving / 12 - monthlyEmi
      };
    }

    return {
      kw: kw,
      yieldKwhPerKwYear: yieldY,
      roofSqftNeeded: kw * d.sqftPerKw,
      grossCost: gross,
      subsidy: subsidy,
      netCost: netCost,
      billBefore: billBefore,
      avgBillAfter: avgBillAfter,
      generationYear1: y1.generation,
      generationMonthlyAvg: y1.generation / 12,
      savingYear1: y1.saving,
      savingMonthlyYear1: y1.saving / 12,
      exportUnitsYear1: y1.exportUnits,
      exportIncomeYear1: y1.exportIncome,
      paybackYears: payback,
      lifetimeSaving: cumulative + netCost,
      lifetimeNet: cumulative,
      irr: irr(cashflows),
      co2Tonnes: totalGen * d.co2KgPerKwh / 1000,
      totalGeneration: totalGen,
      years: years,
      months: firstYearMonths,
      loan: loan
    };
  }

  // ---------- EV charging ----------

  /*
   * opts: bill opts for the household (discom, category, loadKw, phase, units, fppa, meter, solarHoursPct)
   *   + kwhPerKm, kmPerMonth, split: { homeDay, homeNight, public } (percent),
   *     publicRate, chargingLossPct, solarSurplusKwh (monthly surplus available in the day),
   *     surplusRate, ice: { pricePerUnit, kmPerUnit }, years, batteryDegradationPct
   */
  function evCost(data, common, opts) {
    var ev = common.evDefaults;
    var lossPct = opts.chargingLossPct != null ? Number(opts.chargingLossPct) : ev.chargingLossPct;
    var batteryKwh = Number(opts.kwhPerKm) * Number(opts.kmPerMonth);
    var gridKwh = batteryKwh / (1 - lossPct / 100); // energy drawn from the wall
    var surplusRate = opts.surplusRate != null ? Number(opts.surplusRate) : data.common.netMetering.surplusRatePerUnit;
    var publicRate = Number(opts.publicRate) || ev.publicChargerPerKwh;
    var units = Number(opts.units) || 0;
    var smart = opts.meter === 'postpaid-smart' || opts.meter === 'prepaid-smart';
    var baseSolarUnits = smart ? units * (Number(opts.solarHoursPct) || 0) / 100 : 0;
    var baseBill = calcBill(data, Object.assign({}, opts, { solarHoursUnits: baseSolarUnits })).total;

    function scenario(split) {
      var sum = (split.homeDay || 0) + (split.homeNight || 0) + (split.public || 0);
      if (sum <= 0) sum = 100;
      var dayKwh = gridKwh * (split.homeDay || 0) / sum;
      var nightKwh = gridKwh * (split.homeNight || 0) / sum;
      var publicKwh = batteryKwh * (split.public || 0) / sum; // public chargers bill delivered energy
      var solarKwh = Math.min(dayKwh, Math.max(0, Number(opts.solarSurplusKwh) || 0));
      var dayGridKwh = dayKwh - solarKwh;
      var withEv = calcBill(data, Object.assign({}, opts, {
        units: units + dayGridKwh + nightKwh,
        solarHoursUnits: baseSolarUnits + dayGridKwh
      })).total;
      var homeGridCost = withEv - baseBill;
      var solarCost = solarKwh * surplusRate; // export income given up
      var publicCost = publicKwh * publicRate;
      var total = homeGridCost + solarCost + publicCost;
      return {
        homeGridCost: homeGridCost, solarCost: solarCost, publicCost: publicCost, total: total,
        solarKwh: solarKwh, solarOffsetPct: dayKwh + nightKwh + publicKwh > 0 ? solarKwh / (dayKwh + nightKwh + publicKwh) * 100 : 0,
        perKm: Number(opts.kmPerMonth) > 0 ? total / Number(opts.kmPerMonth) : 0
      };
    }

    var mix = scenario(opts.split || { homeNight: 100 });
    var scenarios = {
      homeNight: scenario({ homeNight: 100 }),
      homeDay: scenario({ homeDay: 100 }),
      public: scenario({ public: 100 })
    };
    var best = Object.keys(scenarios).reduce(function (a, k) { return scenarios[k].total < scenarios[a].total ? k : a; }, 'homeNight');

    var iceMonthly = opts.ice && opts.ice.kmPerUnit > 0
      ? Number(opts.kmPerMonth) / opts.ice.kmPerUnit * opts.ice.pricePerUnit : 0;

    var nYears = Number(opts.years) || ev.years;
    var degr = (opts.batteryDegradationPct != null ? Number(opts.batteryDegradationPct) : ev.batteryDegradationPctPerYear) / 100;
    var evTotal = 0, iceTotal = 0;
    for (var y = 0; y < nYears; y++) {
      // a degraded pack needs more charging sessions; approximated as proportionally higher energy cost
      evTotal += mix.total * 12 / Math.pow(1 - degr, y);
      iceTotal += iceMonthly * 12;
    }

    return {
      batteryKwh: batteryKwh,
      gridKwh: gridKwh,
      mix: mix,
      scenarios: scenarios,
      best: best,
      marginalRate: marginalRate(data, opts),
      iceMonthly: iceMonthly,
      savingMonthly: iceMonthly - mix.total,
      years: nYears,
      evTotal: evTotal,
      iceTotal: iceTotal,
      savingTotal: iceTotal - evTotal
    };
  }

  return {
    round2: round2,
    getDiscom: getDiscom,
    getTariff: getTariff,
    fixedCharge: fixedCharge,
    energyCharge: energyCharge,
    calcBill: calcBill,
    marginalRate: marginalRate,
    unitsFromBill: unitsFromBill,
    pmSuryaGharSubsidy: pmSuryaGharSubsidy,
    recommendKw: recommendKw,
    emi: emi,
    irr: irr,
    solarRoi: solarRoi,
    evCost: evCost
  };
});
