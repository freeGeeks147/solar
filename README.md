# Bijli Bachaao (bijlibachaao.com): rooftop solar price, generation and savings

A static site with no backend, no database and no build dependencies. It contains:

- **Bill calculator**: one SEO page per DISCOM (UGVCL, MGVCL, DGVCL, PGVCL, Torrent Power Ahmedabad, Torrent Power Surat). It itemises slab-wise energy, fixed charge, FPPPA, electricity duty, the prepaid rebate and the smart-meter ToU discount, and can work back from a bill amount to units.
- **Rooftop solar ROI**: recalculates the DISCOM bill slab by slab before and after solar, month by month with net metering. Outputs include the PM Surya Ghar subsidy, payback, IRR, 25-year savings, CO₂ avoided and an optional loan EMI.
- **EV charging cost**: shows the extra bill from home charging at your marginal slab, the solar-hours ToU discount, charging from rooftop surplus and public chargers, plus a comparison with petrol, diesel or CNG.
- **Guides**: PM Surya Ghar subsidy, net metering, and the smart meter ToU discount.

All maths runs in the browser. The tariff tables, sample bills and FAQs are baked into static HTML so search engines can crawl them.

## Site focus (from keyword research, Oct 2026)

Ahrefs (India) showed `[size]kw solar panel price`, `... price in india`, `... with subsidy` and `[size]kw solar panel unit generation` at 1,000+ searches/month each, all "Easy", while Gujarat bill-calculator searches were under 100. So the site leads with:

- `index.html`: solar price hub for 1kW–10kW (price, subsidy, units/day, calculator)
- `{n}kw-solar-system-price-in-india.html` and `{n}kw-solar-panel-generation-per-day.html` for 1, 2, 3, 4, 5, 6, 8 and 10 kW, generated from `data/india.json`
- Gujarat bill, solar and EV calculators as a supporting section (`gujarat-electricity-bill-calculator.html` and the DISCOM pages)

**Update `systemSizes` prices in `data/india.json` every 3–6 months** from current installer price lists, and refresh `lastReviewed`.

## Layout

```
data/gujarat.json     Tariffs, DISCOMs, cities and solar yield   <- edit every April
data/common.json      Subsidy, solar/EV defaults, fuel prices
data/india.json       System-size prices, city-wise solar yield (all India)
site.config.json      Site name, domain, AdSense ID, Ahrefs analytics key
build.js              Builds every page in English (site/) and Hindi (site/hi/), sitemap, robots, ads.txt, assets/data.js
src/                  Page templates: layout.js (shell, disclaimer), forms.js, pages-solar.js, pages-gujarat.js, pages-static.js
site/assets/calc.js   Calculation engine (shared by browser, build and tests)
site/assets/app.js    Form wiring and result rendering
site/                 The deployable website (generated HTML is committed)
test/                 node --test unit tests for the engine
```

## Languages

Every page is generated twice: English at the site root and Hindi under `/hi/`, with `hreflang` links between them and a language switch in the header. Page text lives in `src/` as `tr('English', 'हिन्दी')` pairs, and calculator results in `site/assets/app.js` as `t('English', 'हिन्दी')` pairs. When you add or change text, update both.

A disclaimer strip ("for information only, based on public information, not official or endorsed") is on every page, under every calculator result, and in full at `disclaimer.html`.

## Run locally

```
node build.js          # regenerate pages after editing data or config
node --test      # engine tests
npm run serve          # http://localhost:8000
```

## Go live

1. Set `baseUrl` in `site.config.json` to your domain, then run `node build.js`.
2. Host the `site/` folder anywhere static. Two free options:
   - **GitHub Pages**: open repo Settings → Pages and set Source to **GitHub Actions**. `.github/workflows/pages.yml` runs the tests, builds and deploys on every push to `main`.
   - **Cloudflare Pages / Netlify**: set the build command to `node build.js` and the output directory to `site`.
3. Add the domain in Google Search Console and submit `sitemap.xml`.
4. Once AdSense approves the site, put your `ca-pub-…` ID in `adsenseClient` and rebuild. This adds the ad script, ad slots and `ads.txt`. Add `contactEmail` as well, because AdSense reviewers look for contact details.

## Yearly update (each April, after the GERC orders)

1. Download the new tariff schedules from gercin.org, one for the four state DISCOMs and one for each Torrent licence area.
2. In `data/gujarat.json`, update `tariffYear`, `effectiveFrom` and `lastReviewed`, and in each tariff group update `slabs`, `fixed` and `fppaPerUnit`. Update the `common` rebates and ToU values if they changed, and each DISCOM's `orderCase` and `sourceUrl`.
3. Remove the `"verify": true` flags once you have checked a figure against the official PDF. The flags show a "(verify)" tag on the pages.
4. Run `node --test`. The hand-computed bill tests will fail if the slabs changed, so update their expected numbers. Then run `node build.js`, commit and push.

Each quarter, update `fppaPerUnit` from a recent bill or the DISCOM's FPPPA notice, and refresh `lastReviewed`.

## Data status (reviewed 22 Oct 2026)

| Item | Status |
|---|---|
| State DISCOM urban RGP slabs and fixed charges (305/350/415/520 paise; ₹15/25/45/70) | Matches the GERC FY 2026-27 schedule |
| State rural RGP slabs (265/310/375/490 paise) | Secondary sources agree; rural fixed charges assumed the same as urban (**verify**) |
| BPL (first 30 units at ₹1.50, ₹5 fixed) | Older schedules (**verify**) |
| Torrent Ahmedabad slabs (320/395/500 paise) | Matches the GERC schedule from 1 Apr 2026. Fixed ₹25 single / ₹65 three phase (**verify**) |
| Torrent Surat slabs (320/365/425/505 paise) | Secondary sources only (**verify**) |
| FPPPA ₹2.30/unit | State figure cited in GERC FY27 orders; Torrent value is a placeholder (**verify**) |
| Electricity duty 15% urban / 7.5% rural on fixed + energy + FPPPA | Consensus of secondary sources (**verify** the base on a real bill) |
| Prepaid rebate 3%, ToU discount 60 paise in 11:00–17:00 | GERC FY 2026-27 press note |
| Net-metering surplus ₹2.25/unit | GERC regulation (2021 amendment) (**verify** it has not been revised) |
| PM Surya Ghar ₹30k/kW ×2, ₹18k for the 3rd kW, cap ₹78k | Current scheme |

## FPPPA and duty: estimates users can overwrite

FPPPA changes every quarter and the duty base is not confirmed, so the bill calculator shows both in a visible **From your bill (optional)** box. The fields are prefilled from `fppaPerUnit` and `electricityDutyPct`, and the result marks them `est.` until the user types the figures printed on their bill. Values the user enters carry over to the solar link. Updating the defaults each quarter keeps estimates close, but users with a bill in hand always get an exact match.

## Next steps

Watch Search Console for 2–3 months. If the DISCOM pages get impressions, add Maharashtra, UP, Rajasthan and Kerala: add a `data/<state>.json` and generalise `build.js` to loop over states.

## Monday Facebook posts

`.github/workflows/facebook-posts.yml` posts to the Facebook Pages every Monday: the 8thcpcpay.com post at about 9:00 am IST and the bijlibachaao.com post at about 6:00 pm IST. Each is a photo post: the card image from `social/images/` with the text and link as the caption. Posts live in `social/facebook-posts.json` (one entry per date and slot, with a `card` describing the image). After adding posts, run `NODE_PATH=$(npm root -g) node social/make-cards.js` (needs Playwright) and commit the new images. Facebook groups can't be posted to through the API, so schedule the group post by hand.

- Repo secret `FB_PAGES`: in Graph API Explorer, run `me/accounts?fields=id,name,access_token` with a long-lived user token and paste the whole response as the secret. Only the Pages you ticked when generating the token are included. A list of `{"id","token"}` also works. The token needs `pages_manage_posts` and `pages_read_engagement`.
- To test, go to Actions → Monday Facebook posts → Run workflow, with "dry run" ticked.
- When the calendar runs out, the workflow logs "No post" and does nothing. Add the next weeks to the JSON.
- GitHub pauses scheduled workflows after 60 days with no commits to the repo, so commit something (for example the next weeks of posts) at least every two months.
