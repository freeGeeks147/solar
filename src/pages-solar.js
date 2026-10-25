'use strict';
const { esc, inr, num, t, range, yearsText, MONTHS, icon } = require('./util');

/*
 * All-India solar pages: home hub, "{kw}kW price" and "{kw}kW units per day".
 * ctx: { C, india, common, sizes, pricePage, genPage, PAGES, forms, adSlot, faqHtml }
 */
module.exports = function solarPages(lang, ctx) {
  const { C, india, common, sizes, pricePage, genPage, PAGES, forms, adSlot, faqHtml } = ctx;
  const tr = t(lang);
  const HI = lang === 'hi';
  const yields = india.cities.map((c) => c.yield);
  const yLow = Math.min(...yields), yHigh = Math.max(...yields), yTypical = 1450;
  const perDay = (kw, y) => kw * y / 365;
  const round100 = (x) => Math.round(x / 100) * 100;
  const R = (a, b) => range(a, b, lang);
  const yrs = (y) => yearsText(y, lang);
  const unitsWord = tr('units', 'यूनिट');

  function facts(kw) {
    const p = C.sizePrice(india, kw);
    const sub = C.pmSuryaGharSubsidy(common, kw);
    const units = Math.round(kw * yTypical / 12 / 10) * 10;
    const r = C.solarSimple(india, common, { kw, yieldKwhPerKwYear: yTypical, units, rate: india.defaultRate });
    return {
      kw, p, sub, afterLow: p.low - sub, afterHigh: p.high - sub,
      panels: C.panelCount(india, kw), roof: kw * common.solarDefaults.sqftPerKw,
      dayLow: perDay(kw, yLow), dayHigh: perDay(kw, yHigh), dayTyp: perDay(kw, yTypical),
      month: kw * yTypical / 12, year: kw * yTypical,
      suitsUnits: units, suitsBill: round100(units * india.defaultRate), r
    };
  }

  // Stat cards shown at the top of a page. items: [icon, label, value, highlight?]
  function stats(items, title) {
    return `<section class="stats" aria-label="${esc(title || tr('In short', 'संक्षेप में'))}">${items.map(([ic, k, v, hl]) => `<div class="stat${hl ? ' hl' : ''}">${icon(ic)}<div><div class="k">${k}</div><div class="v">${v}</div></div></div>`).join('')}</section>`;
  }

  const glossary = `<section class="glossary"><h2>${tr('Words you will see', 'ये शब्द आपको दिखेंगे')}</h2><dl>
<div><dt>kW (${tr('kilowatt', 'किलोवाट')})</dt><dd>${tr('The size of a solar system. Bigger kW = more panels = more electricity.', 'सोलर सिस्टम का साइज़। ज़्यादा kW = ज़्यादा पैनल = ज़्यादा बिजली।')}</dd></div>
<div><dt>${tr('Unit', 'यूनिट')}</dt><dd>${tr('One unit on your electricity bill (1 kWh). A fan running for a full day uses about 1.5 units.', 'बिजली बिल की एक यूनिट (1 kWh)। एक पंखा पूरे दिन चले तो लगभग 1.5 यूनिट खर्च होती है।')}</dd></div>
<div><dt>${tr('Subsidy', 'सब्सिडी')}</dt><dd>${tr('Money the government pays back to you under PM Surya Ghar, after the system is installed.', 'पीएम सूर्य घर योजना में सरकार सिस्टम लगने के बाद यह पैसा आपके खाते में वापस देती है।')}</dd></div>
<div><dt>${tr('On-grid', 'ऑन-ग्रिड')}</dt><dd>${tr('Solar connected to the electricity line, without batteries. Only on-grid systems get the subsidy.', 'बिना बैटरी, बिजली लाइन से जुड़ा सोलर। सब्सिडी केवल ऑन-ग्रिड सिस्टम पर मिलती है।')}</dd></div>
<div><dt>${tr('Net meter', 'नेट मीटर')}</dt><dd>${tr('A two-way meter. It counts units you take from the line and units your panels send to it.', 'दो-तरफ़ा मीटर। यह लाइन से ली गई और पैनल से लाइन में भेजी गई, दोनों यूनिट गिनता है।')}</dd></div>
<div><dt>${tr('DCR panels', 'DCR पैनल')}</dt><dd>${tr('Panels made with Indian cells. Required for the subsidy; your installer will use them.', 'भारतीय सेल से बने पैनल। सब्सिडी के लिए ज़रूरी हैं; इंस्टॉलर यही लगाते हैं।')}</dd></div>
</dl></section>`;

  function compareTable(current) {
    const rows = sizes.map((kw) => {
      const f = facts(kw);
      const name = kw === current ? `<strong>${kw} kW</strong>` : `<a href="${pricePage(kw)}">${kw} kW</a>`;
      return `<tr${kw === current ? ' class="current"' : ''}><td>${name}</td><td class="num">${inr(f.suitsBill)}</td><td class="num">${R(f.afterLow, f.afterHigh)}</td><td class="num">${f.dayTyp.toFixed(0)}</td></tr>`;
    }).join('');
    return `<div class="table-wrap"><table class="compare"><thead><tr><th>${tr('Solar size', 'सोलर साइज़')}</th><th class="num">${tr('Good for a monthly bill of', 'इतने मासिक बिल के लिए')}</th><th class="num">${tr('You pay (after subsidy)', 'आप देंगे (सब्सिडी के बाद)')}</th><th class="num">${tr('Units a day', 'रोज़ की यूनिट')}</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="note">${tr('Typical prices for a complete system, installed. Get 2 or 3 quotes before you buy.', 'पूरा सिस्टम लगवाने की सामान्य कीमत। खरीदने से पहले 2–3 कोटेशन ज़रूर लें।')}</p>`;
  }

  function neighbours(kw, fn, label) {
    const i = sizes.indexOf(kw);
    return [sizes[i - 1], sizes[i + 1]].filter(Boolean).map((k) => `<a class="pill" href="${fn(k)}">${k} kW ${label}</a>`).join('');
  }

  const examples = () => {
    const r = india.defaultRate, x = india.defaultExportRate;
    return `<h2>${tr('How solar saves money: two examples', 'सोलर से पैसे कैसे बचते हैं: दो उदाहरण')}</h2>
<p>${tr('Each solar unit your home uses replaces a unit you would buy from the electricity company. Extra units go to the grid and earn only a little.', 'घर में इस्तेमाल हुई हर सोलर यूनिट, बिजली कंपनी से खरीदी जाने वाली एक यूनिट की जगह लेती है। बची हुई यूनिट ग्रिड में जाती हैं और उन पर कम पैसा मिलता है।')} ${tr(`Example at ₹${r} a unit:`, `₹${r} प्रति यूनिट पर उदाहरण:`)}</p>
<div class="table-wrap"><table><thead><tr><th></th><th class="num">${tr('Use 700, solar makes 600', 'खपत 700, सोलर 600')}</th><th class="num">${tr('Use 600, solar makes 700', 'खपत 600, सोलर 700')}</th></tr></thead><tbody>
<tr><td>${tr('Solar units used at home', 'घर में इस्तेमाल सोलर यूनिट')}</td><td class="num">600</td><td class="num">600</td></tr>
<tr><td>${tr('Units bought from the company', 'कंपनी से खरीदी यूनिट')}</td><td class="num">100</td><td class="num">0</td></tr>
<tr><td>${tr('Extra units sold to the grid', 'ग्रिड को बेची अतिरिक्त यूनिट')}</td><td class="num">0</td><td class="num">100 × ₹${x.toFixed(0)}</td></tr>
<tr><td>${tr('Bill before → after', 'बिल पहले → बाद में')}</td><td class="num">${inr(700 * r)} → ${inr(100 * r)}</td><td class="num">${inr(600 * r)} → ₹0</td></tr>
<tr class="total"><td>${tr('Saving per month', 'हर महीने बचत')}</td><td class="num">${inr(600 * r)}</td><td class="num">${inr(600 * r + 100 * x)}</td></tr>
</tbody></table></div>
<p class="callout">${icon('check')}<span>${tr(`The second system makes 100 more units but saves only ${inr(100 * x)} more. <strong>Choose a size that makes about as much as you use.</strong>`, `दूसरा सिस्टम 100 यूनिट ज़्यादा बनाता है, पर बचत सिर्फ़ ${inr(100 * x)} ज़्यादा होती है। <strong>उतना ही बड़ा सिस्टम लें जितनी आपकी खपत है।</strong>`)}</span></p>`;
  };

  function pricePageSpec(kw) {
    const f = facts(kw);
    const acHours = Math.round(f.dayTyp / 1.3);
    const subNote = kw > 3 ? tr(' (₹78,000 is the maximum, for 3 kW and above)', ' (₹78,000 अधिकतम है, 3 kW और उससे ऊपर के लिए)') : '';
    const faqs = [
      { q: tr(`What is the price of a ${kw}kW solar system in India in 2026?`, `2026 में भारत में ${kw}kW सोलर सिस्टम की कीमत क्या है?`), a: tr(`A complete ${kw}kW rooftop system costs ${R(f.p.low, f.p.high)}, installed. After the government subsidy of ${inr(f.sub)}, you pay ${R(f.afterLow, f.afterHigh)}.`, `पूरा ${kw}kW रूफ़टॉप सिस्टम लगवाने में ${R(f.p.low, f.p.high)} लगते हैं। ${inr(f.sub)} की सरकारी सब्सिडी के बाद आप ${R(f.afterLow, f.afterHigh)} देते हैं।`) },
      { q: tr(`What is the ${kw}kW solar system price with subsidy?`, `सब्सिडी के साथ ${kw}kW सोलर सिस्टम की कीमत कितनी है?`), a: tr(`${R(f.afterLow, f.afterHigh)}. The government pays ${inr(f.sub)} back into your bank account after installation${subNote}.`, `${R(f.afterLow, f.afterHigh)}। सिस्टम लगने के बाद सरकार ${inr(f.sub)} आपके बैंक खाते में वापस देती है${subNote}।`) },
      { q: tr(`How many units does a ${kw}kW solar system make per day?`, `${kw}kW सोलर सिस्टम रोज़ कितनी यूनिट बनाता है?`), a: tr(`About ${f.dayTyp.toFixed(0)} units a day (${f.dayLow.toFixed(0)} to ${f.dayHigh.toFixed(0)} depending on your city). That is about ${Math.round(f.month)} units a month. <a href="${genPage(kw)}">See your city</a>.`, `रोज़ लगभग ${f.dayTyp.toFixed(0)} यूनिट (शहर के हिसाब से ${f.dayLow.toFixed(0)} से ${f.dayHigh.toFixed(0)})। यानी महीने में लगभग ${Math.round(f.month)} यूनिट। <a href="${genPage(kw)}">अपना शहर देखें</a>।`) },
      { q: tr(`How many panels are needed for ${kw}kW?`, `${kw}kW के लिए कितने पैनल चाहिए?`), a: tr(`${f.panels} panels of ${india.panelWatt} watts each. If your installer uses smaller panels, you need a few more.`, `${india.panelWatt} वॉट के ${f.panels} पैनल। छोटे पैनल लगें तो कुछ ज़्यादा चाहिए।`) },
      { q: tr(`How much roof space does ${kw}kW solar need?`, `${kw}kW सोलर के लिए कितनी छत चाहिए?`), a: tr(`About ${f.roof} sq ft of open roof with no shade.`, `लगभग ${f.roof} वर्ग फ़ुट खुली छत, जहाँ छाया न हो।`) },
      { q: tr(`Is ${kw}kW enough for my home?`, `क्या ${kw}kW मेरे घर के लिए काफ़ी है?`), a: tr(`${kw}kW suits a home with a monthly bill of about ${inr(f.suitsBill)} (${f.suitsUnits} units). If your bill is much smaller, choose a smaller system: extra units sold to the grid earn very little.`, `${kw}kW उस घर के लिए सही है जिसका मासिक बिल लगभग ${inr(f.suitsBill)} (${f.suitsUnits} यूनिट) है। बिल कम हो तो छोटा सिस्टम लें: ग्रिड को बेची गई अतिरिक्त यूनिट पर बहुत कम पैसा मिलता है।`) },
      { q: tr(`Can a ${kw}kW solar system run an AC?`, `क्या ${kw}kW सोलर से AC चल सकता है?`), a: tr(`Yes, in effect. ${kw}kW makes about ${f.dayTyp.toFixed(0)} units a day, enough for a 1.5-ton inverter AC for about ${acHours} hours a day. The AC runs as normal and your bill goes down.`, `हाँ। ${kw}kW रोज़ लगभग ${f.dayTyp.toFixed(0)} यूनिट बनाता है, जो 1.5 टन इन्वर्टर AC को रोज़ लगभग ${acHours} घंटे चलाने के बराबर है। AC सामान्य रूप से चलता है और बिल कम हो जाता है।`) }
    ];
    return {
      file: pricePage(kw),
      title: tr(`${kw}kW Solar System Price in India 2026 (With Subsidy) – Cost, Panels & Generation`, `${kw}kW सोलर सिस्टम की कीमत 2026 (सब्सिडी के साथ) – खर्च, पैनल और बिजली उत्पादन`),
      description: tr(`${kw}kW solar system price in India: ${R(f.p.low, f.p.high)}. After the ${inr(f.sub)} PM Surya Ghar subsidy you pay ${R(f.afterLow, f.afterHigh)}. Makes about ${f.dayTyp.toFixed(0)} units a day.`, `${kw}kW सोलर सिस्टम की कीमत: ${R(f.p.low, f.p.high)}। ${inr(f.sub)} की पीएम सूर्य घर सब्सिडी के बाद आप ${R(f.afterLow, f.afterHigh)} देंगे। रोज़ लगभग ${f.dayTyp.toFixed(0)} यूनिट बनाता है।`),
      h1: tr(`${kw}kW Solar System Price in India (2026)`, `${kw}kW सोलर सिस्टम की कीमत (2026)`),
      lede: tr(`What a ${kw}kW rooftop system costs, what the government pays back, and how much it saves.`, `${kw}kW रूफ़टॉप सिस्टम कितने का पड़ता है, सरकार कितना वापस देती है, और कितनी बचत होती है।`),
      heroExtra: stats([
        ['wallet', tr('You pay (after subsidy)', 'आप देंगे (सब्सिडी के बाद)'), R(f.afterLow, f.afterHigh), true],
        ['rupee', tr('Full price', 'पूरी कीमत'), R(f.p.low, f.p.high)],
        ['gift', tr('Government subsidy', 'सरकारी सब्सिडी'), tr(`${inr(f.sub)} back to you`, `${inr(f.sub)} वापस`)],
        ['sun', tr('Electricity it makes', 'बिजली उत्पादन'), tr(`about ${f.dayTyp.toFixed(0)} units a day`, `रोज़ लगभग ${f.dayTyp.toFixed(0)} यूनिट`)],
        ['home', tr('Good for', 'किसके लिए सही'), tr(`a bill of about ${inr(f.suitsBill)}/month`, `लगभग ${inr(f.suitsBill)} मासिक बिल`)],
        ['clock', tr('Money back in', 'पैसा वापस'), tr(`about ${yrs(f.r.paybackYears)}`, `लगभग ${yrs(f.r.paybackYears)} में`)],
        ['roof', tr('Roof space', 'छत की जगह'), tr(`about ${f.roof} sq ft (${f.panels} panels)`, `लगभग ${f.roof} वर्ग फ़ुट (${f.panels} पैनल)`)]
      ]),
      crumbs: [{ name: tr('Solar price', 'सोलर कीमत'), file: PAGES.home }, { name: tr(`${kw}kW solar price`, `${kw}kW सोलर कीमत`), file: pricePage(kw) }],
      app: true,
      faqs,
      body: `${forms.sizeForm(kw, 'price', lang, { bill: f.suitsBill, units: f.suitsUnits })}
${adSlot('after-calc')}
<div class="cols">
<section class="panel">
<h2>${icon('panel')} ${tr('What you get for the price', 'इस कीमत में क्या मिलता है')}</h2>
<ul class="ticks">
<li><strong>${tr(`${f.panels} solar panels`, `${f.panels} सोलर पैनल`)}</strong> ${tr(`(${india.panelWatt} watts each, made in India)`, `(${india.panelWatt} वॉट के, भारत में बने)`)}</li>
<li><strong>${tr(`A ${kw} kW inverter`, `${kw} kW इन्वर्टर`)}</strong>, ${tr('the box that turns solar power into home electricity', 'जो सोलर बिजली को घर की बिजली में बदलता है')}</li>
<li><strong>${tr('A steel stand', 'स्टील का स्टैंड')}</strong> ${tr('to hold the panels on your roof', 'जो छत पर पैनल को थामता है')}</li>
<li><strong>${tr('Wiring, safety switches and earthing', 'वायरिंग, सुरक्षा स्विच और अर्थिंग')}</strong></li>
<li><strong>${tr('Installation', 'इंस्टॉलेशन')}</strong>. ${tr('The two-way meter (net meter) comes from your electricity company, usually for a small fee.', 'दो-तरफ़ा मीटर (नेट मीटर) बिजली कंपनी देती है, आमतौर पर थोड़े शुल्क पर।')}</li>
</ul>
</section>
<section class="panel">
<h2>${icon('rupee')} ${tr('Why prices differ', 'कीमतें अलग क्यों होती हैं')}</h2>
<ul class="ticks">
<li><strong>${tr('Brand:', 'ब्रांड:')}</strong> ${tr('Adani, Waaree, Tata Power Solar and others differ by about 5–15%.', 'अदाणी, वारी, टाटा पावर सोलर आदि की कीमतों में लगभग 5–15% का फ़र्क होता है।')}</li>
<li><strong>${tr('Stand height:', 'स्टैंड की ऊँचाई:')}</strong> ${tr('a raised stand (so you can use the roof below) costs more.', 'ऊँचा स्टैंड (ताकि नीचे छत इस्तेमाल हो सके) महँगा पड़ता है।')}</li>
<li><strong>${tr('Battery:', 'बैटरी:')}</strong> ${tr('a system with batteries costs much more, and does not get the subsidy.', 'बैटरी वाला सिस्टम काफ़ी महँगा है और उस पर सब्सिडी नहीं मिलती।')}</li>
</ul>
</section>
</div>
<section class="prose">
${examples()}
<h2>${tr('Which size is right for you?', 'आपके लिए कौन-सा साइज़ सही है?')}</h2>
<p>${tr('Look at your monthly electricity bill and find the closest row.', 'अपना मासिक बिजली बिल देखें और सबसे पास वाली पंक्ति चुनें।')}</p>
${compareTable(kw)}
<div class="pills">${neighbours(kw, pricePage, tr('solar price', 'सोलर कीमत'))}<a class="pill" href="${genPage(kw)}">${tr(`How much ${kw}kW makes in your city`, `आपके शहर में ${kw}kW कितना बनाता है`)}</a><a class="pill" href="${PAGES.subsidy}">${tr('How to get the subsidy', 'सब्सिडी कैसे लें')}</a></div>
</section>
${glossary}
${adSlot('mid')}
${faqHtml(faqs, lang)}`
    };
  }

  function genPageSpec(kw) {
    const f = facts(kw);
    const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const cityName = (c) => (HI ? c.nameHi : c.name);
    const maxDay = perDay(kw, yHigh);
    const cityRows = india.cities.slice().sort((a, b) => b.yield - a.yield).map((c) => {
      const d = perDay(kw, c.yield);
      return `<tr><td>${esc(cityName(c))}</td><td class="num"><span class="bar" style="--w:${(d / maxDay * 100).toFixed(0)}%"></span>${d.toFixed(1)}</td><td class="num">${Math.round(kw * c.yield / 12)}</td></tr>`;
    }).join('');
    const maxMonth = Math.max(...india.monthlyShare.map((s, m) => s / days[m]));
    const monthRows = india.monthlyShare.map((s, m) => {
      const u = kw * yTypical * s, d = u / days[m];
      return `<tr><td>${MONTHS[lang][m]}</td><td class="num"><span class="bar" style="--w:${(s / days[m] / maxMonth * 100).toFixed(0)}%"></span>${d.toFixed(1)}</td><td class="num">${Math.round(u)}</td></tr>`;
    }).join('');
    const faqs = [
      { q: tr(`How many units does a ${kw}kW solar panel make per day?`, `${kw}kW सोलर पैनल रोज़ कितनी यूनिट बनाता है?`), a: tr(`About ${f.dayTyp.toFixed(0)} units a day on average. Sunny places like Rajasthan and Gujarat get up to ${f.dayHigh.toFixed(1)}; cloudier places like Kolkata and Guwahati get about ${f.dayLow.toFixed(1)}.`, `औसतन रोज़ लगभग ${f.dayTyp.toFixed(0)} यूनिट। राजस्थान और गुजरात जैसी धूप वाली जगहों पर ${f.dayHigh.toFixed(1)} तक; कोलकाता और गुवाहाटी जैसी बादल वाली जगहों पर लगभग ${f.dayLow.toFixed(1)}।`) },
      { q: tr(`How many units does a ${kw}kW solar system make per month?`, `${kw}kW सोलर सिस्टम महीने में कितनी यूनिट बनाता है?`), a: tr(`About ${Math.round(kw * yLow / 12)} to ${Math.round(kw * yHigh / 12)} units a month. Most in March to May, least in the rainy months.`, `महीने में लगभग ${Math.round(kw * yLow / 12)} से ${Math.round(kw * yHigh / 12)} यूनिट। मार्च से मई में सबसे ज़्यादा, बारिश के महीनों में सबसे कम।`) },
      { q: tr(`How many units does ${kw}kW solar make in a year?`, `${kw}kW सोलर साल में कितनी यूनिट बनाता है?`), a: tr(`About ${num(kw * yLow)} to ${num(kw * yHigh)} units a year.`, `साल में लगभग ${num(kw * yLow)} से ${num(kw * yHigh)} यूनिट।`) },
      { q: tr(`Why is my ${kw}kW system making less than this?`, `मेरा ${kw}kW सिस्टम इससे कम क्यों बना रहा है?`), a: tr('The usual reasons: shade from a water tank, wall or tree; dusty panels (clean them every 2–3 weeks when it is dry); cloudy or rainy weather; or the inverter switching off. If you get less than 80% of these figures for a whole month, call your installer.', 'आम कारण: पानी की टंकी, दीवार या पेड़ की छाया; धूल भरे पैनल (सूखे मौसम में हर 2–3 हफ़्ते साफ़ करें); बादल या बारिश; या इन्वर्टर का बंद होना। पूरे महीने इन आंकड़ों का 80% से कम मिले तो इंस्टॉलर को बुलाएँ।') },
      { q: tr(`How much money does ${kw}kW solar save?`, `${kw}kW सोलर से कितने पैसे बचते हैं?`), a: tr(`About ${inr(f.month * india.defaultRate)} a month at ₹${india.defaultRate} per unit, if your home uses the units it makes. <a href="${pricePage(kw)}">See ${kw}kW price and savings</a>.`, `₹${india.defaultRate} प्रति यूनिट पर लगभग ${inr(f.month * india.defaultRate)} महीना, अगर घर में बनी यूनिट इस्तेमाल हो। <a href="${pricePage(kw)}">${kw}kW की कीमत और बचत देखें</a>।`) }
    ];
    return {
      file: genPage(kw),
      title: tr(`${kw}kW Solar Unit Generation Per Day: ${f.dayTyp.toFixed(0)} Units? Check Your City`, `${kw}kW सोलर रोज़ कितनी यूनिट बनाता है? ${f.dayTyp.toFixed(0)} यूनिट, अपना शहर देखें`),
      description: tr(`A ${kw}kW solar system makes about ${f.dayTyp.toFixed(0)} units a day on average, but your city can give ${f.dayLow.toFixed(1)} to ${f.dayHigh.toFixed(1)}. Check your city's units, the month-by-month output and how much it cuts your bill.`, `${kw}kW सोलर सिस्टम औसतन रोज़ लगभग ${f.dayTyp.toFixed(0)} यूनिट बनाता है, लेकिन आपके शहर में ${f.dayLow.toFixed(1)} से ${f.dayHigh.toFixed(1)} तक हो सकता है। अपने शहर की यूनिट, महीने-दर-महीने उत्पादन और बिल में बचत देखें।`),
      h1: tr(`How Many Units Does ${kw}kW Solar Make in a Day?`, `${kw}kW सोलर रोज़ कितनी यूनिट बनाता है?`),
      lede: tr(`Day, month and year figures for ${kw}kW of rooftop solar, city by city.`, `${kw}kW रूफ़टॉप सोलर का रोज़, महीने और साल का उत्पादन, शहर के अनुसार।`),
      heroExtra: stats([
        ['sun', tr('Per day', 'रोज़'), tr(`about ${f.dayTyp.toFixed(0)} units`, `लगभग ${f.dayTyp.toFixed(0)} यूनिट`), true],
        ['calendar', tr('Per month', 'हर महीने'), tr(`about ${Math.round(f.month)} units`, `लगभग ${Math.round(f.month)} यूनिट`)],
        ['chart', tr('Per year', 'हर साल'), tr(`about ${num(f.year)} units`, `लगभग ${num(f.year)} यूनिट`)],
        ['rupee', tr('Worth', 'कीमत'), tr(`about ${inr(f.month * india.defaultRate)} off your bill a month`, `बिल में हर महीने लगभग ${inr(f.month * india.defaultRate)} कम`)]
      ]),
      crumbs: [{ name: tr('Solar price', 'सोलर कीमत'), file: PAGES.home }, { name: tr(`${kw}kW units per day`, `${kw}kW रोज़ की यूनिट`), file: genPage(kw) }],
      app: true,
      faqs,
      body: `${forms.sizeForm(kw, 'generation', lang, { bill: f.suitsBill, units: f.suitsUnits })}
${adSlot('after-calc')}
<div class="cols">
<section class="panel">
<h2>${icon('sun')} ${tr(`Units a day in your city (${kw}kW)`, `आपके शहर में रोज़ की यूनिट (${kw}kW)`)}</h2>
<div class="table-wrap"><table class="bars"><thead><tr><th>${tr('City', 'शहर')}</th><th class="num">${tr('Units a day', 'रोज़ की यूनिट')}</th><th class="num">${tr('Units a month', 'महीने की यूनिट')}</th></tr></thead><tbody>${cityRows}</tbody></table></div>
<p class="note">${tr('Average over the year, for panels facing south with no shade. Your real figure can be about 10% higher or lower.', 'साल का औसत, दक्षिण दिशा में बिना छाया वाले पैनल के लिए। असली आंकड़ा लगभग 10% ऊपर-नीचे हो सकता है।')}</p>
</section>
<section class="panel">
<h2>${icon('calendar')} ${tr('Month by month', 'महीने के अनुसार')}</h2>
<div class="table-wrap"><table class="bars"><thead><tr><th>${tr('Month', 'महीना')}</th><th class="num">${tr('Units a day', 'रोज़ की यूनिट')}</th><th class="num">${tr('Units in month', 'महीने की यूनिट')}</th></tr></thead><tbody>${monthRows}</tbody></table></div>
<p class="note">${tr('For a typical city. In Tamil Nadu, the rainy dip comes in October to December instead.', 'सामान्य शहर के लिए। तमिलनाडु में बारिश की कमी अक्टूबर से दिसंबर में आती है।')}</p>
</section>
</div>
<section class="prose">
<h2>${tr('Is your system working properly? Check in 3 steps', 'क्या आपका सिस्टम ठीक चल रहा है? 3 कदम में जाँचें')}</h2>
<ol class="steps">
<li>${tr("Open your inverter app (or the screen on the inverter) and find <strong>today's units</strong>.", 'इन्वर्टर ऐप (या इन्वर्टर की स्क्रीन) खोलें और <strong>आज की यूनिट</strong> देखें।')}</li>
<li>${tr('On a sunny day, compare it with your city in the table above.', 'धूप वाले दिन इसे ऊपर की तालिका में अपने शहर से मिलाएँ।')}</li>
<li>${tr('Much lower for weeks? Clean the panels, check for new shade, and call your installer.', 'हफ़्तों तक काफ़ी कम? पैनल साफ़ करें, नई छाया देखें और इंस्टॉलर को बुलाएँ।')}</li>
</ol>
<div class="pills">${neighbours(kw, genPage, tr('units per day', 'रोज़ की यूनिट'))}<a class="pill" href="${pricePage(kw)}">${tr(`${kw}kW price with subsidy`, `${kw}kW कीमत सब्सिडी के साथ`)}</a></div>
</section>
${adSlot('mid')}
${faqHtml(faqs, lang)}`
    };
  }

  function homeSpec() {
    const f3 = facts(3), f1 = facts(1), f10 = facts(10);
    const chips = [1000, 2000, 3000, 5000, 8000].map((bill) => {
      const best = sizes.reduce((a, k) => (Math.abs(facts(k).suitsBill - bill) < Math.abs(facts(a).suitsBill - bill) ? k : a), sizes[0]);
      return `<a class="chip" href="${pricePage(best)}?bill=${bill}#calculator">${inr(bill)} <span>→ ${best} kW</span></a>`;
    }).join('');
    const faqs = [
      { q: tr('How much do solar panels cost for a home in India in 2026?', '2026 में घर के लिए सोलर पैनल की कीमत कितनी है?'), a: tr(`A complete system costs about ${R(f1.p.low, f1.p.high)} for 1 kW, ${R(f3.p.low, f3.p.high)} for 3 kW and ${R(f10.p.low, f10.p.high)} for 10 kW. The government subsidy then pays you back up to ₹78,000.`, `पूरा सिस्टम 1 kW के लिए लगभग ${R(f1.p.low, f1.p.high)}, 3 kW के लिए ${R(f3.p.low, f3.p.high)} और 10 kW के लिए ${R(f10.p.low, f10.p.high)} का पड़ता है। फिर सरकारी सब्सिडी ₹78,000 तक वापस देती है।`) },
      { q: tr('How much subsidy does the government give?', 'सरकार कितनी सब्सिडी देती है?'), a: tr('Under PM Surya Ghar: ₹30,000 for 1 kW, ₹60,000 for 2 kW and ₹78,000 for 3 kW or more. It is paid into your bank account after installation.', 'पीएम सूर्य घर योजना में: 1 kW पर ₹30,000, 2 kW पर ₹60,000 और 3 kW या ज़्यादा पर ₹78,000। यह सिस्टम लगने के बाद आपके बैंक खाते में आती है।') },
      { q: tr('What size of solar do I need?', 'मुझे कितने साइज़ का सोलर चाहिए?'), a: tr(`Look at your monthly bill. Roughly: up to ₹1,000 → 1 kW, ₹2,000 → 2 kW, ₹2,500–3,000 → 3 kW, ₹4,000–5,000 → 5 kW. Each kW needs about ${common.solarDefaults.sqftPerKw} sq ft of open roof.`, `अपना मासिक बिल देखें। मोटे तौर पर: ₹1,000 तक → 1 kW, ₹2,000 → 2 kW, ₹2,500–3,000 → 3 kW, ₹4,000–5,000 → 5 kW। हर kW के लिए लगभग ${common.solarDefaults.sqftPerKw} वर्ग फ़ुट खुली छत चाहिए।`) },
      { q: tr('How many units does 1kW solar make in a day?', '1kW सोलर रोज़ कितनी यूनिट बनाता है?'), a: tr(`About 4 units a day, a little more in sunny states. <a href="${genPage(1)}">See your city</a>.`, `रोज़ लगभग 4 यूनिट, धूप वाले राज्यों में थोड़ा ज़्यादा। <a href="${genPage(1)}">अपना शहर देखें</a>।`) }
    ];
    const cards = sizes.map((kw) => {
      const f = facts(kw);
      return `<li><a class="size-card" href="${pricePage(kw)}"><span class="size">${kw}<small>kW</small></span><span class="pay">${R(f.afterLow, f.afterHigh)}</span><span class="meta">${tr('after subsidy', 'सब्सिडी के बाद')} · ${f.dayTyp.toFixed(0)} ${tr('units/day', 'यूनिट/दिन')}</span></a></li>`;
    }).join('');
    return {
      file: PAGES.home,
      title: tr('Solar System Price in India 2026 With Subsidy – 1kW to 10kW Cost & Generation', 'सोलर सिस्टम की कीमत 2026 सब्सिडी के साथ – 1kW से 10kW तक खर्च और उत्पादन'),
      description: tr('How much rooftop solar costs in India for 1kW, 2kW, 3kW, 5kW and 10kW, how much the government subsidy pays, how many units it makes and how fast it pays back.', '1kW, 2kW, 3kW, 5kW और 10kW रूफ़टॉप सोलर की कीमत, सरकारी सब्सिडी, रोज़ की यूनिट और पैसा कितनी जल्दी वापस आता है।'),
      h1: tr('How Much Does Rooftop Solar Cost?', 'रूफ़टॉप सोलर कितने का पड़ता है?'),
      lede: tr('Pick your monthly electricity bill to see the right solar size, what you pay after the government subsidy, and how much you save.', 'अपना मासिक बिजली बिल चुनें और देखें कौन-सा सोलर साइज़ सही है, सरकारी सब्सिडी के बाद आप कितना देंगे और कितनी बचत होगी।'),
      heroExtra: `<div class="chips"><span class="chip-label">${tr('My monthly bill is about', 'मेरा मासिक बिल लगभग है')}</span>${chips}</div>`,
      app: true,
      faqs,
      body: `<section><h2 class="section-title">${tr('Price list: 1kW to 10kW', 'कीमत सूची: 1kW से 10kW')}</h2>
<ul class="size-grid">${cards}</ul></section>
${forms.sizeForm(3, 'price', lang, { bill: f3.suitsBill, units: f3.suitsUnits })}
${adSlot('after-calc')}
<section class="prose"><h2>${tr('Which size is right for you?', 'आपके लिए कौन-सा साइज़ सही है?')}</h2>${compareTable(null)}</section>
<section><h2 class="section-title">${tr('More tools', 'और टूल')}</h2>
<ul class="tool-grid">
<li><a href="${PAGES.subsidy}">${icon('gift')}<strong>${tr('Government subsidy', 'सरकारी सब्सिडी')}</strong><small>${tr('How much you get and how to apply', 'कितनी मिलती है और कैसे आवेदन करें')}</small></a></li>
<li><a href="${PAGES.solar}">${icon('sun')}<strong>${tr('Gujarat solar savings', 'गुजरात सोलर बचत')}</strong><small>${tr("Uses your electricity company's exact rates", 'आपकी बिजली कंपनी की सटीक दरों से')}</small></a></li>
<li><a href="${PAGES.gujaratBill}">${icon('bolt')}<strong>${tr('Gujarat electricity bill', 'गुजरात बिजली बिल')}</strong><small>UGVCL, MGVCL, DGVCL, PGVCL, Torrent</small></a></li>
<li><a href="${PAGES.ev}">${icon('car')}<strong>${tr('Electric vehicle charging', 'इलेक्ट्रिक गाड़ी चार्जिंग')}</strong><small>${tr('Cost per km at home and outside', 'घर और बाहर, प्रति किमी खर्च')}</small></a></li>
</ul></section>
${glossary}
${faqHtml(faqs, lang)}`
    };
  }

  return [homeSpec()].concat(...sizes.map((kw) => [pricePageSpec(kw), genPageSpec(kw)]));
};
