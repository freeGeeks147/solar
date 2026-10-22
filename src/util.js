'use strict';
// Formatting and small helpers shared by every page, in English ('en') and Hindi ('hi').

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = (d = 0) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
const inr = (x) => '₹' + nf(0).format(Math.round(x));
const inr2 = (x) => '₹' + nf(2).format(x);
const num = (x, d = 0) => nf(d).format(x);

// Picks the string for the language: t('hi')('Hello', 'नमस्ते') -> 'नमस्ते'
const t = (lang) => (en, hi) => (lang === 'hi' ? hi : en);

function lakh(x, lang) {
  if (x < 100000) return inr(x);
  return `₹${(x / 100000).toFixed(2).replace(/\.?0+$/, '')} ${lang === 'hi' ? 'लाख' : 'lakh'}`;
}

function range(a, b, lang) {
  return `${lakh(a, lang)} ${lang === 'hi' ? 'से' : 'to'} ${lakh(b, lang)}`;
}

// 3.67 -> "3 years 8 months" / "3 साल 8 महीने"
function yearsText(y, lang) {
  if (y === null || y === undefined) return lang === 'hi' ? '25 साल से ज़्यादा' : 'more than 25 years';
  let whole = Math.floor(y), months = Math.round((y - whole) * 12);
  if (months === 12) { whole += 1; months = 0; }
  const yr = lang === 'hi' ? 'साल' : whole === 1 ? 'year' : 'years';
  const mo = lang === 'hi' ? 'महीने' : months === 1 ? 'month' : 'months';
  return months ? `${whole} ${yr} ${months} ${mo}` : `${whole} ${yr}`;
}

const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर']
};

function fmtDate(iso, lang) {
  const d = new Date(iso + 'T00:00:00Z');
  return `${d.getUTCDate()} ${MONTHS[lang][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Simple stroke icons (24x24), coloured by CSS currentColor.
const ICON_PATHS = {
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  rupee: '<path d="M7 4h10M7 8.5h10M7 4c4.5 0 6 2 6 4.5S11.5 13 7 13l7.5 7"/>',
  gift: '<rect x="3.5" y="9" width="17" height="11.5" rx="1.5"/><path d="M2.5 9h19M12 9v11.5M12 9C10 5 6.5 5 6.5 7S10 9 12 9zm0 0c2-4 5.5-4 5.5-2S14 9 12 9z"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16.5 15h.01"/><path d="M6 6l9-3 1.5 3"/>',
  bolt: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6l1-8z"/>',
  home: '<path d="M3.5 11L12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  roof: '<path d="M2.5 13L12 5l9.5 8"/><path d="M6.5 10.5l2-1.6 2 1.6-2 1.6zM12.5 10.5l2-1.6 2 1.6-2 1.6z"/><path d="M5 12v8h14v-8"/>',
  panel: '<path d="M4 6h16l-2 10H6z"/><path d="M5 11h14M12 6v10M9 16l-1 4h8l-1-4"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  car: '<path d="M4 16.5V12l2-5h12l2 5v4.5"/><path d="M3 12h18v4.5H3z"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>',
  check: '<path d="M4.5 12.5l5 5L19.5 7"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>'
};
const icon = (name, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]}</svg>`;

module.exports = { esc, inr, inr2, num, t, lakh, range, yearsText, MONTHS, fmtDate, icon };
