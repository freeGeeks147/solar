'use strict';
const { esc, inr, inr2, num, t, fmtDate, icon, range } = require('./util');

/*
 * Bill and rooftop-solar calculators for states other than Gujarat (data/states/*.json).
 * Each state has an electricity bill page and a solar page, in English and Hindi, plus the
 * state's own language where the data lists it (Marathi for Maharashtra).
 * Rates come from public sources and are shown as estimates.
 * ctx: { C, common, india, forms (per state), adSlot, faqHtml, PAGES, pricePage }
 */
const billFile = (s) => `${s.stateSlug}-electricity-bill-calculator.html`;
const solarFile = (s) => `solar-rooftop-calculator-${s.stateSlug}.html`;

function statePages(state, lang, ctx) {
  const { C, common, india, forms, adSlot, faqHtml, PAGES, pricePage } = ctx;
  const tr = t(lang);
  const L = (o) => (o ? tr(o.en, o.hi || o.en, o.mr) : '');
  const S = tr(state.state, state.stateHi, state.stateMr);
  const Y = state.tariffYear;
  const eff = fmtDate(state.effectiveFrom, lang);
  const nm = (x) => tr(x.name, x.nameHi || x.name, x.nameMr);
  const d0 = state.discoms[0];
  const group = state.tariffGroups[d0.tariffGroup];
  const cats = Object.keys(group.categories);
  const urban = group.categories.urban;
  const dutyU = state.common.electricityDutyPct.urban;
  const fuel = L(state.fuelLabel);
  const U = tr('units', 'यूनिट', 'युनिट');
  const load = (u) => (u > 300 ? 4 : u > 150 ? 3 : 2);
  const bill = (u, cat = 'urban') => C.calcBill(state, { discom: d0.id, category: cat, loadKw: load(u), units: u });
  const est = `<span class="est">${tr('estimate', 'अनुमान', 'अंदाज')}</span>`;

  function stats(items) {
    return `<section class="stats" aria-label="${tr('In short', 'संक्षेप में', 'थोडक्यात')}">${items.map(([ic, k, v, hl]) => `<div class="stat${hl ? ' hl' : ''}">${icon(ic)}<div><div class="k">${k}</div><div class="v">${v}</div></div></div>`).join('')}</section>`;
  }

  function slabTable(cat) {
    let prev = 0;
    const rows = cat.slabs.map((s) => {
      const label = s.upto === null ? tr(`Above ${prev} units`, `${prev} यूनिट से ऊपर`, `${prev} युनिटपेक्षा जास्त`) : tr(`${prev + 1}–${s.upto} units`, `${prev + 1}–${s.upto} यूनिट`, `${prev + 1}–${s.upto} युनिट`);
      prev = s.upto;
      const rate = s.rate === 0 ? `<strong>${tr('Free', 'मुफ़्त', 'मोफत')}</strong>` : inr2(s.rate);
      return `<tr><td>${label}</td><td class="num">${rate}</td></tr>`;
    }).join('');
    return `<div class="table-wrap"><table><thead><tr><th>${tr('Units in a month', 'महीने की यूनिट', 'महिन्याचे युनिट')}</th><th class="num">${tr('Price per unit', 'प्रति यूनिट दर', 'प्रति युनिट दर')}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function fixedTable(fixed) {
    let rows;
    if (fixed.type === 'byPhase') {
      rows = `<tr><td>${tr('Single phase', 'सिंगल फ़ेज़', 'सिंगल फेज')}</td><td class="num">${inr(fixed.single)}</td></tr><tr><td>${tr('Three phase', 'थ्री फ़ेज़', 'थ्री फेज')}</td><td class="num">${inr(fixed.three)}</td></tr>`;
    } else if (fixed.type === 'perKw') {
      rows = `<tr><td>${tr('Per kW of sanctioned load', 'स्वीकृत लोड के प्रति kW', 'मंजूर भाराच्या प्रति kW')}</td><td class="num">${inr(fixed.perKw)}</td></tr>`;
    } else if (fixed.type === 'byUnits') {
      let prev = 0;
      rows = fixed.steps.map((s) => {
        const r = `<tr><td>${tr(`${prev ? prev + 1 : 'Up to'}${prev ? '–' : ' '}${s.uptoUnits} units a month`, `महीने में ${prev ? `${prev + 1}–` : ''}${s.uptoUnits} यूनिट${prev ? '' : ' तक'}`)}</td><td class="num">${inr(s.amount)}</td></tr>`;
        prev = s.uptoUnits;
        return r;
      }).join('') + `<tr><td>${tr(`Above ${prev} units: for every ${fixed.perBlock.units} units`, `${prev} यूनिट से ऊपर: हर ${fixed.perBlock.units} यूनिट पर`)}</td><td class="num">${inr(fixed.perBlock.amount)}</td></tr>`;
    } else {
      rows = `<tr><td>${tr('Fixed charge', 'फ़िक्स्ड चार्ज', 'स्थिर आकार')}</td><td class="num">${inr(fixed.amount)}</td></tr>`;
    }
    return `<div class="table-wrap"><table><thead><tr><th>${tr('Fixed charge', 'फ़िक्स्ड चार्ज', 'स्थिर आकार')}</th><th class="num">${tr('A month', 'प्रति माह', 'दरमहा')}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const exampleUnits = [100, 200, 300, 400, 500];
  function exampleBills() {
    const head = cats.map((k) => `<th class="num">${esc(tr(group.categories[k].label, group.categories[k].labelHi, group.categories[k].labelMr))}</th>`).join('');
    const rows = exampleUnits.map((u) => `<tr><td>${u} ${U}</td>${cats.map((k) => `<td class="num"><strong>${inr(bill(u, k).total)}</strong></td>`).join('')}</tr>`).join('');
    return `<div class="table-wrap"><table><thead><tr><th>${tr('Use in a month', 'महीने की खपत', 'महिन्याचा वापर')}</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const companies = `<ul class="ticks">${state.discoms.map((d) => `<li><strong>${esc(nm(d))}</strong> – ${esc(tr(d.region, d.regionHi, d.regionMr))}. <a href="${d.website}" rel="nofollow noopener">${esc(d.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a></li>`).join('')}</ul>`;
  const schemes = (state.schemes || []).map((x) => `<p class="callout">${icon('gift')}<span>${esc(L(x))}</span></p>`).join('');
  const sourceLine = `<p class="note">${tr(`Source: ${esc(state.orderName)} (${esc(state.regulator.name)}) and other public sources, effective ${eff}.`, `स्रोत: ${esc(state.regulator.name)} का टैरिफ़ आदेश और अन्य सार्वजनिक स्रोत, ${eff} से लागू।`, `स्रोत: ${esc(state.regulator.name)} चा दर आदेश व इतर सार्वजनिक स्रोत, ${eff} पासून लागू.`)} <a href="${state.sourceUrl}" rel="nofollow noopener">${tr('Tariff order', 'टैरिफ़ आदेश', 'दर आदेश')}</a> · <a href="${state.regulator.url}" rel="nofollow noopener">${esc(state.regulator.name.replace(/.*\((.*)\)/, '$1'))}</a></p>`;
  const estimateBox = `<p class="callout">${icon('info')}<span>${tr(
    `<strong>These ${esc(state.state)} rates are our estimates.</strong> We could not check every figure against the official tariff order, so treat the bill as a close guide, not an exact amount. Copy the ${esc(fuel)} and duty from your bill for a closer answer.`,
    `<strong>${esc(S)} की ये दरें हमारे अनुमान हैं।</strong> हर आंकड़ा आधिकारिक टैरिफ़ आदेश से मिलाया नहीं जा सका, इसलिए बिल को सटीक रकम नहीं, एक नज़दीकी अनुमान मानें। ज़्यादा सटीक जवाब के लिए ${esc(fuel)} और शुल्क अपने बिल से भरें।`,
    `<strong>${esc(S)}चे हे दर आमचे अंदाज आहेत.</strong> प्रत्येक आकडा अधिकृत दर आदेशाशी पडताळता आला नाही, त्यामुळे बिल अचूक रक्कम नव्हे तर जवळचा अंदाज समजा. अधिक अचूक उत्तरासाठी ${esc(fuel)} व शुल्क तुमच्या बिलावरून भरा.`)}</span></p>`;

  // ---------- Bill page ----------
  const firstRate = urban.slabs.find((s) => s.rate > 0).rate;
  const topRate = urban.slabs[urban.slabs.length - 1].rate;
  const b100 = bill(100), b200 = bill(200), b300 = bill(300);
  const m300 = C.marginalRate(state, { discom: d0.id, category: 'urban', loadKw: 3, units: 300 });
  const freeSlab = urban.slabs[0].free ? urban.slabs[0].upto : 0;
  const rateText = freeSlab
    ? tr(`first ${freeSlab} free, then ${inr2(topRate)}`, `पहली ${freeSlab} मुफ़्त, फिर ${inr2(topRate)}`)
    : tr(`${inr2(firstRate)} to ${inr2(topRate)}`, `${inr2(firstRate)} से ${inr2(topRate)}`, `${inr2(firstRate)} ते ${inr2(topRate)}`);

  const billFaqs = [
    { q: tr(`What is the electricity rate per unit in ${state.state} in ${Y}?`, `${Y} में ${S} में बिजली की प्रति यूनिट दर क्या है?`, `${Y} मध्ये ${S}मध्ये विजेचा प्रति युनिट दर किती आहे?`),
      a: freeSlab
        ? tr(`Homes get the first ${freeSlab} units a month free. Above that, our estimate is about ${inr2(topRate)} a unit in towns after the state subsidy, plus a fixed charge and ${dutyU}% duty.`, `घरों को हर महीने पहली ${freeSlab} यूनिट मुफ़्त मिलती हैं। इसके ऊपर, हमारे अनुमान से शहरों में राज्य सब्सिडी के बाद लगभग ${inr2(topRate)} प्रति यूनिट, साथ में फ़िक्स्ड चार्ज और ${dutyU}% शुल्क।`)
        : tr(`For homes, our estimate is ${inr2(firstRate)} a unit for the first ${urban.slabs[0].upto} units a month, rising to ${inr2(topRate)} at higher use, plus a fixed charge, ${fuel} and ${dutyU}% electricity duty. All in, 300 units cost about ${inr2(b300.effectiveRate)} a unit.`, `घरों के लिए हमारा अनुमान: महीने की पहली ${urban.slabs[0].upto} यूनिट पर ${inr2(firstRate)} प्रति यूनिट, ज़्यादा खपत पर ${inr2(topRate)} तक, साथ में फ़िक्स्ड चार्ज, ${fuel} और ${dutyU}% बिजली शुल्क। सब मिलाकर 300 यूनिट लगभग ${inr2(b300.effectiveRate)} प्रति यूनिट पड़ती हैं।`, `घरांसाठी आमचा अंदाज: महिन्याच्या पहिल्या ${urban.slabs[0].upto} युनिटला ${inr2(firstRate)} प्रति युनिट, जास्त वापरावर ${inr2(topRate)} पर्यंत, शिवाय स्थिर आकार, ${fuel} व ${dutyU}% वीज शुल्क. सर्व मिळून 300 युनिट सुमारे ${inr2(b300.effectiveRate)} प्रति युनिट पडतात.`) },
    { q: tr(`How much is the electricity bill for 200 units in ${state.state}?`, `${S} में 200 यूनिट का बिजली बिल कितना आता है?`, `${S}मध्ये 200 युनिटचे वीज बिल किती येते?`),
      a: tr(`About ${inr(b200.total)} for 200 units in a month in a town (our estimate, with typical charges).`, `शहर में महीने की 200 यूनिट का बिल लगभग ${inr(b200.total)} (हमारा अनुमान, सामान्य चार्ज के साथ)।`, `शहरात महिन्याच्या 200 युनिटचे बिल सुमारे ${inr(b200.total)} (आमचा अंदाज, सर्वसाधारण आकारांसह).`) },
    { q: tr(`How much is the electricity bill for 300 units in ${state.state}?`, `${S} में 300 यूनिट का बिजली बिल कितना आता है?`, `${S}मध्ये 300 युनिटचे वीज बिल किती येते?`),
      a: tr(`About ${inr(b300.total)} a month in a town. At that level each extra unit costs about ${inr2(m300)}, which is roughly what rooftop solar saves per unit.`, `शहर में लगभग ${inr(b300.total)} महीना। इस स्तर पर हर अतिरिक्त यूनिट लगभग ${inr2(m300)} की पड़ती है, यानी सोलर से हर यूनिट पर लगभग इतनी बचत।`, `शहरात दरमहा सुमारे ${inr(b300.total)}. या पातळीवर प्रत्येक जादा युनिट सुमारे ${inr2(m300)} ला पडते, म्हणजे सौर ऊर्जेने प्रति युनिट साधारण इतकी बचत होते.`) },
    { q: tr(`What is ${fuel} on my bill?`, `मेरे बिल पर ${fuel} क्या है?`, `माझ्या बिलावरील ${fuel} म्हणजे काय?`),
      a: tr('It passes changes in fuel and power purchase costs on to consumers, and it changes often. It is printed on your bill; type it into the calculator for an exact match.', 'यह ईंधन और बिजली खरीद की लागत में बदलाव को ग्राहकों तक पहुँचाता है और अक्सर बदलता है। यह आपके बिल पर छपा होता है; सटीक जवाब के लिए इसे कैलकुलेटर में भरें।', 'इंधन व वीज खरेदी खर्चातील बदल ग्राहकांपर्यंत पोहोचवणारा हा आकार आहे आणि तो वारंवार बदलतो. तो तुमच्या बिलावर छापलेला असतो; अचूक उत्तरासाठी तो कॅल्क्युलेटरमध्ये भरा.') },
    { q: tr(`Is the bill monthly in ${state.state}?`, `क्या ${S} में बिल हर महीने आता है?`, `${S}मध्ये बिल दरमहा येते का?`),
      a: tr('Yes, home bills are usually monthly. If yours covers two months, choose the 2-month billing period.', 'हाँ, घरेलू बिल आमतौर पर हर महीने आते हैं। आपका बिल दो महीने का हो तो 2 महीने की अवधि चुनें।', 'होय, घरगुती बिल साधारणपणे दरमहा येते. तुमचे बिल दोन महिन्यांचे असल्यास 2 महिन्यांचा कालावधी निवडा.') }
  ];

  const billPage = {
    file: billFile(state),
    state: state.stateSlug,
    langs: state.langs,
    title: tr(`${state.state} Electricity Bill Calculator ${Y} – Per Unit Rate & Slabs`, `${S} बिजली बिल कैलकुलेटर ${Y} – प्रति यूनिट दर और स्लैब`, `${S} वीज बिल कॅल्क्युलेटर ${Y} – प्रति युनिट दर व स्लॅब`),
    description: tr(`Work out your ${state.state} home electricity bill (${state.discoms.map((d) => d.name.split(' (')[0]).join(', ')}) with ${Y} rates: price per unit, slabs, fixed charge and duty. Free, in English and Hindi.`,
      `${S} का घरेलू बिजली बिल (${state.discoms.map((d) => d.name.split(' (')[0]).join(', ')}) ${Y} की दरों से निकालें: प्रति यूनिट दर, स्लैब, फ़िक्स्ड चार्ज और शुल्क।`,
      `${S}मधील घरगुती वीज बिल (${state.discoms.map((d) => d.name.split(' (')[0]).join(', ')}) ${Y} च्या दरांनुसार काढा: प्रति युनिट दर, स्लॅब, स्थिर आकार व शुल्क. मोफत, मराठीत.`),
    h1: tr(`${state.state} Electricity Bill Calculator ${Y}`, `${S} बिजली बिल कैलकुलेटर ${Y}`, `${S} वीज बिल कॅल्क्युलेटर ${Y}`),
    lede: tr(`Type the units from your bill to see your ${esc(state.state)} electricity bill, line by line.`, `अपने बिल की यूनिट भरें और ${esc(S)} का बिजली बिल लाइन-दर-लाइन देखें।`, `तुमच्या बिलावरील युनिट भरा आणि ${esc(S)}चे वीज बिल ओळीनुसार पाहा.`),
    heroExtra: stats([
      ['rupee', tr('Price per unit', 'प्रति यूनिट दर', 'प्रति युनिट दर'), rateText, true],
      ['bolt', tr('100 units a month', 'महीने में 100 यूनिट', 'महिन्याला 100 युनिट'), tr(`about ${inr(b100.total)}`, `लगभग ${inr(b100.total)}`, `सुमारे ${inr(b100.total)}`)],
      ['bolt', tr('200 units a month', 'महीने में 200 यूनिट', 'महिन्याला 200 युनिट'), tr(`about ${inr(b200.total)}`, `लगभग ${inr(b200.total)}`, `सुमारे ${inr(b200.total)}`)],
      ['bolt', tr('300 units a month', 'महीने में 300 यूनिट', 'महिन्याला 300 युनिट'), tr(`about ${inr(b300.total)}`, `लगभग ${inr(b300.total)}`, `सुमारे ${inr(b300.total)}`)]
    ]),
    crumbs: [{ name: tr(`${state.state} bill calculator`, `${S} बिल कैलकुलेटर`, `${S} बिल कॅल्क्युलेटर`), file: billFile(state) }],
    app: true,
    faqs: billFaqs,
    body: `${forms.billForm(d0.id, lang)}
${estimateBox}
${adSlot('after-calc')}
<section class="prose">
<h2>${tr(`${esc(state.state)} home electricity rates ${esc(Y)}`, `${esc(S)} घरेलू बिजली दरें ${esc(Y)}`, `${esc(S)} घरगुती वीज दर ${esc(Y)}`)} ${est}</h2>
<p>${tr(`Slabs are per month. The more units you use, the higher the price of the extra units. Rates from ${eff}.`, `स्लैब हर महीने के हिसाब से हैं। जितनी ज़्यादा खपत, अतिरिक्त यूनिट उतनी महँगी। दरें ${eff} से।`, `स्लॅब दरमहा प्रमाणे आहेत. जितका जास्त वापर, तितके जादा युनिट महाग. दर ${eff} पासून.`)}</p>
</section>
<div class="cols">${cats.map((k) => { const c = group.categories[k]; return `<div class="panel"><h3>${esc(tr(c.label, c.labelHi, c.labelMr))}</h3>${slabTable(c)}${fixedTable(c.fixed)}</div>`; }).join('')}</div>
<section class="prose">
<h2>${tr('Other charges on your bill', 'बिल पर बाकी चार्ज', 'बिलावरील इतर आकार')}</h2>
<ul class="ticks">
<li><strong>${esc(fuel)}:</strong> ${tr(`about ${inr2(group.fppaPerUnit)} a unit in our estimate; it changes often, so copy it from your bill.`, `हमारे अनुमान में लगभग ${inr2(group.fppaPerUnit)} प्रति यूनिट; यह अक्सर बदलता है, इसलिए बिल से भरें।`, `आमच्या अंदाजात सुमारे ${inr2(group.fppaPerUnit)} प्रति युनिट; तो वारंवार बदलतो, म्हणून बिलावरून भरा.`)}</li>
<li><strong>${tr('Electricity duty:', 'बिजली शुल्क:', 'वीज शुल्क:')}</strong> ${tr(`a state tax, taken as ${dutyU}%.`, `राज्य का टैक्स, ${dutyU}% माना गया है।`, `राज्याचा कर, ${dutyU}% धरला आहे.`)}</li>
${state.notes.map((n) => `<li>${esc(L(n))}</li>`).join('\n')}
</ul>
${schemes}
<h2>${tr(`Sample ${esc(state.state)} electricity bills (one month)`, `${esc(S)} के नमूना बिजली बिल (एक महीना)`, `${esc(S)}ची नमुना वीज बिले (एक महिना)`)}</h2>
${exampleBills()}
<p class="note">${tr('Regular meter, typical charges, our estimate.', 'सामान्य मीटर, सामान्य चार्ज, हमारा अनुमान।', 'साधे मीटर, सर्वसाधारण आकार, आमचा अंदाज.')}</p>
<h2>${tr(`Electricity companies in ${esc(state.state)}`, `${esc(S)} की बिजली कंपनियाँ`, `${esc(S)}मधील वीज कंपन्या`)}</h2>
${companies}
${sourceLine}
<p><a class="cta" href="${solarFile(state)}">${tr(`Rooftop solar in ${esc(state.state)}: cost and savings →`, `${esc(S)} में रूफ़टॉप सोलर: खर्च और बचत →`, `${esc(S)}मध्ये छतावरील सौर: खर्च व बचत →`)}</a></p>
</section>
${adSlot('mid')}
${faqHtml(billFaqs, lang)}`
  };

  // ---------- Solar page ----------
  const sizes3 = [1, 2, 3, 5];
  const subsidyRows = sizes3.map((kw) => {
    const p = C.sizePrice(india, kw);
    const central = C.pmSuryaGharSubsidy(common, kw);
    const st = C.stateSubsidy(state, kw);
    return `<tr><td><a href="${pricePage(kw)}">${kw} kW</a></td><td class="num">${range(p.low, p.high, lang)}</td><td class="num">${inr(central)}</td>${state.stateSubsidy ? `<td class="num">${inr(st)}</td>` : ''}<td class="num"><strong>${range(Math.max(0, p.low - central - st), Math.max(0, p.high - central - st), lang)}</strong></td></tr>`;
  }).join('');
  const roi = (city, units = 300) => C.solarRoi(state, common, { discom: city.discom, category: 'urban', loadKw: load(units) + 1, units, yieldKwhPerKwYear: city.yieldKwhPerKwYear });
  const ex = roi(state.cities[0]);
  const cityRows = state.cities.map((c) => {
    const r = roi(c);
    return `<tr><td>${esc(nm(c))}</td><td class="num">${num(c.yieldKwhPerKwYear * 3 / 365, 1)}</td><td class="num">${inr(r.savingMonthlyYear1)}</td><td class="num">${r.paybackYears === null ? '—' : num(r.paybackYears, 1)}</td></tr>`;
  }).join('');
  const nmRate = state.common.netMetering.surplusRatePerUnit;
  const stSub = state.stateSubsidy;

  const solarFaqs = [
    { q: tr(`How much does rooftop solar cost in ${state.state} after subsidy?`, `${S} में सब्सिडी के बाद रूफ़टॉप सोलर कितने का पड़ता है?`, `${S}मध्ये अनुदानानंतर छतावरील सौर यंत्रणा किती रुपयांना पडते?`),
      a: tr(`A 3 kW system typically costs ${range(C.sizePrice(india, 3).low, C.sizePrice(india, 3).high, 'en')}. PM Surya Ghar takes off ${inr(C.pmSuryaGharSubsidy(common, 3))}${stSub ? ` and the ${state.state} top-up another ${inr(C.stateSubsidy(state, 3))}` : ''}.`,
        `3 kW सिस्टम आमतौर पर ${range(C.sizePrice(india, 3).low, C.sizePrice(india, 3).high, 'hi')} का होता है। पीएम सूर्य घर से ${inr(C.pmSuryaGharSubsidy(common, 3))}${stSub ? ` और ${S} की अतिरिक्त सब्सिडी से ${inr(C.stateSubsidy(state, 3))}` : ''} कम हो जाते हैं।`,
        `3 kW यंत्रणा साधारणपणे ${range(C.sizePrice(india, 3).low, C.sizePrice(india, 3).high, 'mr')} ला पडते. पीएम सूर्य घर योजनेतून ${inr(C.pmSuryaGharSubsidy(common, 3))} अनुदान मिळते.`) },
    { q: tr(`How much electricity does 1 kW solar make in ${state.state}?`, `${S} में 1 kW सोलर कितनी बिजली बनाता है?`, `${S}मध्ये 1 kW सौर यंत्रणा किती वीज तयार करते?`),
      a: tr(`About ${num(ex.yieldKwhPerKwYear / 365, 1)} units a day on average (${num(ex.yieldKwhPerKwYear)} a year) in ${state.cities[0].name}, less in the monsoon and more in March to May.`, `${nm(state.cities[0])} में औसतन लगभग ${num(ex.yieldKwhPerKwYear / 365, 1)} यूनिट रोज़ (साल में ${num(ex.yieldKwhPerKwYear)}), बारिश में कम और मार्च से मई में ज़्यादा।`, `${nm(state.cities[0])}मध्ये सरासरी सुमारे ${num(ex.yieldKwhPerKwYear / 365, 1)} युनिट दररोज (वर्षाला ${num(ex.yieldKwhPerKwYear)}), पावसाळ्यात कमी आणि मार्च ते मे मध्ये जास्त.`) },
    { q: tr(`How long does solar take to pay back in ${state.state}?`, `${S} में सोलर का पैसा कितने समय में वापस आता है?`, `${S}मध्ये सौर यंत्रणेचे पैसे किती काळात वसूल होतात?`),
      a: tr(`For a home in ${state.cities[0].name} using 300 units a month, a ${num(ex.kw, 1)} kW system costs about ${inr(ex.netCost)} after subsidy, saves about ${inr(ex.savingMonthlyYear1)} a month and pays back in about ${num(ex.paybackYears || 0, 1)} years (our estimate).`,
        `${nm(state.cities[0])} में 300 यूनिट मासिक खपत वाले घर के लिए ${num(ex.kw, 1)} kW सिस्टम सब्सिडी के बाद लगभग ${inr(ex.netCost)} का पड़ता है, हर महीने लगभग ${inr(ex.savingMonthlyYear1)} बचाता है और लगभग ${num(ex.paybackYears || 0, 1)} साल में पैसा वापस (हमारा अनुमान)।`,
        `${nm(state.cities[0])}मध्ये महिन्याला 300 युनिट वापरणाऱ्या घरासाठी ${num(ex.kw, 1)} kW यंत्रणा अनुदानानंतर सुमारे ${inr(ex.netCost)} ला पडते, दरमहा सुमारे ${inr(ex.savingMonthlyYear1)} वाचवते आणि सुमारे ${num(ex.paybackYears || 0, 1)} वर्षांत पैसे परत (आमचा अंदाज).`) },
    { q: tr('What happens to extra solar units?', 'अतिरिक्त सोलर यूनिट का क्या होता है?', 'जादा सौर युनिटचे काय होते?'),
      a: tr(`With net metering, units you do not use go to the grid and are set off against units you take. Surplus left over is paid at a low rate, about ${inr2(nmRate)} a unit in our estimate, so size the system to your own use.`, `नेट मीटरिंग में जो यूनिट आप इस्तेमाल नहीं करते वे ग्रिड में जाती हैं और ली गई यूनिट से घट जाती हैं। बची हुई अतिरिक्त यूनिट का कम रेट मिलता है, हमारे अनुमान से लगभग ${inr2(nmRate)} प्रति यूनिट, इसलिए सिस्टम अपनी खपत जितना ही लें।`, `नेट मीटरिंगमध्ये तुम्ही न वापरलेले युनिट ग्रिडमध्ये जातात आणि घेतलेल्या युनिटमधून वजा होतात. उरलेल्या जादा युनिटला कमी दर मिळतो, आमच्या अंदाजानुसार सुमारे ${inr2(nmRate)} प्रति युनिट, म्हणून यंत्रणा स्वतःच्या वापराइतकीच घ्या.`) }
  ];

  const solarPage = {
    file: solarFile(state),
    state: state.stateSlug,
    langs: state.langs,
    title: tr(`Rooftop Solar Calculator ${state.state} 2026: Cost, Subsidy & Savings`, `${S} रूफ़टॉप सोलर कैलकुलेटर 2026: कीमत, सब्सिडी और बचत`, `${S} छतावरील सौर कॅल्क्युलेटर 2026: किंमत, अनुदान व बचत`),
    description: tr(`Rooftop solar in ${state.state}: price after PM Surya Ghar subsidy${stSub ? ' and the state top-up' : ''}, units per day by city, and how much it cuts your electricity bill.`,
      `${S} में रूफ़टॉप सोलर: पीएम सूर्य घर सब्सिडी${stSub ? ' और राज्य की अतिरिक्त सब्सिडी' : ''} के बाद कीमत, शहर अनुसार रोज़ की यूनिट और बिजली बिल में कितनी बचत।`,
      `${S}मध्ये छतावरील सौर: पीएम सूर्य घर अनुदानानंतरची किंमत, शहरनिहाय दररोजचे युनिट आणि वीज बिलात किती बचत.`),
    h1: tr(`Rooftop Solar Calculator for ${state.state}`, `${S} रूफ़टॉप सोलर कैलकुलेटर`, `${S} छतावरील सौर कॅल्क्युलेटर`),
    lede: tr(`Your ${esc(state.state)} electricity bill before and after solar, worked out slab by slab.`, `सोलर से पहले और बाद आपका ${esc(S)} बिजली बिल, स्लैब-दर-स्लैब।`, `सौर यंत्रणेपूर्वी व नंतर तुमचे ${esc(S)}मधील वीज बिल, स्लॅबनुसार.`),
    heroExtra: stats([
      ['gift', tr('Subsidy on 3 kW', '3 kW पर सब्सिडी', '3 kW वर अनुदान'), inr(C.pmSuryaGharSubsidy(common, 3) + C.stateSubsidy(state, 3)), true],
      ['sun', tr('1 kW makes a day', '1 kW रोज़ बनाता है', '1 kW दररोज तयार करते'), `${num(ex.yieldKwhPerKwYear / 365, 1)} ${U}`],
      ['wallet', tr('Saving at 300 units', '300 यूनिट पर बचत', '300 युनिटवर बचत'), tr(`about ${inr(ex.savingMonthlyYear1)}/month`, `लगभग ${inr(ex.savingMonthlyYear1)}/माह`, `सुमारे ${inr(ex.savingMonthlyYear1)}/महिना`)],
      ['calendar', tr('Money back in', 'पैसा वापस', 'पैसे परत'), tr(`about ${num(ex.paybackYears || 0, 1)} years`, `लगभग ${num(ex.paybackYears || 0, 1)} साल`, `सुमारे ${num(ex.paybackYears || 0, 1)} वर्षे`)]
    ]),
    crumbs: [{ name: tr(`${state.state} solar calculator`, `${S} सोलर कैलकुलेटर`, `${S} सौर कॅल्क्युलेटर`), file: solarFile(state) }],
    app: true,
    faqs: solarFaqs,
    body: `${forms.solarForm(lang)}
${estimateBox}
${adSlot('after-calc')}
<section class="prose">
<h2>${tr(`Rooftop solar price in ${esc(state.state)} after subsidy`, `${esc(S)} में सब्सिडी के बाद सोलर की कीमत`, `${esc(S)}मध्ये अनुदानानंतर सौर यंत्रणेची किंमत`)}</h2>
<div class="table-wrap"><table><thead><tr><th>${tr('Size', 'साइज़', 'क्षमता')}</th><th class="num">${tr('Price', 'कीमत', 'किंमत')}</th><th class="num">${tr('PM Surya Ghar', 'पीएम सूर्य घर', 'पीएम सूर्य घर')}</th>${stSub ? `<th class="num">${esc(L(stSub.name))}</th>` : ''}<th class="num">${tr('You pay', 'आप देंगे', 'तुम्ही भरणार')}</th></tr></thead><tbody>${subsidyRows}</tbody></table></div>
${stSub ? `<p class="note">${esc(L(stSub.note))}</p>` : ''}
${schemes}
<h2>${tr(`Solar output and savings by city in ${esc(state.state)}`, `${esc(S)} में शहर अनुसार सोलर उत्पादन और बचत`, `${esc(S)}मध्ये शहरनिहाय सौर उत्पादन व बचत`)}</h2>
<p>${tr('For a home using 300 units a month with a system sized to its use.', '300 यूनिट मासिक खपत वाले घर के लिए, खपत के हिसाब से सिस्टम।', 'महिन्याला 300 युनिट वापरणाऱ्या घरासाठी, वापराप्रमाणे यंत्रणा.')}</p>
<div class="table-wrap"><table><thead><tr><th>${tr('City', 'शहर', 'शहर')}</th><th class="num">${tr('3 kW makes a day', '3 kW रोज़ बनाता है', '3 kW दररोज')}</th><th class="num">${tr('Saving a month', 'मासिक बचत', 'मासिक बचत')}</th><th class="num">${tr('Payback (years)', 'पैसा वापस (साल)', 'परतफेड (वर्षे)')}</th></tr></thead><tbody>${cityRows}</tbody></table></div>
<p class="note">${tr('Our estimate from public tariff data and typical sunshine for each city. Real output varies by about 10% either way.', 'सार्वजनिक टैरिफ़ आंकड़ों और हर शहर की सामान्य धूप पर हमारा अनुमान। असली उत्पादन लगभग 10% कम-ज़्यादा हो सकता है।', 'सार्वजनिक दर माहिती व प्रत्येक शहराच्या सर्वसाधारण सूर्यप्रकाशावर आधारित आमचा अंदाज. प्रत्यक्ष उत्पादन सुमारे 10% कमी-जास्त असू शकते.')}</p>
<h2>${tr('How to apply', 'आवेदन कैसे करें', 'अर्ज कसा करावा')}</h2>
<ul class="ticks">
<li>${tr(`Register on the <a href="${common.pmSuryaGhar.url}" rel="nofollow noopener">PM Surya Ghar portal</a> with your electricity consumer number.`, `अपने बिजली उपभोक्ता नंबर के साथ <a href="${common.pmSuryaGhar.url}" rel="nofollow noopener">पीएम सूर्य घर पोर्टल</a> पर रजिस्टर करें।`, `तुमच्या वीज ग्राहक क्रमांकासह <a href="${common.pmSuryaGhar.url}" rel="nofollow noopener">पीएम सूर्य घर पोर्टल</a>वर नोंदणी करा.`)}</li>
<li>${tr('Choose a registered vendor, get 2–3 quotes with DCR (made-in-India) panels, and install.', 'किसी पंजीकृत वेंडर को चुनें, DCR (भारत में बने) पैनल के साथ 2–3 कोटेशन लें, और लगवाएँ।', 'नोंदणीकृत विक्रेता निवडा, DCR (भारतात बनलेले) पॅनलसह 2–3 कोटेशन घ्या आणि बसवा.')}</li>
<li>${tr('After the net meter is fitted and the system is inspected, the subsidy is paid into your bank account.', 'नेट मीटर लगने और जाँच के बाद सब्सिडी आपके बैंक खाते में आती है।', 'नेट मीटर बसवून तपासणी झाल्यानंतर अनुदान तुमच्या बँक खात्यात जमा होते.')}</li>
</ul>
<p><a class="cta" href="${billFile(state)}">${tr(`${esc(state.state)} electricity bill calculator →`, `${esc(S)} बिजली बिल कैलकुलेटर →`, `${esc(S)} वीज बिल कॅल्क्युलेटर →`)}</a></p>
</section>
${adSlot('mid')}
${faqHtml(solarFaqs, lang)}`
  };

  return [billPage, solarPage];
}

module.exports = { statePages, billFile, solarFile };
