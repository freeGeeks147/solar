'use strict';
const { esc, inr, inr2, t, fmtDate, icon } = require('./util');

/*
 * Gujarat bill calculators (hub + one page per DISCOM), Gujarat solar and EV calculators,
 * and the subsidy / net metering / smart-meter guides.
 * ctx: { C, data, common, PAGES, forms, adSlot, faqHtml, sizes, pricePage }
 */
module.exports = function gujaratPages(lang, ctx) {
  const { C, data, common, PAGES, forms, adSlot, faqHtml, pricePage } = ctx;
  const tr = t(lang);
  const HI = lang === 'hi';
  const Y = data.tariffYear;
  const eff = fmtDate(data.effectiveFrom, lang);
  const nm = (d) => (HI ? d.nameHi : d.name);
  const region = (d) => (HI ? d.regionHi : d.region);
  const catLabel = (c) => (HI ? c.labelHi : c.label);
  const discomFile = (d) => `${d.slug}.html`;

  function stats(items) {
    return `<section class="stats" aria-label="${tr('In short', 'संक्षेप में')}">${items.map(([ic, k, v, hl]) => `<div class="stat${hl ? ' hl' : ''}">${icon(ic)}<div><div class="k">${k}</div><div class="v">${v}</div></div></div>`).join('')}</section>`;
  }

  function slabTable(cat) {
    let prev = 0;
    const rows = cat.slabs.map((s) => {
      const label = s.upto === null ? tr(`Above ${prev} units`, `${prev} यूनिट से ऊपर`) : tr(`${prev + 1}–${s.upto} units`, `${prev + 1}–${s.upto} यूनिट`);
      prev = s.upto;
      return `<tr><td>${label}</td><td class="num">${inr2(s.rate)}</td></tr>`;
    }).join('');
    return `<div class="table-wrap"><table><thead><tr><th>${tr('Units in a month', 'महीने की यूनिट')}</th><th class="num">${tr('Price per unit', 'प्रति यूनिट दर')}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function fixedTable(fixed) {
    let rows;
    if (fixed.type === 'flat') rows = `<tr><td>${tr('All loads', 'सभी लोड')}</td><td class="num">${inr(fixed.amount)}</td></tr>`;
    else if (fixed.type === 'byPhase') rows = `<tr><td>${tr(`Single phase (up to ${fixed.singlePhaseMaxKw} kW)`, `सिंगल फ़ेज़ (${fixed.singlePhaseMaxKw} kW तक)`)}</td><td class="num">${inr(fixed.single)}</td></tr><tr><td>${tr('Three phase', 'थ्री फ़ेज़')}</td><td class="num">${inr(fixed.three)}</td></tr>`;
    else {
      let prev = 0;
      rows = fixed.steps.map((s) => {
        const label = s.uptoKw === null ? tr(`Above ${prev} kW`, `${prev} kW से ऊपर`) : prev === 0 ? tr(`Up to ${s.uptoKw} kW`, `${s.uptoKw} kW तक`) : tr(`${prev}–${s.uptoKw} kW`, `${prev}–${s.uptoKw} kW`);
        prev = s.uptoKw;
        return `<tr><td>${label}</td><td class="num">${inr(s.amount)}</td></tr>`;
      }).join('');
    }
    return `<div class="table-wrap"><table><thead><tr><th>${tr('Sanctioned load', 'स्वीकृत लोड')}</th><th class="num">${tr('Fixed charge a month', 'मासिक फ़िक्स्ड चार्ज')}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function exampleBills(discomId) {
    const rows = [100, 200, 300, 400, 500].map((u) => {
      const b = C.calcBill(data, { discom: discomId, category: 'urban', loadKw: u > 300 ? 4 : 2, units: u });
      return `<tr><td>${u} ${tr('units', 'यूनिट')}</td><td class="num"><strong>${inr(b.total)}</strong></td><td class="num">${inr2(b.effectiveRate)}</td></tr>`;
    }).join('');
    return `<div class="table-wrap"><table><thead><tr><th>${tr('Use in a month', 'महीने की खपत')}</th><th class="num">${tr('Bill', 'बिल')}</th><th class="num">${tr('Cost per unit', 'प्रति यूनिट खर्च')}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function discomPageSpec(d) {
    const g = data.tariffGroups[d.tariffGroup];
    const urban = g.categories.urban;
    const b200 = C.calcBill(data, { discom: d.id, loadKw: 2, units: 200 });
    const b300 = C.calcBill(data, { discom: d.id, loadKw: 3, units: 300 });
    const marginal300 = C.marginalRate(data, { discom: d.id, loadKw: 3, units: 300 });
    const firstRate = urban.slabs[0].rate, topRate = urban.slabs[urban.slabs.length - 1].rate;
    const isTorrent = d.tariffGroup !== 'gujarat-state';
    const solar3 = C.solarRoi(data, common, { discom: d.id, loadKw: 4, units: 300, yieldKwhPerKwYear: 1490 });
    const N = nm(d);

    const catSections = Object.keys(g.categories).map((k) => {
      const cat = g.categories[k];
      return `<div class="panel"><h3>${esc(catLabel(cat))}</h3>${slabTable(cat)}${fixedTable(cat.fixed)}</div>`;
    }).join('');

    const faqs = [
      { q: tr(`What is the ${d.name} per unit rate in ${Y}?`, `${Y} में ${N} की प्रति यूनिट दर क्या है?`), a: tr(`For homes, ${d.name} charges ${inr2(firstRate)} per unit for the first ${urban.slabs[0].upto} units a month, rising to ${inr2(topRate)} per unit at higher use. A fuel surcharge (FPPPA) of about ${inr2(g.fppaPerUnit)} per unit and electricity duty are added, so the all-in rate is usually ₹6–9 per unit.`, `घरों के लिए ${N} महीने की पहली ${urban.slabs[0].upto} यूनिट पर ${inr2(firstRate)} प्रति यूनिट लेती है, और ज़्यादा खपत पर ${inr2(topRate)} तक। इसके ऊपर लगभग ${inr2(g.fppaPerUnit)} प्रति यूनिट ईंधन सरचार्ज (FPPPA) और बिजली शुल्क जुड़ता है, इसलिए कुल दर आमतौर पर ₹6–9 प्रति यूनिट होती है।`) },
      { q: tr(`How much is the ${d.name} bill for 200 units?`, `200 यूनिट पर ${N} का बिल कितना आता है?`), a: tr(`About ${inr(b200.total)} for 200 units in a month at 2 kW load.`, `2 kW लोड पर महीने में 200 यूनिट का बिल लगभग ${inr(b200.total)}।`) },
      { q: tr(`How much is the ${d.name} bill for 300 units?`, `300 यूनिट पर ${N} का बिल कितना आता है?`), a: tr(`About ${inr(b300.total)} for 300 units in a month at 3 kW load. At that level each extra unit costs about ${inr2(marginal300)}, which is what rooftop solar saves you per unit.`, `3 kW लोड पर महीने में 300 यूनिट का बिल लगभग ${inr(b300.total)}। इस स्तर पर हर अतिरिक्त यूनिट लगभग ${inr2(marginal300)} की पड़ती है, यानी सोलर से हर यूनिट पर इतनी बचत होती है।`) },
      { q: tr('What is the fuel surcharge (FPPPA) on my bill?', 'मेरे बिल पर ईंधन सरचार्ज (FPPPA) क्या है?'), a: tr('It passes changes in fuel and power purchase costs to consumers. It is charged on every unit, changes every three months, and is printed on your bill. Enter the current figure in the calculator for an exact match.', 'यह ईंधन और बिजली खरीद की लागत में बदलाव को ग्राहकों तक पहुँचाता है। हर यूनिट पर लगता है, हर तीन महीने में बदलता है और बिल पर छपा होता है। सटीक जवाब के लिए कैलकुलेटर में मौजूदा आंकड़ा भरें।') },
      { q: tr(`Does ${d.name} bill monthly or every two months?`, `${N} का बिल हर महीने आता है या दो महीने में?`), a: isTorrent ? tr('Torrent Power home bills are generally monthly. If your bill covers two months, choose the 2-month billing period.', 'टोरेंट पावर के घरेलू बिल आमतौर पर हर महीने आते हैं। बिल दो महीने का हो तो 2 महीने की अवधि चुनें।') : tr(`${d.name} usually bills homes every two months. Choose the 2-month billing period in the calculator and enter the units from your bill.`, `${N} आमतौर पर घरों को हर दो महीने में बिल भेजती है। कैलकुलेटर में 2 महीने की अवधि चुनें और बिल की यूनिट भरें।`) },
      { q: tr(`How much can rooftop solar save on a ${d.name} bill?`, `${N} के बिल पर सोलर से कितनी बचत होगी?`), a: tr(`A home using 300 units a month would typically fit a ${solar3.kw} kW system. After the ${inr(solar3.subsidy)} subsidy it costs about ${inr(solar3.netCost)}, cuts the bill by about ${inr(solar3.savingMonthlyYear1)} a month and pays back in about ${solar3.paybackYears.toFixed(1)} years. <a href="${PAGES.solar}?discom=${d.id}&units=300&loadKw=4">Check your own numbers</a>.`, `महीने में 300 यूनिट खर्च करने वाले घर के लिए आमतौर पर ${solar3.kw} kW सिस्टम सही है। ${inr(solar3.subsidy)} सब्सिडी के बाद यह लगभग ${inr(solar3.netCost)} का पड़ता है, बिल हर महीने लगभग ${inr(solar3.savingMonthlyYear1)} कम करता है और लगभग ${solar3.paybackYears.toFixed(1)} साल में पैसा वापस। <a href="${PAGES.solar}?discom=${d.id}&units=300&loadKw=4">अपने आंकड़े देखें</a>।`) }
    ];

    return {
      file: discomFile(d),
      title: tr(`${d.name} Bill Calculator ${Y} – Unit Rate, Slabs & Charges`, `${N} बिल कैलकुलेटर ${Y} – प्रति यूनिट दर, स्लैब और चार्ज`),
      description: tr(`Calculate your ${d.name} (${d.fullName}) electricity bill with the ${Y} rates: price per unit, fixed charge, fuel surcharge and electricity duty.`, `${N} (${d.fullNameHi}) का बिजली बिल ${Y} की दरों से निकालें: प्रति यूनिट दर, फ़िक्स्ड चार्ज, ईंधन सरचार्ज और बिजली शुल्क।`),
      h1: tr(`${d.name} Electricity Bill Calculator ${Y}`, `${N} बिजली बिल कैलकुलेटर ${Y}`),
      lede: tr(`Type the units from your bill to see your ${esc(d.name)} bill, line by line. Rates from ${eff}.`, `अपने बिल की यूनिट भरें और ${esc(N)} का बिल लाइन-दर-लाइन देखें। दरें ${eff} से।`),
      heroExtra: stats([
        ['rupee', tr('Price per unit', 'प्रति यूनिट दर'), tr(`${inr2(firstRate)} to ${inr2(topRate)}`, `${inr2(firstRate)} से ${inr2(topRate)}`), true],
        ['bolt', tr('200 units a month', 'महीने में 200 यूनिट'), tr(`about ${inr(b200.total)}`, `लगभग ${inr(b200.total)}`)],
        ['bolt', tr('300 units a month', 'महीने में 300 यूनिट'), tr(`about ${inr(b300.total)}`, `लगभग ${inr(b300.total)}`)],
        ['home', tr('Covers', 'क्षेत्र'), esc(region(d))]
      ]),
      crumbs: [{ name: tr('Gujarat bill calculator', 'गुजरात बिल कैलकुलेटर'), file: PAGES.gujaratBill }, { name: tr(`${d.name} bill calculator`, `${N} बिल कैलकुलेटर`), file: discomFile(d) }],
      app: true,
      faqs,
      body: `${forms.billForm(d.id, lang)}
${adSlot('after-calc')}
<section class="prose">
<h2>${tr(`${esc(d.name)} home electricity rates ${esc(Y)}`, `${esc(N)} घरेलू बिजली दरें ${esc(Y)}`)}</h2>
<p>${tr(`From the GERC tariff order for ${esc(Y)}, effective ${eff}. Slabs are per month. The more units you use, the higher the price of the extra units.`, `${esc(Y)} के GERC टैरिफ़ आदेश से, ${eff} से लागू। स्लैब हर महीने के हिसाब से हैं। जितनी ज़्यादा खपत, अतिरिक्त यूनिट उतनी महँगी।`)}</p>
</section>
<div class="cols">${catSections}</div>
<section class="prose">
<h2>${tr('Other charges on your bill', 'बिल पर बाकी चार्ज')}</h2>
<ul class="ticks">
<li><strong>${tr('Fuel surcharge (FPPPA):', 'ईंधन सरचार्ज (FPPPA):')}</strong> ${tr(`about ${inr2(g.fppaPerUnit)} on every unit. Changes every three months.`, `हर यूनिट पर लगभग ${inr2(g.fppaPerUnit)}। हर तीन महीने में बदलता है।`)}</li>
<li><strong>${tr('Electricity duty:', 'बिजली शुल्क:')}</strong> ${tr(`a state tax, about ${data.common.electricityDutyPct.urban}% in cities and ${data.common.electricityDutyPct.rural}% in villages.`, `राज्य का टैक्स, शहरों में लगभग ${data.common.electricityDutyPct.urban}% और गाँवों में ${data.common.electricityDutyPct.rural}%।`)}</li>
<li><strong>${tr('Prepaid smart meter:', 'प्रीपेड स्मार्ट मीटर:')}</strong> ${tr(`${data.common.prepaidRebatePctOnEnergy}% off the energy charge.`, `बिजली चार्ज पर ${data.common.prepaidRebatePctOnEnergy}% छूट।`)}</li>
<li><strong>${tr('Smart meter daytime discount:', 'स्मार्ट मीटर दिन की छूट:')}</strong> ${tr('60 paise off every unit used between 11 am and 5 pm.', 'सुबह 11 से शाम 5 बजे के बीच हर यूनिट पर 60 पैसे छूट।')} <a href="${PAGES.tou}">${tr('How it works', 'यह कैसे काम करता है')}</a></li>
</ul>
<h2>${tr(`Sample ${esc(d.name)} bills (one month)`, `${esc(N)} के नमूना बिल (एक महीना)`)}</h2>
${exampleBills(d.id)}
<p class="note">${tr('City area, regular meter, typical fuel surcharge.', 'शहरी क्षेत्र, सामान्य मीटर, सामान्य ईंधन सरचार्ज।')}</p>
<h2>${tr(`Areas served by ${esc(d.name)}`, `${esc(N)} के क्षेत्र`)}</h2>
<p>${(HI ? d.areasHi : d.areas).map(esc).join(', ')}. ${tr(`Head office: ${esc(d.hq)}.`, `मुख्य कार्यालय: ${esc(d.hqHi)}।`)} ${tr('Official website', 'आधिकारिक वेबसाइट')}: <a href="${d.website}" rel="nofollow noopener">${esc(d.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a></p>
<p class="note">${tr('Rates are taken from the public tariff order and other public sources; some may differ slightly from your bill.', 'दरें सार्वजनिक टैरिफ़ आदेश और अन्य सार्वजनिक स्रोतों से ली गई हैं; कुछ आपके बिल से थोड़ी अलग हो सकती हैं।')} <a href="${d.sourceUrl}" rel="nofollow noopener">${tr('Source', 'स्रोत')}</a></p>
</section>
${adSlot('mid')}
${faqHtml(faqs, lang)}`
    };
  }

  function hubSpec() {
    const g = data.tariffGroups['gujarat-state'].categories.urban;
    const faqs = [
      { q: tr(`What is the electricity unit rate in Gujarat in ${Y}?`, `${Y} में गुजरात में बिजली की प्रति यूनिट दर क्या है?`), a: tr(`For homes on UGVCL, MGVCL, DGVCL and PGVCL in cities: ${inr2(g.slabs[0].rate)} a unit for the first 50 units, ${inr2(g.slabs[1].rate)} for 51–100, ${inr2(g.slabs[2].rate)} for 101–250 and ${inr2(g.slabs[3].rate)} above 250 units a month, plus fuel surcharge and duty. Torrent Power has its own rates for Ahmedabad, Gandhinagar and Surat.`, `शहरों में UGVCL, MGVCL, DGVCL और PGVCL के घरों के लिए: महीने की पहली 50 यूनिट पर ${inr2(g.slabs[0].rate)}, 51–100 पर ${inr2(g.slabs[1].rate)}, 101–250 पर ${inr2(g.slabs[2].rate)} और 250 से ऊपर ${inr2(g.slabs[3].rate)} प्रति यूनिट, साथ में ईंधन सरचार्ज और शुल्क। अहमदाबाद, गांधीनगर और सूरत में टोरेंट पावर की अपनी दरें हैं।`) },
      { q: tr('Which electricity company supplies my area?', 'मेरे इलाके में कौन-सी बिजली कंपनी है?'), a: tr('Ahmedabad, Gandhinagar and Surat cities: Torrent Power. North Gujarat: UGVCL. Central Gujarat: MGVCL. South Gujarat: DGVCL. Saurashtra and Kutch: PGVCL. The name is printed at the top of your bill.', 'अहमदाबाद, गांधीनगर और सूरत शहर: टोरेंट पावर। उत्तर गुजरात: UGVCL। मध्य गुजरात: MGVCL। दक्षिण गुजरात: DGVCL। सौराष्ट्र और कच्छ: PGVCL। कंपनी का नाम बिल के ऊपर छपा होता है।') },
      { q: tr(`Did Gujarat electricity rates change in ${Y}?`, `क्या ${Y} में गुजरात की बिजली दरें बदलीं?`), a: tr('The base rates stayed the same. The prepaid smart meter discount went up to 3%, and the smart meter daytime discount (60 paise a unit) now runs from 11 am to 5 pm.', 'मूल दरें वही रहीं। प्रीपेड स्मार्ट मीटर की छूट बढ़कर 3% हुई, और स्मार्ट मीटर की दिन की छूट (60 पैसे प्रति यूनिट) अब सुबह 11 से शाम 5 बजे तक मिलती है।') }
    ];
    return {
      file: PAGES.gujaratBill,
      title: tr(`Gujarat Electricity Bill Calculator ${Y} – UGVCL, MGVCL, DGVCL, PGVCL, Torrent`, `गुजरात बिजली बिल कैलकुलेटर ${Y} – UGVCL, MGVCL, DGVCL, PGVCL, टोरेंट`),
      description: tr(`Free Gujarat electricity bill calculator with ${Y} rates for UGVCL, MGVCL, DGVCL, PGVCL and Torrent Power.`, `UGVCL, MGVCL, DGVCL, PGVCL और टोरेंट पावर के लिए ${Y} की दरों वाला मुफ़्त गुजरात बिजली बिल कैलकुलेटर।`),
      h1: tr(`Gujarat Electricity Bill Calculator ${Y}`, `गुजरात बिजली बिल कैलकुलेटर ${Y}`),
      lede: tr('Your bill, line by line, for every Gujarat electricity company.', 'गुजरात की हर बिजली कंपनी के लिए आपका बिल, लाइन-दर-लाइन।'),
      crumbs: [{ name: tr('Gujarat bill calculator', 'गुजरात बिल कैलकुलेटर'), file: PAGES.gujaratBill }],
      app: true,
      faqs,
      body: `${forms.billForm('ugvcl', lang)}
${adSlot('after-calc')}
<section><h2 class="section-title">${tr('Choose your electricity company', 'अपनी बिजली कंपनी चुनें')}</h2>
<ul class="tool-grid">${data.discoms.map((d) => `<li><a href="${discomFile(d)}">${icon('bolt')}<strong>${esc(nm(d))}</strong><small>${esc(region(d))}</small></a></li>`).join('')}</ul></section>
${faqHtml(faqs, lang)}`
    };
  }

  function solarSpec() {
    const ex = C.solarRoi(data, common, { discom: 'ugvcl', loadKw: 4, units: 300, yieldKwhPerKwYear: 1500 });
    const faqs = [
      { q: tr('How many kW of solar do I need in Gujarat?', 'गुजरात में मुझे कितने kW सोलर चाहिए?'), a: tr(`1 kW makes about 1,500 units a year in Gujarat. A home using 300 units a month (3,600 a year) needs about ${ex.kw} kW. You can install up to your sanctioned load.`, `गुजरात में 1 kW साल में लगभग 1,500 यूनिट बनाता है। महीने में 300 यूनिट (साल में 3,600) खर्च करने वाले घर को लगभग ${ex.kw} kW चाहिए। आप अपने स्वीकृत लोड तक सोलर लगा सकते हैं।`) },
      { q: tr('How long does rooftop solar take to pay back in Gujarat?', 'गुजरात में सोलर का पैसा कितने समय में वापस आता है?'), a: tr(`Usually 2.5 to 5 years after the subsidy. For example, ${ex.kw} kW on a UGVCL home using 300 units a month costs about ${inr(ex.netCost)} after subsidy and pays back in about ${ex.paybackYears.toFixed(1)} years.`, `सब्सिडी के बाद आमतौर पर 2.5 से 5 साल। उदाहरण: 300 यूनिट मासिक खपत वाले UGVCL घर पर ${ex.kw} kW सब्सिडी के बाद लगभग ${inr(ex.netCost)} का पड़ता है और लगभग ${ex.paybackYears.toFixed(1)} साल में पैसा वापस आ जाता है।`) },
      { q: tr('Why are these savings different from other calculators?', 'यह बचत दूसरे कैलकुलेटर से अलग क्यों है?'), a: tr('Most calculators multiply units by one flat rate. This one works out your actual bill, slab by slab with all charges, before and after solar.', 'ज़्यादातर कैलकुलेटर यूनिट को एक ही दर से गुणा करते हैं। यह कैलकुलेटर सोलर से पहले और बाद, हर स्लैब और सभी चार्ज के साथ, आपका असली बिल निकालता है।') }
    ];
    return {
      file: PAGES.solar,
      title: tr(`Rooftop Solar Calculator Gujarat ${Y} – Subsidy, Savings & Payback`, `गुजरात रूफ़टॉप सोलर कैलकुलेटर ${Y} – सब्सिडी, बचत और पैसा वापसी`),
      description: tr('Solar size, subsidy, new electricity bill and payback for UGVCL, MGVCL, DGVCL, PGVCL and Torrent Power homes, worked out on the exact tariff.', 'UGVCL, MGVCL, DGVCL, PGVCL और टोरेंट पावर के घरों के लिए सोलर साइज़, सब्सिडी, नया बिल और पैसा वापसी, सटीक टैरिफ़ पर।'),
      h1: tr('Rooftop Solar Savings Calculator (Gujarat)', 'रूफ़टॉप सोलर बचत कैलकुलेटर (गुजरात)'),
      lede: tr("Works out your bill on your company's exact rates, before and after solar.", 'सोलर से पहले और बाद, आपकी कंपनी की सटीक दरों पर आपका बिल।'),
      crumbs: [{ name: tr('Gujarat solar calculator', 'गुजरात सोलर कैलकुलेटर'), file: PAGES.solar }],
      app: true,
      faqs,
      body: `${forms.solarForm(lang)}
${adSlot('after-calc')}
${faqHtml(faqs, lang)}`
    };
  }

  function evSpec() {
    const ex = C.evCost(data, common, { discom: 'torrent-ahmedabad', loadKw: 5, units: 250, kwhPerKm: 0.14, kmPerMonth: 1000, split: { homeNight: 100 }, publicRate: common.evDefaults.publicChargerPerKwh, ice: { pricePerUnit: common.fuel.petrolPerLitre, kmPerUnit: 15 } });
    const faqs = [
      { q: tr('What does it cost to charge an EV at home in Gujarat?', 'गुजरात में घर पर EV चार्ज करने का खर्च कितना है?'), a: tr(`Usually ₹6.5–9 per unit, because charging adds units at your highest slab. A compact SUV doing 1,000 km a month adds about ${inr(ex.scenarios.homeNight.total)} to an Ahmedabad home's bill, about ${inr2(ex.scenarios.homeNight.perKm)} per km.`, `आमतौर पर ₹6.5–9 प्रति यूनिट, क्योंकि चार्जिंग की यूनिट आपके सबसे ऊँचे स्लैब में जुड़ती हैं। महीने में 1,000 किमी चलने वाली कॉम्पैक्ट SUV अहमदाबाद के घर के बिल में लगभग ${inr(ex.scenarios.homeNight.total)} जोड़ती है, यानी लगभग ${inr2(ex.scenarios.homeNight.perKm)} प्रति किमी।`) },
      { q: tr('Is it cheaper to charge during the day?', 'क्या दिन में चार्ज करना सस्ता है?'), a: tr('With a smart meter, units used between 11 am and 5 pm get 60 paise off. With rooftop solar, daytime charging uses your own spare solar units.', 'स्मार्ट मीटर हो तो सुबह 11 से शाम 5 बजे की यूनिट पर 60 पैसे छूट मिलती है। सोलर हो तो दिन में चार्जिंग आपकी अपनी बची सोलर यूनिट से होती है।') },
      { q: tr('How much does public EV charging cost?', 'बाहर के चार्जर पर कितना खर्च आता है?'), a: tr(`Public fast chargers usually charge ₹18–25 per unit, two to three times the home rate: about ${inr2(ex.scenarios.public.perKm)} per km for a compact SUV.`, `बाहर के फ़ास्ट चार्जर आमतौर पर ₹18–25 प्रति यूनिट लेते हैं, घर से दो-तीन गुना: कॉम्पैक्ट SUV के लिए लगभग ${inr2(ex.scenarios.public.perKm)} प्रति किमी।`) }
    ];
    return {
      file: PAGES.ev,
      title: tr(`EV Charging Cost Calculator Gujarat ${Y} – ₹/km at Home vs Public`, `गुजरात EV चार्जिंग खर्च कैलकुलेटर ${Y} – घर बनाम बाहर ₹/किमी`),
      description: tr('EV charging cost per month and per km on your Gujarat electricity bill, compared with petrol, diesel and CNG.', 'गुजरात के बिजली बिल पर EV चार्जिंग का मासिक और प्रति किमी खर्च, पेट्रोल, डीज़ल और CNG से तुलना।'),
      h1: tr('Electric Vehicle Charging Cost (Gujarat)', 'इलेक्ट्रिक गाड़ी चार्जिंग खर्च (गुजरात)'),
      lede: tr('What charging adds to your electricity bill, the cheapest time to charge, and what you save over petrol, diesel or CNG.', 'चार्जिंग से बिजली बिल कितना बढ़ता है, सबसे सस्ता समय कौन-सा है, और पेट्रोल, डीज़ल या CNG से कितनी बचत।'),
      crumbs: [{ name: tr('EV charging cost', 'EV चार्जिंग खर्च'), file: PAGES.ev }],
      app: true,
      faqs,
      body: `${forms.evForm(lang)}
${adSlot('after-calc')}
${faqHtml(faqs, lang)}`
    };
  }

  function subsidySpec() {
    const s = common.pmSuryaGhar;
    const rows = [1, 2, 3, 4, 5, 10].map((kw) => {
      const sub = C.pmSuryaGharSubsidy(common, kw);
      const p = C.sizePrice(ctx.india, kw).mid;
      return `<tr><td><a href="${pricePage(kw)}">${kw} kW</a></td><td class="num">${inr(p)}</td><td class="num">${inr(sub)}</td><td class="num"><strong>${inr(p - sub)}</strong></td></tr>`;
    }).join('');
    return {
      file: PAGES.subsidy,
      title: tr('PM Surya Ghar Subsidy 2026 – Amount per kW & How to Apply', 'पीएम सूर्य घर सब्सिडी 2026 – प्रति kW रकम और आवेदन कैसे करें'),
      description: tr('PM Surya Ghar Muft Bijli Yojana subsidy for rooftop solar: ₹30,000 per kW up to 2 kW, ₹18,000 for the 3rd kW, maximum ₹78,000. Cost after subsidy and steps to apply.', 'पीएम सूर्य घर मुफ़्त बिजली योजना: 2 kW तक ₹30,000 प्रति kW, तीसरे kW पर ₹18,000, अधिकतम ₹78,000। सब्सिडी के बाद खर्च और आवेदन के कदम।'),
      h1: tr('PM Surya Ghar Subsidy', 'पीएम सूर्य घर सब्सिडी'),
      lede: tr('How much the government pays back for rooftop solar, what you pay after it, and how to apply.', 'रूफ़टॉप सोलर पर सरकार कितना वापस देती है, उसके बाद आप कितना देते हैं, और आवेदन कैसे करें।'),
      heroExtra: stats([
        ['gift', '1 kW', inr(s.perKwFirst2)],
        ['gift', '2 kW', inr(s.perKwFirst2 * 2)],
        ['gift', tr('3 kW or more', '3 kW या ज़्यादा'), inr(s.cap), true]
      ]),
      crumbs: [{ name: tr('PM Surya Ghar subsidy', 'पीएम सूर्य घर सब्सिडी'), file: PAGES.subsidy }],
      body: `<section class="prose">
<h2>${tr('Cost after subsidy', 'सब्सिडी के बाद खर्च')}</h2>
<div class="table-wrap"><table><thead><tr><th>${tr('System', 'सिस्टम')}</th><th class="num">${tr('Typical price', 'सामान्य कीमत')}</th><th class="num">${tr('Subsidy', 'सब्सिडी')}</th><th class="num">${tr('You pay', 'आप देंगे')}</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="note">${tr('Only for homes, and only for on-grid systems (no battery) with made-in-India panels. Paid into your bank account after the system is installed and the net meter is fitted.', 'केवल घरों के लिए, और केवल ऑन-ग्रिड सिस्टम (बिना बैटरी) पर जिसमें भारत में बने पैनल हों। सिस्टम लगने और नेट मीटर लगने के बाद पैसा बैंक खाते में आता है।')}</p>
<h2>${tr('How to apply', 'आवेदन कैसे करें')}</h2>
<ol class="steps">
<li>${tr(`Register on the <a href="${s.url}" rel="nofollow noopener">national PM Surya Ghar portal</a> with your electricity consumer number and mobile number.`, `अपने बिजली उपभोक्ता नंबर और मोबाइल नंबर से <a href="${s.url}" rel="nofollow noopener">पीएम सूर्य घर राष्ट्रीय पोर्टल</a> पर रजिस्टर करें।`)}</li>
<li>${tr('Apply for rooftop solar and wait for approval from your electricity company.', 'रूफ़टॉप सोलर के लिए आवेदन करें और बिजली कंपनी की मंज़ूरी का इंतज़ार करें।')}</li>
<li>${tr('Choose a vendor registered with your electricity company and get the system installed.', 'अपनी बिजली कंपनी में रजिस्टर्ड वेंडर चुनें और सिस्टम लगवाएँ।')}</li>
<li>${tr('Submit the installation details and apply for the net meter.', 'इंस्टॉलेशन का विवरण जमा करें और नेट मीटर के लिए आवेदन करें।')}</li>
<li>${tr('After the net meter is fitted and checked, submit your bank details for the subsidy.', 'नेट मीटर लगने और जाँच के बाद सब्सिडी के लिए बैंक विवरण जमा करें।')}</li>
</ol>
<p><a class="cta" href="${PAGES.home}">${tr('See prices and savings by size →', 'साइज़ के अनुसार कीमत और बचत देखें →')}</a></p>
</section>`
    };
  }

  function netMeteringSpec() {
    return {
      file: PAGES.netMetering,
      title: tr('Net Metering for Rooftop Solar – How Extra Units Are Paid', 'रूफ़टॉप सोलर नेट मीटरिंग – अतिरिक्त यूनिट का भुगतान कैसे होता है'),
      description: tr('How net metering works for rooftop solar: units used at home, units sent to the grid, and what you are paid for extra units.', 'रूफ़टॉप सोलर में नेट मीटरिंग कैसे काम करती है: घर में इस्तेमाल यूनिट, ग्रिड को भेजी यूनिट और अतिरिक्त यूनिट का भुगतान।'),
      h1: tr('Net Metering, Simply Explained', 'नेट मीटरिंग, आसान भाषा में'),
      lede: tr('What happens to the solar units you send to the grid, and why sizing to your own use pays back fastest.', 'ग्रिड को भेजी गई सोलर यूनिट का क्या होता है, और अपनी खपत के बराबर साइज़ क्यों सबसे फ़ायदेमंद है।'),
      crumbs: [{ name: tr('Net metering', 'नेट मीटरिंग'), file: PAGES.netMetering }],
      body: `<section class="prose">
<h2>${tr('How it works', 'यह कैसे काम करती है')}</h2>
<p>${tr('A two-way (net) meter counts the units you take from the grid and the units your panels send to it. Each billing period, the units sent are subtracted from the units taken, and you pay only for the difference.', 'दो-तरफ़ा (नेट) मीटर ग्रिड से ली गई और पैनल से ग्रिड को भेजी गई यूनिट गिनता है। हर बिल अवधि में भेजी गई यूनिट, ली गई यूनिट में से घटा दी जाती हैं, और आप केवल अंतर का भुगतान करते हैं।')}</p>
<h2>${tr('Extra units', 'अतिरिक्त यूनिट')}</h2>
<p>${tr(`If you send more than you take in a billing period, the company buys the extra at a low rate (about ₹${data.common.netMetering.surplusRatePerUnit} a unit in Gujarat). Each unit you use yourself is worth ₹6–9, so a system that makes about as much as you use pays back fastest.`, `अगर किसी बिल अवधि में आप लेने से ज़्यादा भेजते हैं, तो कंपनी अतिरिक्त यूनिट कम दर पर खरीदती है (गुजरात में लगभग ₹${data.common.netMetering.surplusRatePerUnit} प्रति यूनिट)। खुद इस्तेमाल की गई हर यूनिट ₹6–9 की होती है, इसलिए खपत के बराबर बनाने वाला सिस्टम सबसे जल्दी पैसा लौटाता है।`)}</p>
<h2>${tr('How big can my system be?', 'मेरा सिस्टम कितना बड़ा हो सकता है?')}</h2>
<p>${tr('Up to your sanctioned load. For a bigger system, apply for a load increase first.', 'आपके स्वीकृत लोड तक। बड़ा सिस्टम चाहिए तो पहले लोड बढ़वाने का आवेदन करें।')}</p>
<h2>${tr('Things that change your savings', 'बचत पर असर डालने वाली बातें')}</h2>
<ul class="ticks">
<li>${tr('Rainy months (June to September) make 25–40% less.', 'बारिश के महीने (जून से सितंबर) में 25–40% कम उत्पादन।')}</li>
<li>${tr('Shade from water tanks, walls or nearby buildings cuts output a lot.', 'पानी की टंकी, दीवार या पास की इमारत की छाया उत्पादन बहुत घटाती है।')}</li>
<li>${tr('The fixed charge stays on the bill even if your net units are zero.', 'नेट यूनिट शून्य होने पर भी फ़िक्स्ड चार्ज बिल पर रहता है।')}</li>
</ul>
<p><a class="cta" href="${PAGES.home}">${tr('Find the right solar size →', 'सही सोलर साइज़ चुनें →')}</a></p>
</section>`
    };
  }

  function touSpec() {
    return {
      file: PAGES.tou,
      title: tr('Smart Meter Daytime Discount Gujarat – 60 Paise Off 11 am to 5 pm', 'गुजरात स्मार्ट मीटर दिन की छूट – सुबह 11 से शाम 5 बजे 60 पैसे कम'),
      description: tr('Gujarat smart meter discount: 60 paise per unit for use between 11 am and 5 pm, plus 3% off for prepaid meters. Who gets it and how much it saves.', 'गुजरात स्मार्ट मीटर छूट: सुबह 11 से शाम 5 बजे की खपत पर 60 पैसे प्रति यूनिट, और प्रीपेड मीटर पर 3% छूट। किसे मिलती है और कितनी बचत।'),
      h1: tr('Smart Meter Discount in Gujarat', 'गुजरात में स्मार्ट मीटर छूट'),
      lede: tr(`From ${eff}, smart-meter homes pay less for electricity used in the daytime.`, `${eff} से, स्मार्ट मीटर वाले घरों को दिन में इस्तेमाल बिजली पर कम देना होता है।`),
      heroExtra: stats([
        ['clock', tr('Discount hours', 'छूट का समय'), tr('11 am to 5 pm', 'सुबह 11 से शाम 5'), true],
        ['rupee', tr('Discount', 'छूट'), tr('60 paise a unit', '60 पैसे प्रति यूनिट')],
        ['wallet', tr('Prepaid meter', 'प्रीपेड मीटर'), tr('3% off energy charge', 'बिजली चार्ज पर 3% छूट')]
      ]),
      crumbs: [{ name: tr('Smart meter discount', 'स्मार्ट मीटर छूट'), file: PAGES.tou }],
      body: `<section class="prose">
<h2>${tr(`What changed in ${esc(Y)}`, `${esc(Y)} में क्या बदला`)}</h2>
<ul class="ticks">
<li>${tr('The 60 paise discount now covers <strong>11 am to 5 pm</strong> (6 hours), up from 11 am to 3 pm.', '60 पैसे की छूट अब <strong>सुबह 11 से शाम 5 बजे</strong> (6 घंटे) तक है, पहले 11 से 3 बजे तक थी।')}</li>
<li>${tr('It now applies to smart meters on monthly bills too, not only prepaid ones.', 'अब यह बाद में भुगतान वाले स्मार्ट मीटर पर भी लागू है, केवल प्रीपेड पर नहीं।')}</li>
<li>${tr(`The prepaid meter discount went up from 2% to <strong>${data.common.prepaidRebatePctOnEnergy}%</strong>.`, `प्रीपेड मीटर की छूट 2% से बढ़कर <strong>${data.common.prepaidRebatePctOnEnergy}%</strong> हुई।`)}</li>
</ul>
<h2>${tr('Who gets it', 'किसे मिलती है')}</h2>
<p>${tr('Homes with a smart meter. Ordinary meters cannot record the time of use, so the discount does not apply.', 'स्मार्ट मीटर वाले घरों को। सामान्य मीटर समय रिकॉर्ड नहीं करते, इसलिए उन पर छूट नहीं मिलती।')}</p>
<h2>${tr('How much it saves', 'कितनी बचत होती है')}</h2>
<p>${tr('Moving 100 units a month (washing machine, water heater, pump, EV charging) into 11 am–5 pm saves about ₹69 a month including tax.', 'महीने की 100 यूनिट (वॉशिंग मशीन, गीज़र, पंप, EV चार्जिंग) को 11 से 5 बजे के बीच करने से टैक्स मिलाकर लगभग ₹69 महीने की बचत।')} <a href="${PAGES.gujaratBill}">${tr('Try the bill calculator', 'बिल कैलकुलेटर आज़माएँ')}</a>.</p>
</section>`
    };
  }

  return [hubSpec(), ...data.discoms.map(discomPageSpec), solarSpec(), evSpec(), subsidySpec(), netMeteringSpec(), touSpec()];
};
