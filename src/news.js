'use strict';
const { esc, t, fmtDate, MONTHS } = require('./util');

/*
 * Solar and electricity news (data/news.json, kept up to date by the news agent).
 * checkNews() refuses entries that are not backed by an official source or by two
 * established outlets; build.js stops if it finds any.
 */

// Government, regulator and DISCOM sites.
const OFFICIAL_SOURCES = [
  'pib.gov.in', 'pmindia.gov.in', 'mnre.gov.in', 'pmsuryaghar.gov.in', 'powermin.gov.in', 'cea.nic.in',
  'cercind.gov.in', 'gercin.org', 'guvnl.com', 'ugvcl.com', 'mgvcl.com', 'dgvcl.com', 'pgvcl.com',
  'torrentpower.com', 'geda.gujarat.gov.in', 'gujaratindia.gov.in', 'cbic.gov.in', 'gstcouncil.gov.in',
  'egazette.gov.in', 'sansad.in', 'newsonair.gov.in', 'ddnews.gov.in', 'x.com/PIB_India', 'x.com/MNREIndia'
];
// Established national news outlets and specialist energy publications.
const NEWS_OUTLETS = [
  'thehindu.com', 'thehindubusinessline.com', 'indianexpress.com', 'newindianexpress.com', 'hindustantimes.com',
  'livemint.com', 'timesofindia.indiatimes.com', 'economictimes.indiatimes.com', 'business-standard.com',
  'financialexpress.com', 'moneycontrol.com', 'ndtv.com', 'ndtvprofit.com', 'indiatoday.in', 'businesstoday.in',
  'news18.com', 'zeebiz.com', 'india.com', 'tribuneindia.com', 'deccanherald.com', 'telegraphindia.com',
  'theprint.in', 'outlookbusiness.com', 'outlookmoney.com', 'upstox.com', 'aninews.in', 'deshgujarat.com',
  'divyabhaskar.co.in', 'gujarati.news18.com', 'sandesh.com', 'jagran.com', 'bhaskar.com', 'amarujala.com',
  'livehindustan.com', 'mercomindia.com', 'pv-magazine-india.com', 'saurenergy.com', 'energetica-india.net',
  'solarquarter.com'
];

function sourceKind(url) {
  const m = /^https:\/\/(?:www\.|m\.)?([^/?#]+)([^?#]*)/.exec(url || '');
  if (!m) return null;
  const host = m[1].toLowerCase(), path = m[2] || '';
  const matches = (list) => list.some((a) => (a.includes('/') ? (host + path).startsWith(a) : host === a || host.endsWith('.' + a)));
  return matches(OFFICIAL_SOURCES) ? 'official' : matches(NEWS_OUTLETS) ? 'outlet' : null;
}

// Returns a list of problems; empty when every entry follows the sourcing rules.
function checkNews(news) {
  const errors = [];
  const langs = ['en', 'hi'];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(news.last_checked || '')) errors.push('last_checked must be YYYY-MM-DD');
  for (const s of news.status || []) {
    const name = (s.label && s.label.en) || '?';
    if (!langs.every((l) => s.label && s.label[l] && s.value && s.value[l])) errors.push(`status ${name}: needs label and value in en and hi`);
    if (!sourceKind(s.source)) errors.push(`status ${name}: source not allowed: ${s.source}`);
  }
  for (const item of news.items || []) {
    const name = (item.title && item.title.en) || '?';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date || '')) errors.push(`${name}: date must be YYYY-MM-DD`);
    else if (item.date > news.last_checked) errors.push(`${name}: date after last_checked`);
    if (!langs.every((l) => item.title && item.title[l] && item.summary && item.summary[l])) errors.push(`${name}: needs title and summary in en and hi`);
    const sources = item.sources || [];
    const kinds = sources.map((s) => sourceKind(s.url));
    if (!sources.length || kinds.includes(null)) errors.push(`${name}: every source must be an official site or a listed outlet: ${sources.map((s) => s.url).join(', ')}`);
    const hosts = new Set(sources.map((s) => (s.url || '').replace(/^https:\/\/(www\.|m\.)?/, '').split('/')[0]));
    if (item.kind === 'official' && !kinds.includes('official')) errors.push(`${name}: kind 'official' needs an official source`);
    else if (item.kind === 'reported' && hosts.size < 2) errors.push(`${name}: kind 'reported' needs two different sources`);
    else if (item.kind !== 'official' && item.kind !== 'reported') errors.push(`${name}: kind must be 'official' or 'reported'`);
  }
  return errors;
}

function newsList(news, lang, limit) {
  const tr = t(lang);
  const badge = { official: tr('Official', 'आधिकारिक'), reported: tr('Reported', 'रिपोर्ट') };
  return `<ul class="news-list">${[...news.items].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit).map((item) => `<li class="news-item">
<p class="news-meta"><time datetime="${item.date}">${fmtDate(item.date, lang)}</time> <span class="news-badge ${item.kind}">${badge[item.kind]}</span></p>
<h3>${esc(item.title[lang])}</h3>
<p>${esc(item.summary[lang])}</p>
<p class="news-sources">${tr('Sources', 'स्रोत')}: ${item.sources.map((s) => `<a href="${esc(s.url)}" rel="nofollow noopener" target="_blank">${esc(s.name)}</a>`).join(' · ')}</p>
</li>`).join('\n')}</ul>`;
}

function monthYear(iso, lang) {
  const [y, m] = iso.split('-').map(Number);
  return `${MONTHS[lang][m - 1]} ${y}`;
}

// The news page.
function newsPage(lang, { cfg, PAGES, news }) {
  const tr = t(lang);
  const checked = fmtDate(news.last_checked, lang);
  const month = monthYear(news.last_checked, lang);
  return {
    file: PAGES.news,
    title: tr(`Solar Subsidy & Electricity News (${month}) – ${cfg.siteName}`, `सोलर सब्सिडी और बिजली की ख़बरें (${month}) – ${cfg.siteName}`),
    description: tr('Latest verified news on PM Surya Ghar solar subsidy, Gujarat electricity tariffs, GST and rooftop solar rules, with sources. Checked every two days.', 'पीएम सूर्य घर सोलर सब्सिडी, गुजरात बिजली टैरिफ़, GST और रूफ़टॉप सोलर नियमों की ताज़ा सत्यापित ख़बरें, स्रोतों के साथ। हर दो दिन में जाँची गईं।'),
    h1: tr('Solar subsidy and electricity news', 'सोलर सब्सिडी और बिजली की ख़बरें'),
    lede: tr(`Checked on ${checked}. Only news confirmed by an official source or by two established news outlets is listed, with links.`, `${checked} को जाँचा गया। यहाँ केवल वही ख़बरें हैं जिनकी पुष्टि किसी आधिकारिक स्रोत या दो स्थापित समाचार संस्थानों ने की है, लिंक के साथ।`),
    crumbs: [{ name: tr('News', 'ख़बरें'), file: PAGES.news }],
    body: `<section class="prose">
<h2>${tr('At a glance', 'एक नज़र में')}</h2>
<div class="table-wrap"><table class="news-status"><tbody>
${news.status.map((s) => `<tr><th scope="row">${esc(s.label[lang])}</th><td>${esc(s.value[lang])} <a class="news-src" href="${esc(s.source)}" rel="nofollow noopener" target="_blank">[${tr('source', 'स्रोत')}]</a></td></tr>`).join('\n')}
</tbody></table></div>
<p><a class="cta" href="${PAGES.home}">${tr('See solar price and savings for your home →', 'अपने घर के लिए सोलर कीमत और बचत देखें →')}</a></p>
<h2>${tr('Latest updates', 'ताज़ा अपडेट')}</h2>
${newsList(news, lang, 20)}
</section>`
  };
}

// The short box on the home page.
function homeNews(lang, { PAGES, news }) {
  const tr = t(lang);
  return `<section class="prose home-news">
<h2>${tr('Latest solar news', 'सोलर की ताज़ा ख़बरें')}</h2>
${newsList(news, lang, 3)}
<p><a href="${PAGES.news}">${tr('All news →', 'सभी ख़बरें →')}</a></p>
</section>`;
}

module.exports = { sourceKind, checkNews, newsPage, homeNews, OFFICIAL_SOURCES, NEWS_OUTLETS };
