'use strict';
const { esc, t, fmtDate } = require('./util');

// About, privacy policy and disclaimer pages.
module.exports = function staticPages(lang, { cfg, data, common, PAGES, lastReviewed }) {
  const tr = t(lang);
  const date = fmtDate(lastReviewed, lang);
  const contact = cfg.contactEmail ? tr(` Email: ${esc(cfg.contactEmail)}`, ` ईमेल: ${esc(cfg.contactEmail)}`) : '';

  const disclaimer = {
    file: PAGES.disclaimer,
    title: tr(`Disclaimer – ${cfg.siteName}`, `अस्वीकरण – ${cfg.siteName}`),
    description: tr('Figures on this site are estimates based on public information, for information only. Not official and not endorsed by any government body, electricity company or brand.', 'इस साइट के आंकड़े सार्वजनिक जानकारी पर आधारित अनुमान हैं, केवल जानकारी के लिए। आधिकारिक नहीं और किसी सरकारी विभाग, बिजली कंपनी या ब्रांड द्वारा प्रमाणित नहीं।'),
    h1: tr('Disclaimer', 'अस्वीकरण'),
    crumbs: [{ name: tr('Disclaimer', 'अस्वीकरण'), file: PAGES.disclaimer }],
    body: `<section class="prose">
<h2>${tr('For information only', 'केवल जानकारी के लिए')}</h2>
<p>${tr(`${esc(cfg.siteName)} is an independent website. All calculators, prices, subsidy amounts, electricity rates, generation figures and savings shown here are <strong>estimates</strong>. They are worked out from information publicly available on the internet, such as electricity tariff orders, government scheme websites and solar installer price lists.`, `${esc(cfg.siteName)} एक स्वतंत्र वेबसाइट है। यहाँ दिखाए गए सभी कैलकुलेटर, कीमतें, सब्सिडी राशि, बिजली दरें, उत्पादन के आंकड़े और बचत <strong>अनुमान</strong> हैं। ये इंटरनेट पर उपलब्ध सार्वजनिक जानकारी, जैसे बिजली टैरिफ़ आदेश, सरकारी योजना की वेबसाइट और सोलर इंस्टॉलर की कीमत सूची से निकाले गए हैं।`)}</p>
<h2>${tr('Not official, not endorsed', 'आधिकारिक नहीं, प्रमाणित नहीं')}</h2>
<p>${tr('This website is not run by, connected to, or endorsed by the Government of India, any state government, the Ministry of New and Renewable Energy, any electricity regulatory commission, any electricity distribution company (such as UGVCL, MGVCL, DGVCL, PGVCL or Torrent Power), any solar installer or any solar brand. Brand and company names are used only to describe them.', 'यह वेबसाइट भारत सरकार, किसी राज्य सरकार, नवीन और नवीकरणीय ऊर्जा मंत्रालय, किसी बिजली नियामक आयोग, किसी बिजली वितरण कंपनी (जैसे UGVCL, MGVCL, DGVCL, PGVCL या टोरेंट पावर), किसी सोलर इंस्टॉलर या किसी सोलर ब्रांड द्वारा न चलाई जाती है, न उनसे जुड़ी है और न उनके द्वारा प्रमाणित है। ब्रांड और कंपनियों के नाम केवल पहचान के लिए इस्तेमाल किए गए हैं।')}</p>
<h2>${tr('Your actual figures can differ', 'आपके असली आंकड़े अलग हो सकते हैं')}</h2>
<ul class="ticks">
<li>${tr('Electricity rates, fuel surcharges and taxes change, sometimes every few months.', 'बिजली दरें, ईंधन सरचार्ज और टैक्स बदलते रहते हैं, कभी-कभी हर कुछ महीनों में।')}</li>
<li>${tr('Solar prices vary by brand, installer, city and roof.', 'सोलर की कीमत ब्रांड, इंस्टॉलर, शहर और छत के अनुसार बदलती है।')}</li>
<li>${tr('Solar output depends on weather, shade, dust and how the system is installed.', 'सोलर उत्पादन मौसम, छाया, धूल और इंस्टॉलेशन पर निर्भर करता है।')}</li>
<li>${tr('Government schemes and subsidy rules can change or end.', 'सरकारी योजनाएँ और सब्सिडी के नियम बदल या ख़त्म हो सकते हैं।')}</li>
</ul>
<h2>${tr('Before you decide', 'फ़ैसला लेने से पहले')}</h2>
<p>${tr(`Please confirm rates with your electricity company, subsidy details on the official <a href="${common.pmSuryaGhar.url}" rel="nofollow noopener">PM Surya Ghar portal</a>, and prices with 2 or 3 installers. We are not responsible for any decision, loss or expense based on information from this website.`, `कृपया दरों की पुष्टि अपनी बिजली कंपनी से, सब्सिडी की जानकारी आधिकारिक <a href="${common.pmSuryaGhar.url}" rel="nofollow noopener">पीएम सूर्य घर पोर्टल</a> से, और कीमत 2–3 इंस्टॉलरों से करें। इस वेबसाइट की जानकारी के आधार पर लिए गए किसी फ़ैसले, नुकसान या खर्च के लिए हम ज़िम्मेदार नहीं हैं।`)}</p>
<p class="note">${tr(`Last updated ${date}.`, `अंतिम अपडेट ${date}।`)}</p>
</section>`
  };

  const about = {
    file: PAGES.about,
    title: tr(`About ${cfg.siteName} – Sources & Method`, `${cfg.siteName} के बारे में – स्रोत और तरीका`),
    description: tr(`Where the figures on ${cfg.siteName} come from and how often they are updated.`, `${cfg.siteName} के आंकड़े कहाँ से आते हैं और कितनी बार अपडेट होते हैं।`),
    h1: tr('About us and our sources', 'हमारे बारे में और स्रोत'),
    crumbs: [{ name: tr('About', 'हमारे बारे में'), file: PAGES.about }],
    body: `<section class="prose">
<p>${tr(`${esc(cfg.siteName)} is an independent set of free calculators that help homes understand electricity bills, rooftop solar and electric vehicle charging in plain language.`, `${esc(cfg.siteName)} मुफ़्त कैलकुलेटर का एक स्वतंत्र संग्रह है, जो घरों को बिजली बिल, रूफ़टॉप सोलर और इलेक्ट्रिक गाड़ी चार्जिंग आसान भाषा में समझने में मदद करता है।`)}</p>
<h2>${tr('Where the figures come from', 'आंकड़े कहाँ से आते हैं')}</h2>
<ul class="ticks">
${data.discoms.map((d) => `<li>${esc(lang === 'hi' ? d.nameHi : d.name)}: <a href="${d.sourceUrl}" rel="nofollow noopener">${esc(d.orderCase)}</a></li>`).join('\n')}
<li>${tr('Subsidy', 'सब्सिडी')}: <a href="${common.pmSuryaGhar.url}" rel="nofollow noopener">${esc(common.pmSuryaGhar.name)}</a></li>
<li>${tr('Regulator', 'नियामक')}: <a href="${data.regulator.url}" rel="nofollow noopener">${esc(data.regulator.name)}</a></li>
<li>${tr('Solar prices: installer price lists published in 2026, shown as typical ranges.', 'सोलर कीमत: 2026 में प्रकाशित इंस्टॉलर कीमत सूचियाँ, सामान्य दायरे के रूप में।')}</li>
<li>${tr('Solar output: estimates by city for panels facing south with no shade.', 'सोलर उत्पादन: बिना छाया, दक्षिण दिशा वाले पैनल के लिए शहर अनुसार अनुमान।')}</li>
</ul>
<h2>${tr('How often we update', 'हम कितनी बार अपडेट करते हैं')}</h2>
<p>${tr('Electricity rates every April, when new tariff orders come out. Fuel surcharge and solar prices every few months.', 'बिजली दरें हर अप्रैल में, जब नए टैरिफ़ आदेश आते हैं। ईंधन सरचार्ज और सोलर कीमतें हर कुछ महीनों में।')} ${tr(`Last reviewed ${date}.`, `अंतिम समीक्षा ${date}।`)}</p>
<p>${tr('All figures are estimates for information only.', 'सभी आंकड़े केवल जानकारी के लिए अनुमान हैं।')} <a href="${PAGES.disclaimer}">${tr('Read the disclaimer', 'अस्वीकरण पढ़ें')}</a>.${contact}</p>
</section>`
  };

  const privacy = {
    file: PAGES.privacy,
    title: tr(`Privacy Policy – ${cfg.siteName}`, `गोपनीयता नीति – ${cfg.siteName}`),
    description: tr(`Privacy policy for ${cfg.siteName}.`, `${cfg.siteName} की गोपनीयता नीति।`),
    h1: tr('Privacy policy', 'गोपनीयता नीति'),
    crumbs: [{ name: tr('Privacy policy', 'गोपनीयता नीति'), file: PAGES.privacy }],
    body: `<section class="prose">
<p>${tr('All calculations run in your browser. The numbers you type are not sent to or stored on our server.', 'सारी गणना आपके ब्राउज़र में होती है। आपके भरे आंकड़े हमारे सर्वर पर न भेजे जाते हैं, न रखे जाते हैं।')}</p>
<h2>${tr('Advertising and cookies', 'विज्ञापन और कुकीज़')}</h2>
<p>${tr('This site may show ads served by Google. Google and its partners use cookies to show ads based on your visits to this and other websites. You can turn off personalised ads at <a href="https://www.google.com/settings/ads" rel="nofollow noopener">Google Ad Settings</a>. See <a href="https://policies.google.com/technologies/ads" rel="nofollow noopener">how Google uses data from sites that use its services</a>.', 'इस साइट पर Google के विज्ञापन दिख सकते हैं। Google और उसके साझेदार कुकीज़ से इस और दूसरी वेबसाइटों पर आपकी विज़िट के आधार पर विज्ञापन दिखाते हैं। आप <a href="https://www.google.com/settings/ads" rel="nofollow noopener">Google Ad Settings</a> में व्यक्तिगत विज्ञापन बंद कर सकते हैं। देखें <a href="https://policies.google.com/technologies/ads" rel="nofollow noopener">Google डेटा का उपयोग कैसे करता है</a>।')}</p>
<h2>${tr('Analytics', 'एनालिटिक्स')}</h2>
<p>${tr('We use Ahrefs Web Analytics to count visits and see which pages are useful. It does not use cookies and does not identify you.', 'कौन-से पेज काम के हैं, यह जानने के लिए हम Ahrefs Web Analytics से विज़िट गिनते हैं। यह कुकीज़ का उपयोग नहीं करता और आपकी पहचान नहीं करता।')}${contact}</p>
<p class="note">${tr(`Last updated ${date}.`, `अंतिम अपडेट ${date}।`)}</p>
</section>`
  };

  return [about, privacy, disclaimer];
};
