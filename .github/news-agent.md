# Solar and electricity news agent

A scheduled Claude session runs this every second day. It checks for new, verified
news that matters to Indian homes thinking about rooftop solar or their electricity
bill, adds it to `data/news.json`, rebuilds and publishes bijlibachaao.com.
Accuracy matters more than speed: if you are not sure a news item is true, leave it out.

## What counts as news

Add an item only for something that **happened**, mainly:
- **PM Surya Ghar: Muft Bijli Yojana**: subsidy amounts or rules, portal changes, deadlines, official progress figures (homes / GW installed)
- **State solar subsidies**, Gujarat first (top-ups, new schemes, DISCOM programmes)
- **Gujarat electricity**: GERC tariff orders, FPPPA / fuel surcharge changes, net-metering or smart-meter / time-of-day rules for homes
- **Rules that change what homes pay**: GST on solar, ALMM / DCR panel rules for subsidised rooftop systems, net-metering regulations
- national rooftop-solar or electricity decisions for households (MNRE, Ministry of Power, CEA, CERC)

Do **not** add:
- predictions, estimates or "may / likely / could" stories
- company news, share prices, tenders, utility-scale solar parks, product launches or advertising
- anything found only on blogs, installer or calculator sites, YouTube, Telegram, WhatsApp forwards, or social media other than official government accounts
- anything already in `news.json` (check by date and subject)

## Sourcing rules (`src/news.js` enforces these; the tests and the build fail otherwise)

Every source must be on `OFFICIAL_SOURCES` (government, regulator or DISCOM sites) or
`NEWS_OUTLETS` (established news outlets and specialist energy publications).
- `"kind": "official"`: at least one official source.
- `"kind": "reported"`: at least two different outlets that independently report the same facts.

Before adding an item, open each source (WebFetch) and check that it says what you
are about to write: same dates, same numbers. If a page cannot be opened, use the
item only if the search results for both sources clearly state the same facts. If
sources disagree on a number, leave that number out or leave the item out. Never add
a site to the lists just to get an item through.

## Writing

- Your own words. No sentences copied from the sources.
- Title up to about 70 characters. Summary 1–3 short sentences: what happened, from when, what it means for a household. Plain language, no hype.
- Say "proposal", "draft" or "estimate" whenever that is what it is.
- `date` is the date of the event (order, notification, announcement), not the article date.
- Write the Hindi version too (`hi`), in simple Hindi, with the same facts and numbers.
- Never invent numbers or change them from what the sources say.

## Each run

1. Get the repository: call `add_repo` for owner `freeGeeks147`, repo `solar`, with `access: "push"`, and clone it.
2. Read `data/news.json`. Note `last_checked` and the existing items.
3. Search the web (WebSearch, `extended` mode), several queries in one turn, for example:
   - `PM Surya Ghar Muft Bijli Yojana latest news`
   - `rooftop solar subsidy Gujarat news`
   - `GERC order` / `UGVCL DGVCL MGVCL PGVCL FPPPA` with the current month and year
   - `MNRE rooftop solar notification` / `ALMM DCR rooftop`
   - `सोलर सब्सिडी ख़बर` / `पीएम सूर्य घर योजना ताज़ा ख़बर`
   Also try WebFetch on https://pmsuryaghar.gov.in/ and https://mnre.gov.in/ for official notices.
4. For each candidate event since the newest item, apply the rules above. Most runs find nothing new; that is fine.
5. Edit `data/news.json`:
   - add qualifying items (`date`, `kind`, `title`, `summary`, `sources`, each with `en` and `hi`)
   - update a `status` row if one of those facts changed (give the new source)
   - always set `last_checked` to today's date in India (YYYY-MM-DD)
6. **Calculators and price data are not yours to change.** If an official change affects the calculators (subsidy amounts, a new GERC tariff or FPPPA, GST on solar, the electricity duty), add the news and status row only. Then tell the owner: open a GitHub issue in `freeGeeks147/solar` titled "Update calculators: <what changed>", with the facts and source links. If you cannot open issues, put the same text at the top of your final summary.
7. Run `node --test` and `node build.js`. Both must pass. If the sourcing check fails, fix the item or remove it; never weaken the check.
8. Check `git status`: only `data/news.json` and generated files under `site/` should change.
9. Commit with the message `News update YYYY-MM-DD` (list the items added and their source links, or "no new verified news"). If GitHub pull request tools are available: push to a new branch `news/YYYY-MM-DD`, open a pull request to `main` and merge it. If they are not available: `git pull --rebase origin main`, then `git push origin HEAD:main`. Retry a failed push up to 4 times (2s, 4s, 8s, 16s apart). The site deploys from `main` either way.
10. Finish with a short summary: items added (with sources), or "No new verified news; last_checked updated".

## Never

- Change anything outside `freeGeeks147/solar`, or post to social media.
- Remove or rewrite an existing item, unless it was wrong. Then correct it and cite the source that shows it.
- Change calculators, prices, tariffs or subsidy figures in `data/` other than `news.json`.
