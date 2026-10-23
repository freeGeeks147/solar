#!/usr/bin/env node
/*
 * Renders the 1080x1080 image for each post in social/facebook-posts.json (its "card")
 * into social/images/. Run after adding posts, then commit the images:
 *
 *   node social/make-cards.js            # only missing images
 *   node social/make-cards.js --all      # redraw every image
 *
 * Needs Playwright with Chromium (npm i -g playwright) and internet for Google Fonts.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const posts = JSON.parse(fs.readFileSync(path.join(__dirname, 'facebook-posts.json'), 'utf8'));
const all = process.argv.includes('--all');

const THEMES = {
  salary: { site: 'govtsalarycalc.com', sub: 'Free salary calculator · Hindi & English', bg: 'linear-gradient(150deg,#0b2545 0%,#13315c 60%,#1d4e89 100%)', accent: '#f6c445', ink: '#0b2545', mark: '₹' },
  solar: { site: 'bijlibachaao.com', sub: 'Free solar & bill calculator · Hindi & English', bg: 'linear-gradient(150deg,#08384f 0%,#0b4a6f 55%,#0f6e8c 100%)', accent: '#ffb627', ink: '#08384f', mark: '☀' }
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function html(post) {
  const th = THEMES[post.slot];
  const c = post.card;
  const rows = c.rows.map(([a, b]) => `<div class="row"><span class="a">${esc(a)}</span>${c.arrow ? '<span class="arrow">→</span>' : ''}<span class="b">${esc(b)}</span></div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Mukta:wght@500;600;700&display=swap">
<style>
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1080px;background:${th.bg};color:#fff;font-family:Mukta,sans-serif;position:relative;overflow:hidden}
.mark{position:absolute;right:-60px;top:-110px;font:800 520px/1 'Baloo 2',sans-serif;color:rgba(255,255,255,.06)}
.wrap{position:absolute;inset:72px 72px 64px;display:flex;flex-direction:column}
.kicker{align-self:flex-start;background:${th.accent};color:${th.ink};font:700 34px/1 Mukta,sans-serif;padding:16px 28px 14px;border-radius:999px}
h1{font:800 76px/1.08 'Baloo 2',sans-serif;margin:36px 0 40px;max-width:900px}
.rows{display:flex;flex-direction:column;gap:18px}
.row{display:flex;align-items:center;gap:24px;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.14);border-radius:24px;padding:22px 32px}
.a{font:600 38px/1.2 Mukta,sans-serif;color:rgba(255,255,255,.85);flex:1}
.arrow{font:700 44px/1 Mukta,sans-serif;color:${th.accent}}
.b{font:800 50px/1.1 'Baloo 2',sans-serif;color:${th.accent};text-align:right}
.note{margin-top:22px;font:500 30px/1.3 Mukta,sans-serif;color:rgba(255,255,255,.75)}
.foot{margin-top:auto;display:flex;align-items:flex-end;justify-content:space-between;border-top:2px solid rgba(255,255,255,.18);padding-top:26px}
.site{font:800 52px/1 'Baloo 2',sans-serif}
.sub{font:500 28px/1.2 Mukta,sans-serif;color:rgba(255,255,255,.75);margin-top:8px}
.cta{background:#fff;color:${th.ink};font:700 32px/1 Mukta,sans-serif;padding:18px 28px 16px;border-radius:16px}
</style></head><body>
<div class="mark">${th.mark}</div>
<div class="wrap">
<div class="kicker">${esc(c.kicker)}</div>
<h1>${esc(c.title)}</h1>
<div class="rows">${rows}</div>
${c.note ? `<p class="note">${esc(c.note)}</p>` : ''}
<div class="foot"><div><div class="site">${th.site}</div><div class="sub">${th.sub}</div></div><div class="cta">${/[ऀ-ॿ]/.test(c.title) ? 'अभी देखें →' : 'Check now →'}</div></div>
</div></body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
  fs.mkdirSync(path.join(__dirname, 'images'), { recursive: true });
  for (const post of posts) {
    const out = path.join(__dirname, post.image);
    if (!post.card || (!all && fs.existsSync(out))) continue;
    await page.setContent(html(post), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: out, type: 'jpeg', quality: 90 });
    console.log('Wrote', post.image);
  }
  await browser.close();
})();
