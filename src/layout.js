'use strict';
const { esc, t, fmtDate, icon } = require('./util');

/*
 * Wraps a page body in the shared shell: head/meta, header with language switch,
 * hero band (title + intro), disclaimer strip and footer.
 * page: { file, title, description, h1, lede, heroExtra, crumbs, app, faqs, body }
 * ctx:  { cfg, base, PAGES, lastReviewed, sizes, pricePage, genPage, discoms }
 */
function layout(page, lang, ctx) {
  const tr = t(lang);
  const { cfg, base, PAGES } = ctx;
  const pre = lang === 'hi' ? '../' : '';
  const urlFor = (l, file) => `${base}/${l === 'hi' ? 'hi/' : ''}${file === 'index.html' ? '' : file}`;
  const url = urlFor(lang, page.file);
  const otherLang = lang === 'hi' ? 'en' : 'hi';
  const switchHref = lang === 'hi' ? `../${page.file}` : `hi/${page.file}`;
  const crumbs = page.crumbs || [];
  const home = tr('Home', 'होम');

  const graph = [
    { '@type': 'WebSite', '@id': `${base}/#website`, name: cfg.siteName, alternateName: [cfg.siteName.replace(/\s+/g, ''), new URL(base).host], url: `${base}/`, inLanguage: ['en-IN', 'hi-IN'] },
    { '@type': 'WebPage', isPartOf: { '@id': `${base}/#website` }, name: page.title, url, description: page.description, inLanguage: lang === 'hi' ? 'hi-IN' : 'en-IN', dateModified: ctx.lastReviewed },
    crumbs.length ? {
      '@type': 'BreadcrumbList',
      itemListElement: [{ name: home, file: 'index.html' }].concat(crumbs).map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: urlFor(lang, c.file) }))
    } : null,
    page.app ? { '@type': 'WebApplication', name: page.h1, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' }, url } : null,
    page.faqs ? { '@type': 'FAQPage', mainEntity: page.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') } })) } : null
  ].filter(Boolean);

  const nav = [
    [tr('Solar price', 'सोलर कीमत'), PAGES.home],
    ['3kW', ctx.pricePage(3)],
    ['5kW', ctx.pricePage(5)],
    [tr('Units per day', 'रोज़ की यूनिट'), ctx.genPage(3)],
    [tr('Subsidy', 'सब्सिडी'), PAGES.subsidy],
    [tr('Gujarat bill', 'गुजरात बिल'), PAGES.gujaratBill],
    [tr('EV charging', 'EV चार्जिंग'), PAGES.ev]
  ];
  const [brandA, ...brandB] = cfg.siteName.split(' ');

  return `<!doctype html>
<html lang="${lang === 'hi' ? 'hi' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en-IN" href="${urlFor('en', page.file)}">
<link rel="alternate" hreflang="hi-IN" href="${urlFor('hi', page.file)}">
<link rel="alternate" hreflang="x-default" href="${urlFor('en', page.file)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${esc(cfg.siteName)}">
<meta property="og:locale" content="${lang === 'hi' ? 'hi_IN' : 'en_IN'}">
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
<nav class="nav" aria-label="${tr('Main', 'मुख्य')}">${nav.map(([n, f]) => `<a href="${f}"${f === page.file ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</nav>
<a class="lang-switch" href="${switchHref}" hreflang="${otherLang}" lang="${otherLang}">${lang === 'hi' ? 'English' : 'हिन्दी'}</a>
</div></header>
<section class="hero"><div class="wrap">
${crumbs.length ? `<nav class="crumbs" aria-label="${tr('Breadcrumb', 'पथ')}"><a href="./">${home}</a>${crumbs.map((c) => ` <span aria-hidden="true">›</span> ${c.file === page.file ? `<span>${esc(c.name)}</span>` : `<a href="${c.file}">${esc(c.name)}</a>`}`).join('')}</nav>` : ''}
<h1>${esc(page.h1)}</h1>
${page.lede ? `<p class="lede">${page.lede}</p>` : ''}
${page.heroExtra || ''}
</div></section>
<main><div class="wrap">
${page.body}
<aside class="disclaimer" role="note">${icon('info')}<p><strong>${tr('For information only.', 'केवल जानकारी के लिए।')}</strong> ${tr(
    'All figures on this site are estimates worked out from information publicly available on the internet (tariff orders, government scheme pages and installer price lists). They are not official and are not endorsed by any government body, electricity company or solar brand. Please confirm with your electricity company or installer before you decide.',
    'इस साइट के सभी आंकड़े इंटरनेट पर उपलब्ध सार्वजनिक जानकारी (टैरिफ आदेश, सरकारी योजना पेज और इंस्टॉलर की कीमत सूची) से निकाले गए अनुमान हैं। ये आधिकारिक नहीं हैं और किसी सरकारी विभाग, बिजली कंपनी या सोलर ब्रांड द्वारा प्रमाणित नहीं हैं। कोई भी फ़ैसला लेने से पहले अपनी बिजली कंपनी या इंस्टॉलर से पुष्टि करें।'
  )} <a href="${PAGES.disclaimer}">${tr('Read the full disclaimer', 'पूरा अस्वीकरण पढ़ें')}</a>.</p></aside>
</div></main>
<footer class="site-footer" data-nosnippet><div class="wrap">
<div class="footer-grid">
<div><h2>${tr('Solar price', 'सोलर कीमत')}</h2><ul>${ctx.sizes.map((k) => `<li><a href="${ctx.pricePage(k)}">${k}kW ${tr('solar price', 'सोलर कीमत')}</a></li>`).join('')}</ul></div>
<div><h2>${tr('Units per day', 'रोज़ की यूनिट')}</h2><ul>${ctx.sizes.map((k) => `<li><a href="${ctx.genPage(k)}">${k}kW ${tr('generation', 'उत्पादन')}</a></li>`).join('')}</ul></div>
<div><h2>${tr('Gujarat tools', 'गुजरात टूल')}</h2><ul>
<li><a href="${PAGES.gujaratBill}">${tr('Electricity bill calculator', 'बिजली बिल कैलकुलेटर')}</a></li>
${ctx.discoms.map((d) => `<li><a href="${d.slug}.html">${esc(lang === 'hi' ? d.nameHi : d.name)} ${tr('bill', 'बिल')}</a></li>`).join('')}
<li><a href="${PAGES.solar}">${tr('Solar savings (exact tariff)', 'सोलर बचत (सटीक टैरिफ़)')}</a></li>
<li><a href="${PAGES.ev}">${tr('EV charging cost', 'EV चार्जिंग खर्च')}</a></li>
</ul></div>
<div><h2>${esc(cfg.siteName)}</h2><ul>
<li><a href="${PAGES.subsidy}">${tr('PM Surya Ghar subsidy', 'पीएम सूर्य घर सब्सिडी')}</a></li>
<li><a href="${PAGES.netMetering}">${tr('Net metering', 'नेट मीटरिंग')}</a></li>
<li><a href="${PAGES.tou}">${tr('Smart meter discount', 'स्मार्ट मीटर छूट')}</a></li>
<li><a href="${PAGES.about}">${tr('About & sources', 'हमारे बारे में और स्रोत')}</a></li>
<li><a href="${PAGES.disclaimer}">${tr('Disclaimer', 'अस्वीकरण')}</a></li>
<li><a href="${PAGES.privacy}">${tr('Privacy policy', 'गोपनीयता नीति')}</a></li>
<li><a href="${switchHref}" hreflang="${otherLang}" lang="${otherLang}">${lang === 'hi' ? 'English' : 'हिन्दी में देखें'}</a></li>
</ul></div>
</div>
<p class="fine">${tr(
    `Estimates for information only. Not affiliated with or endorsed by any government body, electricity company, installer or brand. Last reviewed ${fmtDate(ctx.lastReviewed, 'en')}.`,
    `केवल जानकारी के लिए अनुमान। किसी सरकारी विभाग, बिजली कंपनी, इंस्टॉलर या ब्रांड से संबद्ध या प्रमाणित नहीं। अंतिम समीक्षा ${fmtDate(ctx.lastReviewed, 'hi')}।`
  )}</p>
</div></footer>
${page.app ? `<script src="${pre}assets/calc.js"></script>\n<script src="${pre}assets/data.js"></script>\n<script src="${pre}assets/app.js"></script>\n` : ''}</body>
</html>
`;
}

module.exports = { layout };
