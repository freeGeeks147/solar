'use strict';
const { esc, t, icon } = require('./util');

// Calculator form markup. Field names and ids must stay in sync with site/assets/app.js.
module.exports = function makeForms({ data, common, india, sizes }) {
  const nameOf = (x, lang) => (lang === 'hi' && x.nameHi ? x.nameHi : x.name);

  function discomOptions(selected, lang) {
    return data.discoms.map((d) => `<option value="${d.id}"${d.id === selected ? ' selected' : ''}>${esc(nameOf(d, lang))} (${esc(lang === 'hi' ? d.regionHi : d.region)})</option>`).join('');
  }

  function meterField(lang) {
    const tr = t(lang);
    return `<div class="field"><label for="meter">${tr('Meter type', 'मीटर का प्रकार')}</label><select id="meter" name="meter">
<option value="postpaid">${tr('Regular meter', 'सामान्य मीटर')}</option>
<option value="postpaid-smart">${tr('Smart meter (pay after use)', 'स्मार्ट मीटर (बाद में भुगतान)')}</option>
<option value="prepaid-smart">${tr('Smart meter (prepaid / recharge)', 'स्मार्ट मीटर (प्रीपेड / रिचार्ज)')}</option>
</select></div>
<div class="field" data-show="smart"><label for="solarHoursPct">${tr('% of electricity used 11 am–5 pm', 'सुबह 11 से शाम 5 बजे के बीच खपत (%)')}</label><input id="solarHoursPct" name="solarHoursPct" type="number" min="0" max="100" step="5" value="25"><span class="hint">${tr('Smart meters get 60 paise off per unit in these hours', 'इन घंटों में स्मार्ट मीटर पर 60 पैसे प्रति यूनिट छूट')}</span></div>`;
  }

  function commonBillFields(discomId, lang, loadKw = 3) {
    const tr = t(lang);
    return `<div class="field full"><label for="discom">${tr('Your electricity company', 'आपकी बिजली कंपनी')}</label><select id="discom" name="discom">${discomOptions(discomId, lang)}</select></div>
<div class="field"><label for="category">${tr('Area', 'क्षेत्र')}</label><select id="category" name="category"></select></div>
<div class="field"><label for="loadKw">${tr('Sanctioned load (kW)', 'स्वीकृत लोड (kW)')}</label><input id="loadKw" name="loadKw" type="number" min="0.5" step="0.5" value="${loadKw}"><span class="hint">${tr('Printed on your bill', 'आपके बिल पर छपा होता है')}</span></div>
${meterField(lang)}`;
  }

  function phaseField(lang) {
    const tr = t(lang);
    return `<div class="field"><label for="phase">${tr('Supply', 'सप्लाई')}</label><select id="phase" name="phase"><option value="single">${tr('Single phase', 'सिंगल फ़ेज़')}</option><option value="three">${tr('Three phase', 'थ्री फ़ेज़')}</option></select></div>`;
  }

  // The two figures we cannot pin down for every consumer. Prefilled with estimates; users overwrite them from their bill.
  function chargeFields(lang) {
    const tr = t(lang);
    return `<div class="field"><label for="fppa">${tr('Fuel surcharge per unit (₹)', 'ईंधन सरचार्ज प्रति यूनिट (₹)')}</label><input id="fppa" name="fppa" type="number" min="0" step="0.01" inputmode="decimal"><span class="hint">${tr('Shown as FPPPA or FPPAS on your bill', 'बिल पर FPPPA या FPPAS लिखा होता है')}</span></div>
<div class="field"><label for="dutyPct">${tr('Electricity duty (%)', 'बिजली शुल्क (%)')}</label><input id="dutyPct" name="dutyPct" type="number" min="0" max="60" step="0.5" inputmode="decimal"><span class="hint">${tr('A state tax, shown on your bill', 'राज्य का टैक्स, बिल पर लिखा होता है')}</span></div>`;
  }

  function seg(name, options, checked) {
    return `<div class="seg" role="radiogroup">${options.map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}"${v === checked ? ' checked' : ''}> ${l}</label>`).join('')}</div>`;
  }

  function billForm(discomId, lang) {
    const tr = t(lang);
    const torrent = discomId.startsWith('torrent');
    return `<section class="calc" id="calculator">
<form class="card form-card" data-calc="bill" data-output="bill-out" autocomplete="off">
<h2>${icon('bolt')} ${tr('Your details', 'आपकी जानकारी')}</h2>
<div class="fields">
${commonBillFields(discomId, lang)}
<div class="field full"><span class="label">${tr('Calculate from', 'किससे गणना करें')}</span>${seg('inputMode', [['units', tr('Units used', 'खर्च यूनिट')], ['amount', tr('Bill amount', 'बिल की रकम')]], 'units')}</div>
<div class="field" data-show="units"><label for="units">${tr('Units used (from your bill)', 'खर्च यूनिट (बिल से)')}</label><input id="units" name="units" type="number" min="0" step="1" value="${torrent ? 200 : 400}" inputmode="numeric"></div>
<div class="field hidden" data-show="amount"><label for="amount">${tr('Bill amount (₹)', 'बिल की रकम (₹)')}</label><input id="amount" name="amount" type="number" min="0" step="10" value="2500" inputmode="numeric"></div>
<div class="field"><label for="months">${tr('Billing period', 'बिल की अवधि')}</label><select id="months" name="months"><option value="1"${torrent ? ' selected' : ''}>${tr('1 month', '1 महीना')}</option><option value="2"${torrent ? '' : ' selected'}>${tr('2 months', '2 महीने')}</option></select></div>
<fieldset class="from-bill full"><legend>${tr('From your bill (optional)', 'आपके बिल से (वैकल्पिक)')}</legend>
<p class="hint">${tr('We have filled in typical values. For an exact answer, copy these two numbers from your bill.', 'हमने सामान्य मान भरे हैं। सटीक जवाब के लिए ये दो आंकड़े अपने बिल से भरें।')}</p>
<div class="fields">${chargeFields(lang)}</div></fieldset>
<details class="adv"><summary>${tr('More options', 'और विकल्प')}</summary><div class="fields">${phaseField(lang)}</div></details>
</div>
</form>
<div class="card result-card" id="bill-out" aria-live="polite"></div>
</section>`;
  }

  function solarForm(lang) {
    const tr = t(lang);
    const cities = data.cities.map((c, i) => `<option value="${i}">${esc(nameOf(c, lang))}</option>`).join('');
    const d = common.solarDefaults;
    return `<section class="calc" id="calculator">
<form class="card form-card" data-calc="solar" data-output="solar-out" autocomplete="off">
<h2>${icon('home')} ${tr('Your home', 'आपका घर')}</h2>
<div class="fields">
<div class="field"><label for="city">${tr('City', 'शहर')}</label><select id="city" name="city">${cities}</select></div>
<div class="field"><label for="units">${tr('Units used per month', 'हर महीने की खपत (यूनिट)')}</label><input id="units" name="units" type="number" min="0" step="10" value="400" inputmode="numeric"><span class="hint">${tr('From your bill. Bill for 2 months? Enter half.', 'बिल से। 2 महीने का बिल हो तो आधा भरें।')}</span></div>
${commonBillFields(data.cities[0].discom, lang, 4)}
<div class="field"><label for="roofSqft">${tr('Open roof space (sq ft)', 'खुली छत (वर्ग फ़ुट)')}</label><input id="roofSqft" name="roofSqft" type="number" min="0" step="50" placeholder="${tr('optional', 'वैकल्पिक')}" inputmode="numeric"></div>
<div class="field"><label for="kw">${tr('Solar size (kW)', 'सोलर साइज़ (kW)')}</label><input id="kw" name="kw" type="number" min="0" step="0.5" placeholder="${tr('we suggest one', 'हम सुझाएँगे')}" inputmode="decimal"><span class="hint">${tr('Leave empty for our suggestion', 'खाली छोड़ें, हम सुझाएँगे')}</span></div>
<div class="field"><label for="costPerKw">${tr('Price per kW (₹)', 'प्रति kW कीमत (₹)')}</label><input id="costPerKw" name="costPerKw" type="number" min="0" step="1000" value="${d.costPerKw}" inputmode="numeric"><span class="hint">${tr('Before subsidy. Typical: ₹55,000–65,000', 'सब्सिडी से पहले। आमतौर पर ₹55,000–65,000')}</span></div>
<div class="field full"><label class="check"><input type="checkbox" name="loanEnabled"> ${tr('I will take a loan', 'मैं लोन लूँगा/लूँगी')}</label></div>
<div class="fields full hidden" data-show="loan">
<div class="field"><label for="loanSharePct">${tr('Loan % of cost', 'लागत का कितना % लोन')}</label><input id="loanSharePct" name="loanSharePct" type="number" min="0" max="100" step="5" value="90"></div>
<div class="field"><label for="loanRate">${tr('Interest (% a year)', 'ब्याज (% सालाना)')}</label><input id="loanRate" name="loanRate" type="number" min="0" step="0.1" value="${d.loanRatePct}"></div>
<div class="field"><label for="loanYears">${tr('Loan years', 'लोन अवधि (साल)')}</label><input id="loanYears" name="loanYears" type="number" min="1" max="20" step="1" value="${d.loanTenureYears}"></div>
</div>
<details class="adv"><summary>${tr('Change assumptions', 'अनुमान बदलें')}</summary><div class="fields">
${phaseField(lang)}
${chargeFields(lang)}
<div class="field"><label for="yield">${tr('Units per kW per year', 'प्रति kW सालाना यूनिट')}</label><input id="yield" name="yield" type="number" min="800" max="2000" step="10" placeholder="${tr('from city', 'शहर के अनुसार')}"></div>
<div class="field"><label for="surplusRate">${tr('Rate for extra units sold (₹)', 'बेची गई अतिरिक्त यूनिट का रेट (₹)')}</label><input id="surplusRate" name="surplusRate" type="number" min="0" step="0.05" value="${data.common.netMetering.surplusRatePerUnit}"></div>
<div class="field"><label for="escalationPct">${tr('Bill rate rise (% a year)', 'बिजली दर बढ़ोतरी (% सालाना)')}</label><input id="escalationPct" name="escalationPct" type="number" min="0" step="0.5" value="${d.tariffEscalationPctPerYear}"></div>
<div class="field"><label for="degradationPct">${tr('Panel ageing (% a year)', 'पैनल की घटती क्षमता (% सालाना)')}</label><input id="degradationPct" name="degradationPct" type="number" min="0" step="0.1" value="${d.degradationPctPerYear}"></div>
</div></details>
</div>
</form>
<div class="card result-card" id="solar-out" aria-live="polite"></div>
</section>`;
  }

  function evForm(lang) {
    const tr = t(lang);
    const ev = common.evDefaults;
    const presets = common.evPresets.map((p) => `<option value="${p.id}"${p.id === 'car-compact-suv' ? ' selected' : ''}>${esc(lang === 'hi' ? p.labelHi : p.label)}</option>`).join('');
    return `<section class="calc" id="calculator">
<form class="card form-card" data-calc="ev" data-output="ev-out" autocomplete="off">
<h2>${icon('car')} ${tr('Vehicle and driving', 'गाड़ी और ड्राइविंग')}</h2>
<div class="fields">
<div class="field full"><label for="vehicle">${tr('Vehicle', 'गाड़ी')}</label><select id="vehicle" name="vehicle">${presets}</select></div>
<div class="field"><label for="kwhPerKm">${tr('Units per km', 'प्रति किमी यूनिट')}</label><input id="kwhPerKm" name="kwhPerKm" type="number" min="0.01" step="0.005" value="0.14" inputmode="decimal"></div>
<div class="field"><label for="kmPerMonth">${tr('Km per month', 'हर महीने किमी')}</label><input id="kmPerMonth" name="kmPerMonth" type="number" min="0" step="50" value="1000" inputmode="numeric"></div>
<div class="field"><label for="homeNight">${tr('% charged at home', 'घर पर चार्जिंग (%)')}</label><input id="homeNight" name="homeNight" type="number" min="0" max="100" step="5" value="70"></div>
<div class="field"><label for="homeDay">${tr('% charged at home, 11 am–5 pm', 'घर पर 11 से 5 बजे चार्जिंग (%)')}</label><input id="homeDay" name="homeDay" type="number" min="0" max="100" step="5" value="20"></div>
<div class="field"><label for="publicPct">${tr('% charged outside', 'बाहर चार्जिंग (%)')}</label><input id="publicPct" name="publicPct" type="number" min="0" max="100" step="5" value="10"></div>
<div class="field"><label for="publicRate">${tr('Outside charger price (₹/unit)', 'बाहर के चार्जर की कीमत (₹/यूनिट)')}</label><input id="publicRate" name="publicRate" type="number" min="0" step="0.5" value="${ev.publicChargerPerKwh}"></div>
<h3 class="field full sub">${tr('Your home connection', 'आपका घरेलू कनेक्शन')}</h3>
<div class="field"><label for="units">${tr('Home units per month (without the vehicle)', 'हर महीने घर की खपत (गाड़ी के बिना)')}</label><input id="units" name="units" type="number" min="0" step="10" value="250" inputmode="numeric"></div>
${commonBillFields('torrent-ahmedabad', lang, 5)}
<div class="field"><label for="solarSurplusKwh">${tr('Spare solar units per month', 'हर महीने बची सोलर यूनिट')}</label><input id="solarSurplusKwh" name="solarSurplusKwh" type="number" min="0" step="10" value="0"><span class="hint">${tr('0 if you have no solar', 'सोलर नहीं है तो 0')}</span></div>
<details class="adv"><summary>${tr('Petrol / diesel comparison and more', 'पेट्रोल / डीज़ल तुलना और अधिक')}</summary><div class="fields">
<div class="field"><label for="iceType">${tr('Compare with', 'किससे तुलना करें')}</label><select id="iceType" name="iceType"><option value="petrol">${tr('Petrol', 'पेट्रोल')}</option><option value="diesel">${tr('Diesel', 'डीज़ल')}</option><option value="cng">CNG</option></select></div>
<div class="field"><label for="icePrice">${tr('Fuel price (₹/L or ₹/kg)', 'ईंधन की कीमत (₹/लीटर या ₹/किग्रा)')}</label><input id="icePrice" name="icePrice" type="number" min="0" step="0.1" value="${common.fuel.petrolPerLitre}"></div>
<div class="field"><label for="iceKmPerUnit">${tr('Mileage (km/L or km/kg)', 'माइलेज (किमी/लीटर या किमी/किग्रा)')}</label><input id="iceKmPerUnit" name="iceKmPerUnit" type="number" min="1" step="1" value="15"></div>
<div class="field"><label for="years">${tr('Years to compare', 'कितने साल की तुलना')}</label><input id="years" name="years" type="number" min="1" max="15" step="1" value="${ev.years}"></div>
<div class="field"><label for="chargingLossPct">${tr('Charging loss (%)', 'चार्जिंग में नुकसान (%)')}</label><input id="chargingLossPct" name="chargingLossPct" type="number" min="0" max="30" step="1" value="${ev.chargingLossPct}"></div>
<div class="field"><label for="batteryDegradationPct">${tr('Battery ageing (% a year)', 'बैटरी की घटती क्षमता (% सालाना)')}</label><input id="batteryDegradationPct" name="batteryDegradationPct" type="number" min="0" max="10" step="0.5" value="${ev.batteryDegradationPctPerYear}"></div>
${phaseField(lang)}
${chargeFields(lang)}
</div></details>
</div>
</form>
<div class="card result-card" id="ev-out" aria-live="polite"></div>
</section>`;
  }

  function sizeForm(kw, mode, lang, defaults) {
    const tr = t(lang);
    const cityOpts = india.cities.map((c, i) => {
      const n = nameOf(c, lang), s = lang === 'hi' ? c.stateHi : c.state;
      return `<option value="${i}"${c.name === 'Delhi' ? ' selected' : ''}>${esc(n)}${s !== n ? ` (${esc(s)})` : ''}</option>`;
    }).join('');
    const sizeOpts = sizes.map((k) => `<option value="${k}"${k === kw ? ' selected' : ''}>${k} kW</option>`).join('');
    return `<section class="calc" id="calculator">
<form class="card form-card" data-calc="size" data-mode="${mode}" data-output="size-out" autocomplete="off">
<h2>${icon('home')} ${mode === 'generation' ? tr('Check for your city', 'अपने शहर के लिए देखें') : tr('Check for your home', 'अपने घर के लिए देखें')}</h2>
<div class="fields">
<div class="field"><label for="kw">${tr('Solar size', 'सोलर साइज़')}</label><select id="kw" name="kw">${sizeOpts}</select></div>
<div class="field"><label for="city">${tr('Your city', 'आपका शहर')}</label><select id="city" name="city">${cityOpts}</select></div>
<div class="field full"><span class="label">${tr('I know my', 'मुझे पता है')}</span>${seg('inputMode', [['bill', tr('Monthly bill (₹)', 'महीने का बिल (₹)')], ['units', tr('Monthly units', 'महीने की यूनिट')]], 'bill')}</div>
<div class="field full" data-show="bill"><label for="bill">${tr('Your monthly electricity bill (₹)', 'आपका महीने का बिजली बिल (₹)')}</label><input id="bill" name="bill" type="number" min="0" step="100" value="${defaults.bill}" inputmode="numeric"></div>
<div class="field full hidden" data-show="units"><label for="units">${tr('Units you use per month', 'हर महीने आपकी खपत (यूनिट)')}</label><input id="units" name="units" type="number" min="0" step="10" value="${defaults.units}" inputmode="numeric"><span class="hint">${tr('Printed on your bill. Bill for 2 months? Enter half.', 'बिल पर छपा होता है। 2 महीने का बिल हो तो आधा भरें।')}</span></div>
<details class="adv"><summary>${tr('Change price or rate', 'कीमत या रेट बदलें')}</summary><div class="fields">
<div class="field"><label for="cost">${tr('Price quoted to you (₹)', 'आपको बताई गई कीमत (₹)')}</label><input id="cost" name="cost" type="number" min="0" step="1000" inputmode="numeric"><span class="hint">${tr('Before subsidy. We fill in a typical price.', 'सब्सिडी से पहले। हमने सामान्य कीमत भरी है।')}</span></div>
<div class="field"><label for="rate">${tr('Cost of 1 unit (₹)', '1 यूनिट की कीमत (₹)')}</label><input id="rate" name="rate" type="number" min="1" step="0.1" value="${india.defaultRate}" inputmode="decimal"><span class="hint">${tr('Bill amount ÷ units on the bill', 'बिल की रकम ÷ बिल की यूनिट')}</span></div>
<div class="field"><label for="exportRate">${tr('Rate for extra units sold (₹)', 'बेची गई अतिरिक्त यूनिट का रेट (₹)')}</label><input id="exportRate" name="exportRate" type="number" min="0" step="0.05" value="${india.defaultExportRate}"></div>
</div></details>
</div>
</form>
<div class="card result-card" id="size-out" aria-live="polite"></div>
</section>`;
  }

  return { billForm, solarForm, evForm, sizeForm };
};
