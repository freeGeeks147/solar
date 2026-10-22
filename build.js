#!/usr/bin/env node
/*
 * Static site generator. Reads data/*.json and site.config.json, writes HTML pages,
 * assets/data.js, sitemap.xml and robots.txt into site/. No dependencies.
 *
 *   node build.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./site/assets/calc.js');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'site');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/gujarat.json'), 'utf8'));
const common = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/common.json'), 'utf8'));
const india = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/india.json'), 'utf8'));
const base = cfg.baseUrl.replace(/\/$/, '');
const Y = data.tariffYear;

// ---------- helpers ----------

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const inr = (x) => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(x));
const inr2 = (x) => '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x);
const fmtDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const VERIFY = '<span class="verify" title="Cross-checked from secondary sources; confirm against the GERC schedule">(verify)</span>';

const PAGES = {
  home: 'index.html',
  gujaratBill: 'gujarat-electricity-bill-calculator.html',
  solar: 'solar-rooftop-calculator-gujarat.html',
  ev: 'ev-charging-cost-calculator-gujarat.html',
  subsidy: 'pm-surya-ghar-subsidy-gujarat.html',
  netMetering: 'net-metering-gujarat.html',
  tou: 'smart-meter-tou-tariff-gujarat.html',
  about: 'about.html',
  privacy: 'privacy-policy.html'
};
const discomPage = (d) => d.slug + '.html';
const pricePage = (kw) => `${kw}kw-solar-system-price-in-india.html`;
const genPage = (kw) => `${kw}kw-solar-panel-generation-per-day.html`;

function adSlot(name) {
  if (!cfg.adsenseClient) return '';
  return `<div class="ad-slot" data-slot="${name}"><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(cfg.adsenseClient)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`;
}

function faqHtml(faqs) {
  return `<section class="faq prose"><h2>Frequently asked questions</h2>${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${f.a}</p></details>`).join('')}</section>`;
}

function faqJsonLd(faqs) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') } }))
  };
}

function layout(p) {
  const url = `${base}/${p.file === 'index.html' ? '' : p.file}`;
  const crumbs = p.crumbs || [];
  const graph = [
    { '@type': 'WebPage', name: p.title, url, description: p.description, dateModified: data.lastReviewed },
    crumbs.length ? {
      '@type': 'BreadcrumbList',
      itemListElement: [{ name: 'Home', file: 'index.html' }].concat(crumbs).map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${base}/${c.file === 'index.html' ? '' : c.file}` }))
    } : null,
    p.app ? { '@type': 'WebApplication', name: p.h1, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' }, url } : null,
    p.faqs ? faqJsonLd(p.faqs) : null
  ].filter(Boolean);
  const nav = [
    ['Solar price', PAGES.home],
    ['3kW', pricePage(3)],
    ['5kW', pricePage(5)],
    ['Generation', genPage(3)],
    ['Subsidy', PAGES.subsidy],
    ['Gujarat bill', PAGES.gujaratBill],
    ['EV charging', PAGES.ev]
  ];
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${esc(cfg.siteName)}">
<meta name="theme-color" content="#0f766e">
${cfg.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(cfg.googleSiteVerification)}">\n` : ''}<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='9' fill='%23d97706'/%3E%3C/svg%3E">
<link rel="stylesheet" href="assets/style.css">
${cfg.adsenseClient ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(cfg.adsenseClient)}" crossorigin="anonymous"></script>\n` : ''}<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>
</head>
<body>
<header class="site-header"><div class="wrap">
<a class="logo" href="./">${esc(cfg.siteName.split(' ')[0])}<span>${esc(cfg.siteName.split(' ').slice(1).join(' '))}</span></a>
<nav class="nav" aria-label="Main">${nav.map(([n, f]) => `<a href="${f}"${f === p.file ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</nav>
</div></header>
<main><div class="wrap">
${crumbs.length ? `<div class="crumbs"><a href="./">Home</a>${crumbs.map((c) => ` › ${c.file === p.file ? esc(c.name) : `<a href="${c.file}">${esc(c.name)}</a>`}`).join('')}</div>` : ''}
<h1>${esc(p.h1)}</h1>
${p.lede ? `<p class="lede">${p.lede}</p>` : ''}
${p.body}
</div></main>
<footer class="site-footer"><div class="wrap">
<div class="links">
${india.systemSizes.map((x) => `<a href="${pricePage(x.kw)}">${x.kw}kW solar price</a>`).join('\n')}
</div>
<div class="links">
${india.systemSizes.map((x) => `<a href="${genPage(x.kw)}">${x.kw}kW generation</a>`).join('\n')}
</div>
<div class="links">
${data.discoms.map((d) => `<a href="${discomPage(d)}">${esc(d.name)} bill calculator</a>`).join('\n')}
<a href="${PAGES.tou}">Smart meter ToU discount</a>
<a href="${PAGES.about}">About &amp; sources</a>
<a href="${PAGES.privacy}">Privacy policy</a>
</div>
<p>Prices and generation figures are estimates; get itemised quotes before buying. Gujarat tariffs: GERC ${esc(Y)} orders. Last reviewed ${fmtDate(india.lastReviewed)}. Not affiliated with any DISCOM, installer, brand or government body.</p>
</div></footer>
${p.app ? '<script src="assets/calc.js"></script>\n<script src="assets/data.js"></script>\n<script src="assets/app.js"></script>\n' : ''}</body>
</html>
`;
}

// ---------- form widgets ----------

function discomOptions(selected) {
  return data.discoms.map((d) => `<option value="${d.id}"${d.id === selected ? ' selected' : ''}>${esc(d.name)} (${esc(d.region)})</option>`).join('');
}

function meterField() {
  return `<div class="field"><label for="meter">Meter type</label><select id="meter" name="meter">
<option value="postpaid">Regular meter</option>
<option value="postpaid-smart">Smart meter (pay after use)</option>
<option value="prepaid-smart">Smart meter (prepaid / recharge)</option>
</select></div>
<div class="field" data-show="smart"><label for="solarHoursPct">% of electricity used 11 am–5 pm</label><input id="solarHoursPct" name="solarHoursPct" type="number" min="0" max="100" step="5" value="25"><span class="hint">Smart meters get 60 paise off per unit in these hours</span></div>`;
}

function commonBillFields(discomId, opts = {}) {
  return `<div class="field full"><label for="discom">Your electricity company</label><select id="discom" name="discom">${discomOptions(discomId)}</select></div>
<div class="field"><label for="category">Area</label><select id="category" name="category"></select></div>
<div class="field"><label for="loadKw">Sanctioned load (kW)</label><input id="loadKw" name="loadKw" type="number" min="0.5" step="0.5" value="${opts.loadKw || 3}"><span class="hint">Printed on your bill</span></div>
${meterField()}`;
}

function advancedBillFields() {
  return `<div class="field"><label for="phase">Supply</label><select id="phase" name="phase"><option value="single">Single phase</option><option value="three">Three phase</option></select></div>
${chargeFields()}`;
}

// The two figures we cannot pin down for every consumer. Prefilled with estimates; users overwrite them from their bill.
function chargeFields() {
  return `<div class="field"><label for="fppa">Fuel surcharge per unit (₹)</label><input id="fppa" name="fppa" type="number" min="0" step="0.01" inputmode="decimal"><span class="hint">Shown as FPPPA or FPPAS on your bill</span></div>
<div class="field"><label for="dutyPct">Electricity duty (%)</label><input id="dutyPct" name="dutyPct" type="number" min="0" max="60" step="0.5" inputmode="decimal"><span class="hint">A state tax, shown on your bill</span></div>`;
}

function billForm(discomId) {
  return `<section class="calc">
<form class="card" data-calc="bill" data-output="bill-out" autocomplete="off">
<h2>Your details</h2>
<div class="fields">
${commonBillFields(discomId)}
<div class="field full"><span class="hint" style="font-weight:600">Calculate from</span><div class="seg" role="radiogroup">
<label><input type="radio" name="inputMode" value="units" checked> Units used</label>
<label><input type="radio" name="inputMode" value="amount"> Bill amount</label>
</div></div>
<div class="field" data-show="units"><label for="units">Units used (from your bill)</label><input id="units" name="units" type="number" min="0" step="1" value="${discomId.startsWith('torrent') ? 200 : 400}"></div>
<div class="field hidden" data-show="amount"><label for="amount">Bill amount (₹)</label><input id="amount" name="amount" type="number" min="0" step="10" value="2500"></div>
<div class="field"><label for="months">Billing period</label><select id="months" name="months"><option value="1"${discomId.startsWith('torrent') ? ' selected' : ''}>1 month</option><option value="2"${discomId.startsWith('torrent') ? '' : ' selected'}>2 months</option></select></div>
<fieldset class="from-bill full"><legend>From your bill (optional)</legend>
<p class="hint">We have filled in typical values. For an exact answer, copy these two numbers from your bill.</p>
<div class="fields">${chargeFields()}</div></fieldset>
<details class="adv"><summary>More options</summary><div class="fields"><div class="field"><label for="phase">Supply</label><select id="phase" name="phase"><option value="single">Single phase</option><option value="three">Three phase</option></select></div></div></details>
</div>
</form>
<div class="card" id="bill-out" aria-live="polite"></div>
</section>`;
}

function solarForm() {
  const cities = data.cities.map((c, i) => `<option value="${i}">${esc(c.name)}</option>`).join('');
  const d = common.solarDefaults;
  return `<section class="calc">
<form class="card" data-calc="solar" data-output="solar-out" autocomplete="off">
<h2>Your home</h2>
<div class="fields">
<div class="field"><label for="city">City</label><select id="city" name="city">${cities}</select></div>
<div class="field"><label for="units">Units used per month</label><input id="units" name="units" type="number" min="0" step="10" value="400"><span class="hint">From your bill. Bill for 2 months? Enter half.</span></div>
${commonBillFields(data.cities[0].discom, { loadKw: 4 })}
<div class="field"><label for="roofSqft">Open roof space (sq ft)</label><input id="roofSqft" name="roofSqft" type="number" min="0" step="50" placeholder="optional"></div>
<div class="field"><label for="kw">Solar size (kW)</label><input id="kw" name="kw" type="number" min="0" step="0.5" placeholder="we suggest one"><span class="hint">Leave empty for our suggestion</span></div>
<div class="field"><label for="costPerKw">Price per kW (₹)</label><input id="costPerKw" name="costPerKw" type="number" min="0" step="1000" value="${d.costPerKw}"><span class="hint">Before subsidy. Typical: ₹55,000–65,000</span></div>
<div class="field"><label><input type="checkbox" name="loanEnabled" style="width:auto"> Take a loan</label></div>
<div class="fields full hidden" data-show="loan" style="grid-column:1/-1">
<div class="field"><label for="loanSharePct">Loan % of cost</label><input id="loanSharePct" name="loanSharePct" type="number" min="0" max="100" step="5" value="90"></div>
<div class="field"><label for="loanRate">Interest (% p.a.)</label><input id="loanRate" name="loanRate" type="number" min="0" step="0.1" value="${d.loanRatePct}"></div>
<div class="field"><label for="loanYears">Tenure (years)</label><input id="loanYears" name="loanYears" type="number" min="1" max="20" step="1" value="${d.loanTenureYears}"></div>
</div>
<details class="adv"><summary>Change assumptions</summary><div class="fields">
${advancedBillFields()}
<div class="field"><label for="yield">Yield (kWh/kW/yr)</label><input id="yield" name="yield" type="number" min="800" max="2000" step="10" placeholder="from city"></div>
<div class="field"><label for="surplusRate">Export rate (₹/unit)</label><input id="surplusRate" name="surplusRate" type="number" min="0" step="0.05" value="${data.common.netMetering.surplusRatePerUnit}"></div>
<div class="field"><label for="escalationPct">Tariff rise (%/yr)</label><input id="escalationPct" name="escalationPct" type="number" min="0" step="0.5" value="${d.tariffEscalationPctPerYear}"></div>
<div class="field"><label for="degradationPct">Panel ageing (%/yr)</label><input id="degradationPct" name="degradationPct" type="number" min="0" step="0.1" value="${d.degradationPctPerYear}"></div>
</div></details>
</div>
</form>
<div class="card" id="solar-out" aria-live="polite"></div>
</section>`;
}

function evForm() {
  const ev = common.evDefaults;
  const presets = common.evPresets.map((p) => `<option value="${p.id}"${p.id === 'car-compact-suv' ? ' selected' : ''}>${esc(p.label)}</option>`).join('');
  return `<section class="calc">
<form class="card" data-calc="ev" data-output="ev-out" autocomplete="off">
<h2>Vehicle and driving</h2>
<div class="fields">
<div class="field full"><label for="vehicle">Vehicle</label><select id="vehicle" name="vehicle">${presets}</select></div>
<div class="field"><label for="kwhPerKm">Units per km</label><input id="kwhPerKm" name="kwhPerKm" type="number" min="0.01" step="0.005" value="0.14"></div>
<div class="field"><label for="kmPerMonth">Km per month</label><input id="kmPerMonth" name="kmPerMonth" type="number" min="0" step="50" value="1000"></div>
<div class="field"><label for="homeNight">% charged at home</label><input id="homeNight" name="homeNight" type="number" min="0" max="100" step="5" value="70"></div>
<div class="field"><label for="homeDay">% charged at home, 11 am–5 pm</label><input id="homeDay" name="homeDay" type="number" min="0" max="100" step="5" value="20"></div>
<div class="field"><label for="publicPct">% charged outside</label><input id="publicPct" name="publicPct" type="number" min="0" max="100" step="5" value="10"></div>
<div class="field"><label for="publicRate">Outside charger price (₹/unit)</label><input id="publicRate" name="publicRate" type="number" min="0" step="0.5" value="${ev.publicChargerPerKwh}"></div>
<h3 class="field full" style="margin:8px 0 0">Your home connection</h3>
<div class="field"><label for="units">Home units per month (without the vehicle)</label><input id="units" name="units" type="number" min="0" step="10" value="250"></div>
${commonBillFields('torrent-ahmedabad', { loadKw: 5 })}
<div class="field"><label for="solarSurplusKwh">Spare solar units per month</label><input id="solarSurplusKwh" name="solarSurplusKwh" type="number" min="0" step="10" value="0"><span class="hint">0 if you have no solar</span></div>
<details class="adv"><summary>Petrol / diesel comparison and more</summary><div class="fields">
<div class="field"><label for="iceType">Compare with</label><select id="iceType" name="iceType"><option value="petrol">Petrol</option><option value="diesel">Diesel</option><option value="cng">CNG</option></select></div>
<div class="field"><label for="icePrice">Fuel price (₹/L or ₹/kg)</label><input id="icePrice" name="icePrice" type="number" min="0" step="0.1" value="${common.fuel.petrolPerLitre}"></div>
<div class="field"><label for="iceKmPerUnit">Mileage (km/L or km/kg)</label><input id="iceKmPerUnit" name="iceKmPerUnit" type="number" min="1" step="1" value="15"></div>
<div class="field"><label for="years">Years to compare</label><input id="years" name="years" type="number" min="1" max="15" step="1" value="${ev.years}"></div>
<div class="field"><label for="chargingLossPct">Charging loss (%)</label><input id="chargingLossPct" name="chargingLossPct" type="number" min="0" max="30" step="1" value="${ev.chargingLossPct}"></div>
<div class="field"><label for="batteryDegradationPct">Battery ageing (%/yr)</label><input id="batteryDegradationPct" name="batteryDegradationPct" type="number" min="0" max="10" step="0.5" value="${ev.batteryDegradationPctPerYear}"></div>
${advancedBillFields()}
</div></details>
</div>
</form>
<div class="card" id="ev-out" aria-live="polite"></div>
</section>`;
}

// ---------- tariff tables (static HTML so they are crawlable) ----------

function slabTable(cat) {
  let prev = 0;
  const rows = cat.slabs.map((s) => {
    const label = s.upto === null ? `Above ${prev} units` : `${prev + 1}–${s.upto} units`;
    prev = s.upto;
    return `<tr><td>${label}</td><td class="num">${inr2(s.rate)}</td><td class="num">${Math.round(s.rate * 100)} paise</td></tr>`;
  }).join('');
  return `<div class="table-wrap"><table><thead><tr><th>Monthly units</th><th class="num">₹ per unit</th><th class="num">Paise</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function fixedTable(fixed) {
  let rows;
  if (fixed.type === 'flat') rows = `<tr><td>All loads</td><td class="num">${inr(fixed.amount)}</td></tr>`;
  else if (fixed.type === 'byPhase') rows = `<tr><td>Single phase (up to ${fixed.singlePhaseMaxKw} kW)</td><td class="num">${inr(fixed.single)}</td></tr><tr><td>Three phase</td><td class="num">${inr(fixed.three)}</td></tr>`;
  else {
    let prev = 0;
    rows = fixed.steps.map((s) => {
      const label = s.uptoKw === null ? `Above ${prev} kW` : prev === 0 ? `Up to ${s.uptoKw} kW` : `Above ${prev} to ${s.uptoKw} kW`;
      prev = s.uptoKw;
      return `<tr><td>${label}</td><td class="num">${inr(s.amount)}</td></tr>`;
    }).join('');
  }
  return `<div class="table-wrap"><table><thead><tr><th>Sanctioned load</th><th class="num">Fixed charge / month</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function exampleBills(discomId, category) {
  const sizes = [100, 200, 300, 400, 500];
  const rows = sizes.map((u) => {
    const b = C.calcBill(data, { discom: discomId, category, loadKw: u > 300 ? 4 : 2, units: u });
    return `<tr><td>${u} units</td><td class="num">${inr(b.energy)}</td><td class="num">${inr(b.fppa + b.duty + b.fixed)}</td><td class="num"><strong>${inr(b.total)}</strong></td><td class="num">${inr2(b.effectiveRate)}</td></tr>`;
  }).join('');
  return `<div class="table-wrap"><table><thead><tr><th>Monthly use</th><th class="num">Energy</th><th class="num">Fixed + FPPPA + duty</th><th class="num">Bill</th><th class="num">₹/unit</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// ---------- pages ----------

const pages = [];

function discomPageSpec(d) {
  const g = data.tariffGroups[d.tariffGroup];
  const urban = g.categories.urban;
  const b200 = C.calcBill(data, { discom: d.id, loadKw: 2, units: 200 });
  const b300 = C.calcBill(data, { discom: d.id, loadKw: 3, units: 300 });
  const marginal300 = C.marginalRate(data, { discom: d.id, loadKw: 3, units: 300 });
  const firstRate = urban.slabs[0].rate;
  const topRate = urban.slabs[urban.slabs.length - 1].rate;
  const isTorrent = d.tariffGroup !== 'gujarat-state';
  const dutyUrban = data.common.electricityDutyPct.urban;
  const solar3 = C.solarRoi(data, common, { discom: d.id, loadKw: 4, units: 300, yieldKwhPerKwYear: 1490 });

  const catSections = Object.keys(g.categories).map((k) => {
    const cat = g.categories[k];
    return `<h3>${esc(cat.label)} ${cat.verify ? VERIFY : ''}</h3>
<p>Energy charges</p>${slabTable(cat)}
<p>Fixed charges ${cat.fixed.verify ? VERIFY : ''}</p>${fixedTable(cat.fixed)}`;
  }).join('');

  const faqs = [
    { q: `What is the ${d.name} per unit rate in ${Y}?`, a: `For residential (RGP) consumers, ${d.name} charges ${inr2(firstRate)} per unit for the first ${urban.slabs[0].upto} units a month, rising to ${inr2(topRate)} per unit above ${urban.slabs[urban.slabs.length - 2].upto} units. FPPPA of about ${inr2(g.fppaPerUnit)} per unit and ${dutyUrban}% electricity duty are added on top, so the all-in rate is usually ₹6–9 per unit.` },
    { q: `How much is the ${d.name} bill for 200 units?`, a: `About ${inr(b200.total)} for 200 units in a month at 2 kW load: ${inr(b200.energy)} energy charge, ${inr(b200.fixed)} fixed charge, ${inr(b200.fppa)} FPPPA and ${inr(b200.duty)} electricity duty.` },
    { q: `How much is the ${d.name} bill for 300 units?`, a: `About ${inr(b300.total)} for 300 units in a month at 3 kW load. At that level each extra unit costs about ${inr2(marginal300)} including FPPPA and duty, which is the rate rooftop solar saves you.` },
    { q: 'What is FPPPA on my bill?', a: 'FPPPA (Fuel and Power Purchase Price Adjustment) passes changes in fuel and power purchase costs to consumers. It is charged per unit on every unit, is revised each quarter, and is printed on your bill. Enter the current figure in the calculator for an exact match.' },
    { q: `Does ${d.name} bill monthly or every two months?`, a: isTorrent ? 'Torrent Power residential bills are generally monthly. If your bill covers two months, choose the 2-month billing period: the slab limits are doubled.' : `Gujarat state DISCOMs, including ${d.name}, usually bill residential consumers every two months. The slab limits apply per month, so a 2-month bill doubles each slab. Choose the 2-month billing period in the calculator and enter the units from your bill.` },
    { q: `How much can rooftop solar save on a ${d.name} bill?`, a: `A home using 300 units a month would typically fit a ${solar3.kw} kW system. After the ${inr(solar3.subsidy)} PM Surya Ghar subsidy it costs around ${inr(solar3.netCost)}, cuts the bill by about ${inr(solar3.savingMonthlyYear1)} a month and pays back in roughly ${solar3.paybackYears.toFixed(1)} years. <a href="${PAGES.solar}?discom=${d.id}&units=300&loadKw=4">Check your own numbers</a>.` }
  ];

  return {
    file: discomPage(d),
    title: `${d.name} Bill Calculator ${Y} – Unit Rate, Slabs & Charges`,
    description: `Calculate your ${d.name} (${d.fullName}) electricity bill with the GERC ${Y} tariff: slab-wise energy charges, fixed charges, FPPPA, electricity duty and smart meter ToU discount.`,
    h1: `${d.name} Electricity Bill Calculator ${Y}`,
    lede: `Type the units from your bill to see your ${esc(d.name)} bill, line by line. Rates from ${fmtDate(data.effectiveFrom)}.`,
    crumbs: [{ name: 'Gujarat bill calculator', file: PAGES.gujaratBill }, { name: `${d.name} bill calculator`, file: discomPage(d) }],
    app: true,
    faqs,
    body: `${inShort([
      ['Price per unit', `${inr2(firstRate)} to ${inr2(topRate)}, more as you use more`],
      ['Plus', 'a small fixed charge, fuel surcharge and electricity tax'],
      ['200 units a month', `about <strong>${inr(b200.total)}</strong>`],
      ['300 units a month', `about <strong>${inr(b300.total)}</strong>`],
      ['Covers', esc(d.region)]
    ])}
${billForm(d.id)}
${adSlot('after-calc')}
<section class="prose">
<h2>${esc(d.name)} home electricity rates ${esc(Y)}</h2>
<p>Rates from the GERC tariff order for ${esc(Y)} (${esc(d.orderCase)}), effective ${fmtDate(data.effectiveFrom)}. Slabs are per month.</p>
${catSections}
<h3>Other charges</h3>
<ul>
<li><strong>FPPPA:</strong> about ${inr2(g.fppaPerUnit)}/unit ${g.fppaVerify ? VERIFY : ''}. ${esc(g.fppaNote)}</li>
<li><strong>Electricity duty:</strong> ${data.common.electricityDutyPct.urban}% (urban), ${data.common.electricityDutyPct.rural}% (rural) on fixed + energy + FPPPA ${data.common.electricityDutyVerify ? VERIFY : ''}.</li>
<li><strong>Prepaid smart meter rebate:</strong> ${data.common.prepaidRebatePctOnEnergy}% of energy charges.</li>
<li><strong>Smart meter ToU discount:</strong> ₹${data.common.tou.solarHoursDiscountPerUnit.toFixed(2)}/unit for use between ${esc(data.common.tou.window)}. <a href="${PAGES.tou}">How it works</a>.</li>
</ul>
<h2>Sample ${esc(d.name)} bills (one month)</h2>
${exampleBills(d.id, 'urban')}
<p class="note">Urban RGP, 2 kW load up to 300 units and 4 kW above, regular meter, FPPPA ${inr2(g.fppaPerUnit)}/unit.</p>
<h2>Areas served by ${esc(d.name)}</h2>
<p>${d.areas.map(esc).join(', ')}. Head office: ${esc(d.hq)}. Official website: <a href="${d.website}" rel="nofollow noopener">${esc(d.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>.</p>
<h2>How your bill is calculated</h2>
<ol>
<li><strong>Energy charge:</strong> units are split across the slabs above, and each slab is charged at its own rate.</li>
<li><strong>Fixed charge:</strong> a monthly amount based on your sanctioned load${isTorrent ? ' or supply phase' : ''}.</li>
<li><strong>FPPPA:</strong> a per-unit fuel surcharge on every unit.</li>
<li><strong>Rebates:</strong> the prepaid rebate and ToU discount are subtracted if you have a smart meter.</li>
<li><strong>Electricity duty:</strong> a percentage of the total, levied by the state government.</li>
</ol>
</section>
${adSlot('mid')}
${faqHtml(faqs)}
<p class="note">Source: <a href="${d.sourceUrl}" rel="nofollow noopener">GERC tariff order / schedule</a>. Verify against your bill before relying on these figures.</p>`
  };
}

data.discoms.forEach((d) => pages.push(discomPageSpec(d)));

// ---------- Solar system size pages (all India) ----------

const SIZES = india.systemSizes.map((x) => x.kw);
const yields = india.cities.map((c) => c.yield);
const yLow = Math.min(...yields), yHigh = Math.max(...yields), yTypical = 1450;
const lakh = (x) => x >= 100000 ? `₹${(x / 100000).toFixed(2).replace(/\.?0+$/, '')} lakh` : inr(x);
const range = (a, b) => `${lakh(a)} to ${lakh(b)}`;
const perDay = (kw, y) => kw * y / 365;
const round100 = (x) => Math.round(x / 100) * 100;
function yearsText(y) {
  const whole = Math.floor(y); let months = Math.round((y - whole) * 12);
  return months === 0 || months === 12 ? `${whole + (months === 12 ? 1 : 0)} years` : `${whole} years ${months} months`;
}

function sizeFacts(kw) {
  const p = C.sizePrice(india, kw);
  const sub = C.pmSuryaGharSubsidy(common, kw);
  const units = Math.round(kw * yTypical / 12 / 10) * 10;
  const r = C.solarSimple(india, common, { kw, yieldKwhPerKwYear: yTypical, units, rate: india.defaultRate });
  return {
    kw, p, sub,
    afterLow: p.low - sub, afterHigh: p.high - sub,
    panels: C.panelCount(india, kw),
    roof: kw * common.solarDefaults.sqftPerKw,
    dayLow: perDay(kw, yLow), dayHigh: perDay(kw, yHigh), dayTyp: perDay(kw, yTypical),
    month: kw * yTypical / 12, year: kw * yTypical,
    suitsUnits: units, suitsBill: round100(units * india.defaultRate),
    r
  };
}

// A short plain-language summary box shown at the top of a page.
function inShort(rows, title = 'In short') {
  return `<section class="inshort" aria-label="${esc(title)}"><h2>${esc(title)}</h2><dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></section>`;
}

const GLOSSARY = `<section class="glossary"><h2>Words you will see</h2><dl>
<div><dt>kW (kilowatt)</dt><dd>The size of a solar system. Bigger kW = more panels = more electricity.</dd></div>
<div><dt>Unit</dt><dd>One unit on your electricity bill (1 kWh). A fan running for a full day uses about 1.5 units.</dd></div>
<div><dt>Subsidy</dt><dd>Money the government pays back to you under PM Surya Ghar, after the system is installed.</dd></div>
<div><dt>On-grid</dt><dd>Solar connected to the electricity line, without batteries. Only on-grid systems get the subsidy.</dd></div>
<div><dt>Net meter</dt><dd>A two-way meter. It counts units you take from the line and units your panels send to it.</dd></div>
<div><dt>DCR panels</dt><dd>Panels made with Indian cells. Required for the subsidy; your installer will use them.</dd></div>
</dl></section>`;

function sizeForm(kw, mode) {
  const cityOpts = india.cities.map((c, i) => `<option value="${i}"${c.name === 'Delhi' ? ' selected' : ''}>${esc(c.name)}${c.state !== c.name ? ` (${esc(c.state)})` : ''}</option>`).join('');
  const sizeOpts = SIZES.map((k) => `<option value="${k}"${k === kw ? ' selected' : ''}>${k} kW</option>`).join('');
  const f = sizeFacts(kw);
  return `<section class="calc">
<form class="card" data-calc="size" data-mode="${mode}" data-output="size-out" autocomplete="off">
<h2>${mode === 'generation' ? 'Check for your city' : 'Check for your home'}</h2>
<div class="fields">
<div class="field"><label for="kw">Solar size</label><select id="kw" name="kw">${sizeOpts}</select></div>
<div class="field"><label for="city">Your city</label><select id="city" name="city">${cityOpts}</select></div>
<div class="field full"><span class="hint" style="font-weight:600">I know my</span><div class="seg" role="radiogroup">
<label><input type="radio" name="inputMode" value="bill" checked> Monthly bill (₹)</label>
<label><input type="radio" name="inputMode" value="units"> Monthly units</label>
</div></div>
<div class="field full" data-show="bill"><label for="bill">Your monthly electricity bill (₹)</label><input id="bill" name="bill" type="number" min="0" step="100" value="${f.suitsBill}" inputmode="numeric"></div>
<div class="field full hidden" data-show="units"><label for="units">Units you use per month</label><input id="units" name="units" type="number" min="0" step="10" value="${f.suitsUnits}" inputmode="numeric"><span class="hint">Printed on your bill. Bill for 2 months? Enter half.</span></div>
<details class="adv"><summary>Change price or rate</summary><div class="fields">
<div class="field"><label for="cost">Price quoted to you (₹)</label><input id="cost" name="cost" type="number" min="0" step="1000" inputmode="numeric"><span class="hint">Before subsidy. We fill in a typical price.</span></div>
<div class="field"><label for="rate">Cost of 1 unit (₹)</label><input id="rate" name="rate" type="number" min="1" step="0.1" value="${india.defaultRate}" inputmode="decimal"><span class="hint">Bill amount ÷ units on the bill</span></div>
<div class="field"><label for="exportRate">Rate for extra units sold (₹)</label><input id="exportRate" name="exportRate" type="number" min="0" step="0.05" value="${india.defaultExportRate}"></div>
</div></details>
</div>
</form>
<div class="card" id="size-out" aria-live="polite"></div>
</section>`;
}

function compareTable(current) {
  const rows = SIZES.map((kw) => {
    const f = sizeFacts(kw);
    const name = kw === current ? `<strong>${kw} kW</strong>` : `<a href="${pricePage(kw)}">${kw} kW</a>`;
    return `<tr${kw === current ? ' class="current"' : ''}><td>${name}</td><td class="num">${inr(f.suitsBill)}</td><td class="num">${range(f.afterLow, f.afterHigh)}</td><td class="num">${f.dayTyp.toFixed(0)}</td></tr>`;
  }).join('');
  return `<div class="table-wrap"><table><thead><tr><th>Solar size</th><th class="num">Good for a monthly bill of</th><th class="num">You pay (after subsidy)</th><th class="num">Units a day</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="note">Prices are typical for a complete system, installed. Get 2 or 3 quotes before you buy.</p>`;
}

function neighbours(kw, fn, label) {
  const i = SIZES.indexOf(kw);
  return [SIZES[i - 1], SIZES[i + 1]].filter(Boolean).map((k) => `<a href="${fn(k)}">${k} kW ${label}</a>`).join(' · ');
}

function pricePageSpec(kw) {
  const f = sizeFacts(kw);
  const acHours = Math.round(f.dayTyp / 1.3);
  const faqs = [
    { q: `What is the price of a ${kw}kW solar system in India in 2026?`, a: `A complete ${kw}kW rooftop system costs ${range(f.p.low, f.p.high)}, installed. After the government subsidy of ${inr(f.sub)}, you pay ${range(f.afterLow, f.afterHigh)}.` },
    { q: `What is the ${kw}kW solar system price with subsidy?`, a: `${range(f.afterLow, f.afterHigh)}. The government pays ${inr(f.sub)} back into your bank account after installation${kw > 3 ? ' (₹78,000 is the maximum, for 3 kW and above)' : ''}.` },
    { q: `How many units does a ${kw}kW solar system make per day?`, a: `About ${f.dayTyp.toFixed(0)} units a day (${f.dayLow.toFixed(0)} to ${f.dayHigh.toFixed(0)} depending on your city). That is about ${Math.round(f.month)} units a month. <a href="${genPage(kw)}">See your city</a>.` },
    { q: `How many panels are needed for ${kw}kW?`, a: `${f.panels} panels of ${india.panelWatt} watts each. If your installer uses smaller panels, you need a few more.` },
    { q: `How much roof space does ${kw}kW solar need?`, a: `About ${f.roof} sq ft of open roof with no shade, roughly a ${Math.round(Math.sqrt(f.roof * 0.75))} × ${Math.round(Math.sqrt(f.roof / 0.75))} ft area.` },
    { q: `Is ${kw}kW enough for my home?`, a: `${kw}kW suits a home with a monthly bill of about ${inr(f.suitsBill)} (${f.suitsUnits} units). If your bill is much smaller, choose a smaller system: extra units sold to the grid earn very little.` },
    { q: `Can a ${kw}kW solar system run an AC?`, a: `Yes, in effect. ${kw}kW makes about ${f.dayTyp.toFixed(0)} units a day, enough for a 1.5-ton inverter AC for about ${acHours} hours a day. The panels feed your home and the grid; the AC runs as normal and your bill goes down.` }
  ];
  return {
    file: pricePage(kw),
    title: `${kw}kW Solar System Price in India 2026 (With Subsidy) – Cost, Panels & Generation`,
    description: `${kw}kW solar system price in India: ${range(f.p.low, f.p.high)}. After the ${inr(f.sub)} PM Surya Ghar subsidy you pay ${range(f.afterLow, f.afterHigh)}. Makes about ${f.dayTyp.toFixed(0)} units a day.`,
    h1: `${kw}kW Solar System Price in India (2026)`,
    crumbs: [{ name: 'Solar price', file: PAGES.home }, { name: `${kw}kW solar price`, file: pricePage(kw) }],
    app: true,
    faqs,
    body: `${inShort([
      ['Full price', range(f.p.low, f.p.high)],
      ['Government subsidy', `${inr(f.sub)} back to you`],
      ['<strong>You pay</strong>', `<strong>${range(f.afterLow, f.afterHigh)}</strong>`],
      ['Electricity it makes', `about ${f.dayTyp.toFixed(0)} units a day`],
      ['Good for', `a monthly bill of about ${inr(f.suitsBill)}`],
      ['Money back in', `about ${yearsText(f.r.paybackYears)}`],
      ['Roof space', `about ${f.roof} sq ft (${f.panels} panels)`]
    ])}
${sizeForm(kw, 'price')}
${adSlot('after-calc')}
<section class="prose">
<h2>What you get for the price</h2>
<ul>
<li><strong>${f.panels} solar panels</strong> (${india.panelWatt} watts each, made in India)</li>
<li><strong>A ${kw} kW inverter</strong>, the box that turns solar power into home electricity</li>
<li><strong>A steel stand</strong> to hold the panels on your roof</li>
<li><strong>Wiring, safety switches and earthing</strong></li>
<li><strong>Installation</strong>. The new two-way meter (net meter) comes from your electricity company, usually for a small fee.</li>
</ul>
<h2>Why prices differ</h2>
<ul>
<li><strong>Brand:</strong> Adani, Waaree, Tata Power Solar and others differ by about 5–15%.</li>
<li><strong>Stand height:</strong> a raised stand (so you can use the roof below) costs more.</li>
<li><strong>Battery:</strong> a system with batteries costs much more, and does not get the subsidy.</li>
</ul>
<h2>How solar saves money: two examples</h2>
<p>Each solar unit your home uses replaces a unit you would buy from the electricity company. Extra units go to the grid and earn only a little. Example at ₹${india.defaultRate} a unit:</p>
<div class="table-wrap"><table><thead><tr><th></th><th class="num">Use 700, solar makes 600</th><th class="num">Use 600, solar makes 700</th></tr></thead><tbody>
<tr><td>Solar units used at home</td><td class="num">600</td><td class="num">600</td></tr>
<tr><td>Units bought from the company</td><td class="num">100</td><td class="num">0</td></tr>
<tr><td>Extra units sold to the grid</td><td class="num">0</td><td class="num">100 × ₹${india.defaultExportRate.toFixed(0)}</td></tr>
<tr><td>Bill before → after</td><td class="num">${inr(700 * india.defaultRate)} → ${inr(100 * india.defaultRate)}</td><td class="num">${inr(600 * india.defaultRate)} → ₹0</td></tr>
<tr class="total"><td>Saving per month</td><td class="num">${inr(600 * india.defaultRate)}</td><td class="num">${inr(600 * india.defaultRate + 100 * india.defaultExportRate)}</td></tr>
</tbody></table></div>
<p>The second system makes 100 more units but saves only ${inr(100 * india.defaultExportRate)} more. <strong>Choose a size that makes about as much as you use.</strong></p>
<h2>Which size is right for you?</h2>
<p>Look at your monthly electricity bill and find the closest row.</p>
${compareTable(kw)}
<p>${neighbours(kw, pricePage, 'solar price')} · <a href="${genPage(kw)}">How much ${kw}kW makes in your city</a> · <a href="${PAGES.subsidy}">How to get the subsidy</a></p>
</section>
${GLOSSARY}
${adSlot('mid')}
${faqHtml(faqs)}`
  };
}

function genPageSpec(kw) {
  const f = sizeFacts(kw);
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const cityRows = india.cities.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => `<tr><td>${esc(c.name)}</td><td class="num">${perDay(kw, c.yield).toFixed(1)}</td><td class="num">${Math.round(kw * c.yield / 12)}</td></tr>`).join('');
  const monthRows = india.monthlyShare.map((s, m) => { const u = kw * yTypical * s; return `<tr><td>${MONTHS[m]}</td><td class="num">${(u / days[m]).toFixed(1)}</td><td class="num">${Math.round(u)}</td></tr>`; }).join('');
  const faqs = [
    { q: `How many units does a ${kw}kW solar panel make per day?`, a: `About ${f.dayTyp.toFixed(0)} units a day on average. Sunny places like Rajasthan and Gujarat get up to ${f.dayHigh.toFixed(1)}; cloudier places like Kolkata and Guwahati get about ${f.dayLow.toFixed(1)}.` },
    { q: `How many units does a ${kw}kW solar system make per month?`, a: `About ${Math.round(kw * yLow / 12)} to ${Math.round(kw * yHigh / 12)} units a month. Most in March to May, least in the rainy months.` },
    { q: `How many units does ${kw}kW solar make in a year?`, a: `About ${Math.round(kw * yLow).toLocaleString('en-IN')} to ${Math.round(kw * yHigh).toLocaleString('en-IN')} units a year.` },
    { q: `Why is my ${kw}kW system making less than this?`, a: 'The usual reasons: shade from a water tank, wall or tree; dusty panels (clean them every 2–3 weeks when it is dry); cloudy or rainy weather; or the inverter switching off. If you get less than 80% of these figures for a whole month, call your installer.' },
    { q: `How much money does ${kw}kW solar save?`, a: `About ${inr(f.month * india.defaultRate)} a month at ₹${india.defaultRate} per unit, if your home uses the units it makes. <a href="${pricePage(kw)}">See ${kw}kW price and savings</a>.` }
  ];
  return {
    file: genPage(kw),
    title: `${kw}kW Solar Panel Generation Per Day, Month & Year (City-wise, India)`,
    description: `A ${kw}kW solar system makes about ${f.dayTyp.toFixed(0)} units a day (${f.dayLow.toFixed(1)}–${f.dayHigh.toFixed(1)} depending on city), about ${Math.round(f.month)} units a month and ${Math.round(f.year).toLocaleString('en-IN')} a year. City-wise and month-wise table.`,
    h1: `How Many Units Does ${kw}kW Solar Make in a Day?`,
    crumbs: [{ name: 'Solar price', file: PAGES.home }, { name: `${kw}kW units per day`, file: genPage(kw) }],
    app: true,
    faqs,
    body: `${inShort([
      ['<strong>Per day</strong>', `<strong>about ${f.dayTyp.toFixed(0)} units</strong>`],
      ['Per month', `about ${Math.round(f.month)} units`],
      ['Per year', `about ${Math.round(f.year).toLocaleString('en-IN')} units`],
      ['Best months', 'March to May'],
      ['Lowest months', 'July and August (rain)'],
      ['Worth', `about ${inr(f.month * india.defaultRate)} off your bill a month`]
    ])}
${sizeForm(kw, 'generation')}
${adSlot('after-calc')}
<section class="prose">
<h2>Units a day in your city (${kw}kW)</h2>
<div class="table-wrap"><table><thead><tr><th>City</th><th class="num">Units a day</th><th class="num">Units a month</th></tr></thead><tbody>${cityRows}</tbody></table></div>
<p class="note">Average over the year, for panels facing south with no shade. Your real figure can be about 10% higher or lower.</p>
<h2>Month by month</h2>
<div class="table-wrap"><table><thead><tr><th>Month</th><th class="num">Units a day</th><th class="num">Units in month</th></tr></thead><tbody>${monthRows}</tbody></table></div>
<p class="note">For a typical city. In Tamil Nadu, the rainy dip comes in October to December instead.</p>
<h2>Is your system working properly? Check in 3 steps</h2>
<ol>
<li>Open your inverter app (or the screen on the inverter) and find <strong>today's units</strong>.</li>
<li>On a sunny day, compare it with your city in the table above.</li>
<li>Much lower for weeks? Clean the panels, check for new shade, and call your installer.</li>
</ol>
<p>${neighbours(kw, genPage, 'units per day')} · <a href="${pricePage(kw)}">${kw}kW price with subsidy</a></p>
</section>
${adSlot('mid')}
${faqHtml(faqs)}`
  };
}

SIZES.forEach((kw) => { pages.push(pricePageSpec(kw)); pages.push(genPageSpec(kw)); });

// Home: solar price hub
(() => {
  const f3 = sizeFacts(3), f1 = sizeFacts(1), f10 = sizeFacts(10);
  const faqs = [
    { q: 'How much do solar panels cost for a home in India in 2026?', a: `A complete system costs about ${range(f1.p.low, f1.p.high)} for 1 kW, ${range(f3.p.low, f3.p.high)} for 3 kW and ${range(f10.p.low, f10.p.high)} for 10 kW. The government subsidy then pays you back up to ₹78,000.` },
    { q: 'How much subsidy does the government give?', a: 'Under PM Surya Ghar: ₹30,000 for 1 kW, ₹60,000 for 2 kW and ₹78,000 for 3 kW or more. It is paid into your bank account after installation.' },
    { q: 'What size of solar do I need?', a: `Look at your monthly bill. Roughly: up to ₹1,000 → 1 kW, ₹2,000 → 2 kW, ₹2,500–3,000 → 3 kW, ₹4,000–5,000 → 5 kW. Each kW needs about ${common.solarDefaults.sqftPerKw} sq ft of open roof.` },
    { q: 'How many units does 1kW solar make in a day?', a: `About 4 units a day, a little more in sunny states. <a href="${genPage(1)}">See your city</a>.` }
  ];
  pages.push({
    file: PAGES.home,
    title: 'Solar System Price in India 2026 With Subsidy – 1kW to 10kW Cost & Generation',
    description: 'How much rooftop solar costs in India for 1kW, 2kW, 3kW, 5kW and 10kW, how much the government subsidy pays, how many units it makes and how fast it pays back.',
    h1: 'How Much Does Rooftop Solar Cost in India?',
    lede: 'Find your monthly electricity bill in the table to see which solar size suits you, what you pay after the government subsidy, and how much electricity it makes.',
    app: true,
    faqs,
    body: `${compareTable(null)}
${sizeForm(3, 'price')}
${adSlot('after-calc')}
<h2>Prices by size</h2>
<ul class="grid-links">${SIZES.map((kw) => { const f = sizeFacts(kw); return `<li><a href="${pricePage(kw)}"><strong>${kw}kW solar price</strong><small>You pay ${range(f.afterLow, f.afterHigh)}</small></a></li>`; }).join('')}</ul>
<h2>More tools</h2>
<ul class="grid-links">
<li><a href="${PAGES.subsidy}"><strong>Government subsidy</strong><small>How much you get and how to apply</small></a></li>
<li><a href="${PAGES.solar}"><strong>Gujarat solar savings</strong><small>Uses your electricity company's exact rates</small></a></li>
<li><a href="${PAGES.gujaratBill}"><strong>Gujarat electricity bill</strong><small>UGVCL, MGVCL, DGVCL, PGVCL, Torrent</small></a></li>
<li><a href="${PAGES.ev}"><strong>Electric vehicle charging cost</strong><small>Cost per km at home and outside</small></a></li>
</ul>
${GLOSSARY}
${faqHtml(faqs)}`
  });
})();

// Gujarat bill hub
(() => {
  const g = data.tariffGroups['gujarat-state'].categories.urban;
  const faqs = [
    { q: `What is the electricity unit rate in Gujarat in ${Y}?`, a: `For homes on the state DISCOMs (UGVCL, MGVCL, DGVCL, PGVCL) the urban residential rate is ${inr2(g.slabs[0].rate)}/unit for the first 50 units, ${inr2(g.slabs[1].rate)} for 51–100, ${inr2(g.slabs[2].rate)} for 101–250 and ${inr2(g.slabs[3].rate)} above 250 units a month, plus FPPPA and ${data.common.electricityDutyPct.urban}% duty. Torrent Power has its own rates for Ahmedabad, Gandhinagar and Surat.` },
    { q: 'Which DISCOM supplies my area?', a: 'Ahmedabad and Gandhinagar cities and Surat city are supplied by Torrent Power. North Gujarat is UGVCL, central Gujarat is MGVCL, south Gujarat is DGVCL, and Saurashtra and Kutch are PGVCL. The company name is printed at the top of your bill.' },
    { q: `Did Gujarat electricity rates change in ${Y}?`, a: `GERC kept base energy and fixed charges unchanged for ${Y}. It raised the prepaid smart meter rebate to 3% and widened the 60 paise/unit smart meter discount window to ${esc(data.common.tou.window)}.` }
  ];
  pages.push({
    file: PAGES.gujaratBill,
    crumbs: [{ name: 'Gujarat bill calculator', file: PAGES.gujaratBill }],
    title: `Gujarat Electricity Bill Calculator ${Y} – UGVCL, MGVCL, DGVCL, PGVCL, Torrent`,
    description: `Free Gujarat electricity bill calculator with GERC ${Y} slab rates for UGVCL, MGVCL, DGVCL, PGVCL and Torrent Power, plus rooftop solar payback and EV charging cost calculators.`,
    h1: `Gujarat Electricity Bill Calculator ${Y}`,
    lede: 'Itemised bill estimates for every Gujarat DISCOM, using the slab rates, fixed charges, FPPPA and duty from the latest GERC tariff orders.',
    app: true,
    faqs,
    body: `${billForm('ugvcl')}
${adSlot('after-calc')}
<h2>Bill calculator by DISCOM</h2>
<ul class="grid-links">${data.discoms.map((d) => `<li><a href="${discomPage(d)}"><strong>${esc(d.name)} bill calculator</strong><small>${esc(d.region)}</small></a></li>`).join('')}</ul>
<h2>Solar and EV</h2>
<ul class="grid-links">
<li><a href="${PAGES.solar}"><strong>Rooftop solar payback</strong><small>Subsidy, savings and payback on your DISCOM's slabs</small></a></li>
<li><a href="${PAGES.ev}"><strong>EV charging cost</strong><small>₹/km at home, in solar hours or on public chargers</small></a></li>
<li><a href="${PAGES.subsidy}"><strong>PM Surya Ghar subsidy</strong><small>Up to ₹78,000 for 3 kW</small></a></li>
<li><a href="${PAGES.netMetering}"><strong>Net metering in Gujarat</strong><small>How export units are credited</small></a></li>
</ul>
${faqHtml(faqs)}`
  });
})();

// Solar ROI
(() => {
  const ex = C.solarRoi(data, common, { discom: 'ugvcl', loadKw: 4, units: 300, yieldKwhPerKwYear: 1500 });
  const faqs = [
    { q: 'How many kW of solar do I need?', a: `Divide your yearly units by about 1,450–1,550 (what 1 kW of panels makes in a year in Gujarat). A home using 300 units a month (3,600 a year) needs about ${ex.kw} kW. Net metering is allowed up to your sanctioned load.` },
    { q: 'What is the payback period of rooftop solar in Gujarat?', a: `Usually 2.5–5 years after the PM Surya Ghar subsidy. For example, a ${ex.kw} kW system on a UGVCL home using 300 units a month costs about ${inr(ex.netCost)} after subsidy and saves about ${inr(ex.savingYear1)} in the first year, a payback of ${ex.paybackYears.toFixed(1)} years. Bigger bills pay back faster because solar replaces the costliest slabs first.` },
    { q: 'Why does this calculator give different savings from installer calculators?', a: 'Most calculators multiply units by a flat ₹/unit. This one recalculates your bill slab by slab, with fixed charges, FPPPA and duty, before and after solar, so the saving reflects the slabs you actually drop out of.' },
    { q: 'What happens to extra solar units?', a: `Under net metering, units you export offset units you import in the same billing cycle. Any surplus left over is bought by the DISCOM at about ₹${data.common.netMetering.surplusRatePerUnit}/unit, so oversizing beyond your use earns little.` }
  ];
  pages.push({
    file: PAGES.solar,
    title: `Rooftop Solar Calculator Gujarat ${Y} – Subsidy, Savings & Payback`,
    description: 'Calculate rooftop solar size, PM Surya Ghar subsidy, new electricity bill, payback period and 25-year savings for UGVCL, MGVCL, DGVCL, PGVCL and Torrent Power homes.',
    h1: 'Rooftop Solar Savings & Payback Calculator (Gujarat)',
    lede: 'Recalculates your actual DISCOM bill slab by slab, before and after solar, so the savings match what you will see on your bill.',
    crumbs: [{ name: 'Rooftop solar calculator', file: PAGES.solar }],
    app: true,
    faqs,
    body: `${solarForm()}
${adSlot('after-calc')}
<section class="prose">
<h2>How the calculation works</h2>
<ol>
<li><strong>Size:</strong> yearly units ÷ yield of your city, limited by roof area (about ${common.solarDefaults.sqftPerKw} sq ft per kW) and sanctioned load, rounded down to 0.5 kW.</li>
<li><strong>Generation:</strong> spread over 12 months using a Gujarat seasonal profile (lower in the monsoon).</li>
<li><strong>Bill after solar:</strong> each month, solar units are netted against your use and the remaining units go through the full DISCOM tariff. Surplus is credited at ₹${data.common.netMetering.surplusRatePerUnit}/unit.</li>
<li><strong>Subsidy:</strong> PM Surya Ghar: ₹30,000/kW for the first 2 kW, ₹18,000 for the 3rd kW, maximum ₹78,000. <a href="${PAGES.subsidy}">Details</a>.</li>
<li><strong>Over 25 years:</strong> tariffs rise and panels age at the rates in Assumptions; payback, IRR and lifetime savings come from that cash flow.</li>
</ol>
<p class="note">${esc(data.solarYieldNote)}</p>
</section>
${faqHtml(faqs)}`
  });
})();

// EV
(() => {
  const ex = C.evCost(data, common, { discom: 'torrent-ahmedabad', loadKw: 5, units: 250, kwhPerKm: 0.14, kmPerMonth: 1000, split: { homeNight: 100 }, publicRate: common.evDefaults.publicChargerPerKwh, ice: { pricePerUnit: common.fuel.petrolPerLitre, kmPerUnit: 15 } });
  const faqs = [
    { q: 'What does it cost to charge an EV at home in Gujarat?', a: `Each extra unit is charged at your highest slab plus FPPPA and duty, usually ₹6.5–9 per unit. A compact SUV EV doing 1,000 km a month adds about ${inr(ex.scenarios.homeNight.total)} to an Ahmedabad home's bill, about ${inr2(ex.scenarios.homeNight.perKm)} per km.` },
    { q: 'Is it cheaper to charge during the day?', a: `With a smart meter, units used between ${esc(data.common.tou.window)} get a 60 paise discount. If you have rooftop solar, charging in the day uses your own surplus, which would otherwise earn only about ₹${data.common.netMetering.surplusRatePerUnit}/unit from the DISCOM.` },
    { q: 'How much does public EV charging cost?', a: `Public DC fast chargers in Gujarat typically charge ₹18–25 per kWh including GST, two to three times the home rate. That is about ${inr2(ex.scenarios.public.perKm)} per km for a compact SUV.` }
  ];
  pages.push({
    file: PAGES.ev,
    title: `EV Charging Cost Calculator Gujarat ${Y} – ₹/km at Home vs Public`,
    description: 'Calculate EV charging cost per month and per km in Gujarat on your DISCOM tariff, with smart meter solar-hours discount, rooftop solar and public charger rates, compared with petrol, diesel and CNG.',
    h1: 'EV Charging Cost Calculator (Gujarat)',
    lede: 'Works out what charging adds to your actual electricity bill, the cheapest time to charge, and how much you save over petrol, diesel or CNG.',
    crumbs: [{ name: 'EV charging cost', file: PAGES.ev }],
    app: true,
    faqs,
    body: `${evForm()}
${adSlot('after-calc')}
${faqHtml(faqs)}`
  });
})();

// Subsidy guide
(() => {
  const s = common.pmSuryaGhar;
  const rows = [1, 2, 3, 4, 5, 10].map((kw) => {
    const sub = C.pmSuryaGharSubsidy(common, kw);
    const cost = kw * common.solarDefaults.costPerKw;
    return `<tr><td>${kw} kW</td><td class="num">${inr(cost)}</td><td class="num">${inr(sub)}</td><td class="num">${inr(cost - sub)}</td></tr>`;
  }).join('');
  pages.push({
    file: PAGES.subsidy,
    title: `PM Surya Ghar Subsidy Gujarat ${Y} – Amount per kW & How to Apply`,
    description: 'PM Surya Ghar Muft Bijli Yojana subsidy for rooftop solar in Gujarat: ₹30,000 per kW up to 2 kW, ₹18,000 for the 3rd kW, maximum ₹78,000. Cost after subsidy by system size.',
    h1: 'PM Surya Ghar Subsidy in Gujarat',
    lede: 'How much central subsidy you get for rooftop solar, what you pay after it, and the steps to apply through your DISCOM.',
    crumbs: [{ name: 'PM Surya Ghar subsidy', file: PAGES.subsidy }],
    body: `<section class="prose">
<h2>Subsidy amount</h2>
<ul>
<li>₹${s.perKwFirst2.toLocaleString('en-IN')} per kW for the first 2 kW</li>
<li>₹${s.perKwThird.toLocaleString('en-IN')} for the 3rd kW</li>
<li>Maximum ₹${s.cap.toLocaleString('en-IN')} for systems of 3 kW and above</li>
</ul>
<p>The subsidy is for residential connections only and is paid into your bank account after the system is installed, inspected and net-metered.</p>
<h2>Cost after subsidy</h2>
<div class="table-wrap"><table><thead><tr><th>System</th><th class="num">Approx. cost</th><th class="num">Subsidy</th><th class="num">You pay</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="note">At an assumed ${inr(common.solarDefaults.costPerKw)}/kW installed. Quotes vary by brand, structure height and city.</p>
<h2>How to apply</h2>
<ol>
<li>Register on the <a href="${s.url}" rel="nofollow noopener">national PM Surya Ghar portal</a> with your DISCOM consumer number and mobile number.</li>
<li>Apply for rooftop solar and wait for the DISCOM's feasibility approval.</li>
<li>Choose a vendor registered with your DISCOM and get the system installed.</li>
<li>Submit the installation details and apply for the net meter.</li>
<li>After the DISCOM inspects and commissions the net meter, submit your bank details for the subsidy.</li>
</ol>
<p><a class="cta" href="${PAGES.solar}">Calculate your savings and payback →</a></p>
</section>`
  });
})();

// Net metering guide
pages.push({
  file: PAGES.netMetering,
  title: `Net Metering in Gujarat ${Y} – How Solar Export Units Are Credited`,
  description: 'How rooftop solar net metering works in Gujarat for UGVCL, MGVCL, DGVCL, PGVCL and Torrent Power: billing-cycle netting, surplus purchase rate and capacity limits.',
  h1: 'Net Metering in Gujarat',
  lede: 'What happens to the solar units you send to the grid, and why sizing to your own use gives the best return.',
  crumbs: [{ name: 'Net metering', file: PAGES.netMetering }],
  body: `<section class="prose">
<h2>How it works</h2>
<p>A bi-directional (net) meter records units you import from the grid and units your panels export. In each billing cycle, exports are set off against imports, and you pay only for the net units through the normal slab tariff.</p>
<h2>Surplus units</h2>
<p>If you export more than you import in a billing cycle, the DISCOM buys the surplus at about <strong>₹${data.common.netMetering.surplusRatePerUnit}/unit</strong> ${data.common.netMetering.verify ? VERIFY : ''} for residential consumers. Each unit of your own use that solar replaces is worth ₹6–9 because it removes your highest-slab units, FPPPA and duty, so a system sized close to your yearly consumption gives the best payback.</p>
<h2>Capacity limit</h2>
<p>Residential rooftop systems can be installed up to your sanctioned load. If you want a bigger system, apply for a load increase first.</p>
<h2>Things that change your savings</h2>
<ul>
<li>Monsoon months (June to September) generate 25–40% less.</li>
<li>Shade from water tanks, parapets or nearby buildings cuts output sharply.</li>
<li>Fixed charges and meter rent stay on the bill even if your net units are zero.</li>
</ul>
<p><a class="cta" href="${PAGES.solar}">Run the solar calculator →</a></p>
</section>`
});

// ToU guide
pages.push({
  file: PAGES.tou,
  title: `Smart Meter ToU Discount Gujarat ${Y} – 60 Paise Off ${data.common.tou.window}`,
  description: `Gujarat smart meter time-of-use discount: 60 paise per unit for use between ${data.common.tou.window}, plus a 3% prepaid rebate. Who gets it and how much it saves.`,
  h1: 'Smart Meter Time-of-Use Discount in Gujarat',
  lede: `From ${fmtDate(data.effectiveFrom)}, smart-meter homes in Gujarat pay less for electricity used in the solar hours.`,
  crumbs: [{ name: 'Smart meter ToU discount', file: PAGES.tou }],
  body: `<section class="prose">
<h2>What changed in ${esc(Y)}</h2>
<ul>
<li>The ToU discount of <strong>60 paise per unit</strong> now covers <strong>${esc(data.common.tou.window)}</strong> (6 hours), up from 11:00–15:00.</li>
<li>It now applies to postpaid smart-meter consumers too, not only prepaid.</li>
<li>The prepaid smart meter rebate went up from 2% to <strong>${data.common.prepaidRebatePctOnEnergy}%</strong> of energy charges.</li>
<li>No peak-hour surcharge is modelled for residential consumers in this calculator.</li>
</ul>
<h2>Who is eligible</h2>
<p>${esc(data.common.tou.eligibility)}. Ordinary electromechanical or non-smart meters cannot record time of use, so the discount does not apply.</p>
<h2>How much it saves</h2>
<p>Moving 100 units a month (washing machine, water heater, pump, EV charging) into ${esc(data.common.tou.window)} saves ₹60 plus duty, about ₹69 a month. Use the <a href="${PAGES.gujaratBill}">bill calculator</a> with a smart meter selected to see your exact figure.</p>
</section>`
});

// About / sources
pages.push({
  file: PAGES.about,
  title: `About ${cfg.siteName} – Data Sources & Methodology`,
  description: `Where the tariff, subsidy and solar data used by ${cfg.siteName} comes from and how often it is updated.`,
  h1: 'About & sources',
  crumbs: [{ name: 'About', file: PAGES.about }],
  body: `<section class="prose">
<p>${esc(cfg.siteName)} is an independent set of calculators. It is not affiliated with any DISCOM, GERC or the Government of India.</p>
<h2>Sources</h2>
<ul>
${data.discoms.map((d) => `<li>${esc(d.name)}: <a href="${d.sourceUrl}" rel="nofollow noopener">${esc(d.orderCase)}</a></li>`).join('\n')}
<li>Subsidy: <a href="${common.pmSuryaGhar.url}" rel="nofollow noopener">${esc(common.pmSuryaGhar.name)}</a></li>
<li>Regulator: <a href="${data.regulator.url}" rel="nofollow noopener">${esc(data.regulator.name)}</a></li>
</ul>
<h2>Update schedule</h2>
<p>Tariffs are reviewed every April when GERC issues new orders, and FPPPA defaults are updated each quarter. Last reviewed: ${fmtDate(data.lastReviewed)}.</p>
<h2>Accuracy</h2>
<p>Results are estimates. Figures marked ${VERIFY} were cross-checked from secondary sources and should be confirmed against the official schedule. If you spot a mismatch with your bill${cfg.contactEmail ? `, email <a href="mailto:${esc(cfg.contactEmail)}">${esc(cfg.contactEmail)}</a>` : ''}, please let us know.</p>
</section>`
});

pages.push({
  file: PAGES.privacy,
  title: `Privacy Policy – ${cfg.siteName}`,
  description: `Privacy policy for ${cfg.siteName}.`,
  h1: 'Privacy policy',
  crumbs: [{ name: 'Privacy policy', file: PAGES.privacy }],
  body: `<section class="prose">
<p>All calculations run in your browser. The numbers you enter are not sent to or stored on our server.</p>
<h2>Advertising and cookies</h2>
<p>This site may show ads served by Google. Google and its partners use cookies to serve ads based on your visits to this and other websites. You can opt out of personalised advertising at <a href="https://www.google.com/settings/ads" rel="nofollow noopener">Google Ad Settings</a>. See <a href="https://policies.google.com/technologies/ads" rel="nofollow noopener">how Google uses data from sites that use its services</a>.</p>
<h2>Analytics</h2>
<p>We may use aggregated, anonymous traffic statistics to improve the site.</p>
${cfg.contactEmail ? `<h2>Contact</h2><p><a href="mailto:${esc(cfg.contactEmail)}">${esc(cfg.contactEmail)}</a></p>` : ''}
<p class="note">Last updated ${fmtDate(data.lastReviewed)}.</p>
</section>`
});

// ---------- write ----------

for (const p of pages) fs.writeFileSync(path.join(OUT, p.file), layout(p));

fs.writeFileSync(path.join(OUT, 'assets/data.js'),
  '/* Generated by build.js from data/*.json. Do not edit by hand. */\nwindow.SITE_DATA = ' + JSON.stringify({ gujarat: data, common, india }) + ';\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${base}/${p.file === 'index.html' ? '' : p.file}</loc><lastmod>${data.lastReviewed}</lastmod></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);

const pubId = cfg.adsenseClient.replace(/^ca-/, '');
const adsTxt = path.join(OUT, 'ads.txt');
if (pubId) fs.writeFileSync(adsTxt, `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`);
else if (fs.existsSync(adsTxt)) fs.unlinkSync(adsTxt);

console.log(`Built ${pages.length} pages into ${path.relative(process.cwd(), OUT) || '.'}/`);
