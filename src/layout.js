'use strict';
const { esc, t, fmtDate, icon } = require('./util');

/*
 * Wraps a page body in the shared shell: head/meta, header with language switch,
 * hero band (title + intro), disclaimer strip and footer.
 * page: { file, title, description, h1, lede, heroExtra, crumbs, app, faqs, body,
 *         state (tariff the calculators use), langs (languages the page exists in) }
 * ctx:  { cfg, base, PAGES, lastReviewed, sizes, pricePage, genPage, discoms }
 */
function layout(page, lang, ctx) {
  const tr = t(lang);
  const { cfg, base, PAGES } = ctx;
  const pre = lang === 'en' ? '' : '../';
  const urlFor = (l, file) => `${base}/${l === 'en' ? '' : `${l}/`}${file === 'index.html' ? '' : file}`;
  const url = urlFor(lang, page.file);
  const langs = page.langs || ['en', 'hi'];
  const LANG_NAMES = { en: 'English', hi: 'हिन्दी', mr: 'मराठी' };
  const LOCALES = { en: 'en_IN', hi: 'hi_IN', mr: 'mr_IN' };
  const hrefIn = (l) => `${pre}${l === 'en' ? '' : `${l}/`}${page.file === 'index.html' ? '' : page.file}` || './';
  const otherLang = lang === 'hi' ? 'en' : 'hi';
  const switchHref = lang === 'hi' ? `../${page.file}` : `hi/${page.file}`;
  const langLinks = langs.length > 2
    ? `<span class="lang-links">${langs.filter((l) => l !== lang).map((l) => `<a class="lang-switch" href="${hrefIn(l)}" hreflang="${l}" lang="${l}">${LANG_NAMES[l]}</a>`).join('')}</span>`
    : `<a class="lang-switch" href="${switchHref}" hreflang="${otherLang}" lang="${otherLang}">${lang === 'hi' ? 'English' : 'हिन्दी'}</a>`;
  const crumbs = page.crumbs || [];
  const home = tr('Home', 'होम', 'मुख्यपृष्ठ');

  const graph = [
    { '@type': 'WebSite', '@id': `${base}/#website`, name: cfg.siteName, alternateName: [cfg.siteName.replace(/\s+/g, ''), new URL(base).host], url: `${base}/`, inLanguage: ['en-IN', 'hi-IN'] },
    { '@type': 'WebPage', isPartOf: { '@id': `${base}/#website` }, name: page.title, url, description: page.description, inLanguage: `${lang}-IN`, dateModified: ctx.lastReviewed },
    crumbs.length ? {
      '@type': 'BreadcrumbList',
      itemListElement: [{ name: home, file: 'index.html' }].concat(crumbs).map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: urlFor(lang, c.file) }))
    } : null,
    page.app ? { '@type': 'WebApplication', name: page.h1, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' }, url } : null,
    page.faqs ? { '@type': 'FAQPage', mainEntity: page.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') } })) } : null
  ].filter(Boolean);

  const nav = [
    [tr('Solar price', 'सोलर कीमत', 'सौर किंमत'), PAGES.home],
    ['3kW', ctx.pricePage(3)],
    ['5kW', ctx.pricePage(5)],
    [tr('Units per day', 'रोज़ की यूनिट', 'दररोजचे युनिट'), ctx.genPage(3)],
    [tr('Subsidy', 'सब्सिडी', 'अनुदान'), PAGES.subsidy],
    [tr('Gujarat bill', 'गुजरात बिल', 'गुजरात बिल'), PAGES.gujaratBill],
    [tr('EV charging', 'EV चार्जिंग', 'EV चार्जिंग'), PAGES.ev]
  ];
  const [brandA, ...brandB] = cfg.siteName.split(' ');

  return `<!doctype html>
<html lang="${lang}"${page.state ? ` data-state="${page.state}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${url}">
${langs.map((l) => `<link rel="alternate" hreflang="${l}-IN" href="${urlFor(l, page.file)}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${urlFor('en', page.file)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${esc(cfg.siteName)}">
<meta property="og:locale" content="${LOCALES[lang]}">
<meta name="theme-color" content="#0b4a6f">
${cfg.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(cfg.googleSiteVerification)}">\n` : ''}<link rel="icon" href="${pre}favicon.svg" type="image/svg+xml">
<link rel="icon" href="${pre}favicon-48.png" sizes="48x48" type="image/png">
<link rel="apple-touch-icon" href="${pre}favicon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Mukta:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="${pre}assets/style.css">
${cfg.ahrefsAnalyticsKey ? `<script async src="https://analytics.ahrefs.com/analytics.js" data-key="${esc(cfg.ahrefsAnalyticsKey)}"></script>\n` : ''}${cfg.adsenseClient ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(cfg.adsenseClient)}" crossorigin="anonymous"></script>\n` : ''}<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>
</head>
<body>
<header class="site-header" data-nosnippet><div class="wrap">
<a class="logo" href="./">${icon('sun', 'logo-mark')}<span>${esc(brandA)}<b>${esc(brandB.join(' '))}</b></span></a>
<nav class="nav" aria-label="${tr('Main', 'मुख्य', 'मुख्य')}">${nav.map(([n, f]) => `<a href="${f}"${f === page.file ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</nav>
${langLinks}
</div></header>
<section class="hero"><div class="wrap">
${crumbs.length ? `<nav class="crumbs" aria-label="${tr('Breadcrumb', 'पथ', 'मार्ग')}"><a href="./">${home}</a>${crumbs.map((c) => ` <span aria-hidden="true">›</span> ${c.file === page.file ? `<span>${esc(c.name)}</span>` : `<a href="${c.file}">${esc(c.name)}</a>`}`).join('')}</nav>` : ''}
<h1>${esc(page.h1)}</h1>
${page.lede ? `<p class="lede">${page.lede}</p>` : ''}
${page.heroExtra || ''}
</div></section>
<main><div class="wrap">
${page.body}
<aside class="disclaimer" role="note">${icon('info')}<p><strong>${tr('For information only.', 'केवल जानकारी के लिए।', 'केवळ माहितीसाठी.')}</strong> ${tr(
    'All figures on this site are estimates worked out from information publicly available on the internet (tariff orders, government scheme pages and installer price lists). They are not official and are not endorsed by any government body, electricity company or solar brand. Please confirm with your electricity company or installer before you decide.',
    'इस साइट के सभी आंकड़े इंटरनेट पर उपलब्ध सार्वजनिक जानकारी (टैरिफ आदेश, सरकारी योजना पेज और इंस्टॉलर की कीमत सूची) से निकाले गए अनुमान हैं। ये आधिकारिक नहीं हैं और किसी सरकारी विभाग, बिजली कंपनी या सोलर ब्रांड द्वारा प्रमाणित नहीं हैं। कोई भी फ़ैसला लेने से पहले अपनी बिजली कंपनी या इंस्टॉलर से पुष्टि करें।',
    'या साइटवरील सर्व आकडे इंटरनेटवर उपलब्ध सार्वजनिक माहितीवरून (दर आदेश, सरकारी योजनांची पाने व इन्स्टॉलरच्या किंमत याद्या) काढलेले अंदाज आहेत. ते अधिकृत नाहीत आणि कोणत्याही सरकारी विभाग, वीज कंपनी किंवा सौर ब्रँडने प्रमाणित केलेले नाहीत. कोणताही निर्णय घेण्यापूर्वी तुमच्या वीज कंपनीकडून किंवा इन्स्टॉलरकडून खात्री करा.'
  )} <a href="${PAGES.disclaimer}">${tr('Read the full disclaimer', 'पूरा अस्वीकरण पढ़ें', 'संपूर्ण अस्वीकरण वाचा')}</a>.</p></aside>
</div></main>
<footer class="site-footer" data-nosnippet><div class="wrap">
<div class="footer-grid">
<div><h2>${tr('Solar price', 'सोलर कीमत', 'सौर किंमत')}</h2><ul>${ctx.sizes.map((k) => `<li><a href="${ctx.pricePage(k)}">${k}kW ${tr('solar price', 'सोलर कीमत', 'सौर किंमत')}</a></li>`).join('')}</ul></div>
<div><h2>${tr('Units per day', 'रोज़ की यूनिट', 'दररोजचे युनिट')}</h2><ul>${ctx.sizes.map((k) => `<li><a href="${ctx.genPage(k)}">${k}kW ${tr('generation', 'उत्पादन', 'उत्पादन')}</a></li>`).join('')}</ul></div>
<div><h2>${tr('Gujarat tools', 'गुजरात टूल', 'गुजरात साधने')}</h2><ul>
<li><a href="${PAGES.gujaratBill}">${tr('Electricity bill calculator', 'बिजली बिल कैलकुलेटर', 'वीज बिल कॅल्क्युलेटर')}</a></li>
${ctx.discoms.map((d) => `<li><a href="${d.slug}.html">${esc(lang === 'en' ? d.name : d.nameHi)} ${tr('bill', 'बिल', 'बिल')}</a></li>`).join('')}
<li><a href="${PAGES.solar}">${tr('Solar savings (exact tariff)', 'सोलर बचत (सटीक टैरिफ़)', 'सौर बचत (अचूक दर)')}</a></li>
<li><a href="${PAGES.ev}">${tr('EV charging cost', 'EV चार्जिंग खर्च', 'EV चार्जिंग खर्च')}</a></li>
</ul></div>
<div><h2>${esc(cfg.siteName)}</h2><ul>
<li><a href="${PAGES.subsidy}">${tr('PM Surya Ghar subsidy', 'पीएम सूर्य घर सब्सिडी', 'पीएम सूर्य घर अनुदान')}</a></li>
<li><a href="${PAGES.news}">${tr('Solar & electricity news', 'सोलर और बिजली की ख़बरें', 'सौर व वीज बातम्या')}</a></li>
<li><a href="${PAGES.netMetering}">${tr('Net metering', 'नेट मीटरिंग', 'नेट मीटरिंग')}</a></li>
<li><a href="${PAGES.tou}">${tr('Smart meter discount', 'स्मार्ट मीटर छूट', 'स्मार्ट मीटर सवलत')}</a></li>
<li><a href="${PAGES.about}">${tr('About & sources', 'हमारे बारे में और स्रोत', 'आमच्याविषयी व स्रोत')}</a></li>
<li><a href="${PAGES.contact}">${tr('Contact us', 'संपर्क करें', 'संपर्क करा')}</a></li>
<li><a href="${PAGES.disclaimer}">${tr('Disclaimer', 'अस्वीकरण', 'अस्वीकरण')}</a></li>
<li><a href="${PAGES.privacy}">${tr('Privacy policy', 'गोपनीयता नीति', 'गोपनीयता धोरण')}</a></li>
${lang === 'mr' ? `<li><a href="${hrefIn('en')}" hreflang="en" lang="en">English</a></li>` : `<li><a href="${switchHref}" hreflang="${otherLang}" lang="${otherLang}">${lang === 'hi' ? 'English' : 'हिन्दी में देखें'}</a></li>`}
</ul></div>
<div><h2>${tr('Other states', 'दूसरे राज्य', 'इतर राज्ये')}</h2><ul>
${(ctx.states || []).map((st) => `<li><a href="${st.stateSlug}-electricity-bill-calculator.html">${esc(tr(st.state, st.stateHi, st.stateMr))} ${tr('bill', 'बिल', 'बिल')}</a></li><li><a href="solar-rooftop-calculator-${st.stateSlug}.html">${esc(tr(st.state, st.stateHi, st.stateMr))} ${tr('solar', 'सोलर', 'सौर')}</a></li>`).join('')}
</ul></div>
</div>
<p class="fine">${tr(
    `Estimates for information only. Not affiliated with or endorsed by any government body, electricity company, installer or brand. Last reviewed ${fmtDate(ctx.lastReviewed, 'en')}.`,
    `केवल जानकारी के लिए अनुमान। किसी सरकारी विभाग, बिजली कंपनी, इंस्टॉलर या ब्रांड से संबद्ध या प्रमाणित नहीं। अंतिम समीक्षा ${fmtDate(ctx.lastReviewed, 'hi')}।`,
    `केवळ माहितीसाठी अंदाज. कोणत्याही सरकारी विभाग, वीज कंपनी, इन्स्टॉलर किंवा ब्रँडशी संबंधित किंवा प्रमाणित नाही. शेवटचा आढावा ${fmtDate(ctx.lastReviewed, 'mr')}.`
  )}</p>
</div></footer>
${page.contact ? `<script src="${pre}assets/contact.js?v=2" defer></script>\n` : ''}${page.app ? `<script src="${pre}assets/calc.js"></script>\n<script src="${pre}assets/data.js"></script>\n<script src="${pre}assets/app.js"></script>\n` : ''}</body>
</html>
`;
}

module.exports = { layout };
