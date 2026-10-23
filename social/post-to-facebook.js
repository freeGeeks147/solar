#!/usr/bin/env node
/*
 * Posts today's Facebook update (from social/facebook-posts.json) to each Page, then adds
 * the link as the first comment. Run by .github/workflows/facebook-posts.yml every Monday.
 *
 *   FB_PAGES='[{"id":"123","token":"EAA..."}]' node social/post-to-facebook.js salary
 *   node social/post-to-facebook.js solar --dry-run --date 2026-10-26
 *
 * FB_PAGES is the Graph API Explorer response to me/accounts?fields=id,name,access_token,
 * pasted as is ({"data":[{"id","name","access_token"},...]}), or a list of {id, token}.
 * Page tokens taken from a long-lived user token don't expire (needs pages_manage_posts).
 * Facebook groups cannot be posted to through the API, so the group is scheduled by hand.
 * No dependencies; needs Node 18+ for fetch.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const API = 'https://graph.facebook.com/v24.0';
const args = process.argv.slice(2);
const slot = args[0];
const dryRun = args.includes('--dry-run');
const dateArg = args.includes('--date') ? args[args.indexOf('--date') + 1] : '';
// The workflow runs on UTC time, so work out today's date in India
const today = dateArg || new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

if (!['salary', 'solar'].includes(slot)) {
  console.error('Usage: node social/post-to-facebook.js <salary|solar> [--dry-run] [--date YYYY-MM-DD]');
  process.exit(2);
}

const posts = JSON.parse(fs.readFileSync(path.join(__dirname, 'facebook-posts.json'), 'utf8'));
const post = posts.find((p) => p.date === today && p.slot === slot);
if (!post) {
  console.log(`No ${slot} post for ${today}. Add more weeks to social/facebook-posts.json.`);
  process.exit(0);
}

async function graph(endpoint, params) {
  const res = await fetch(`${API}/${endpoint}`, { method: 'POST', body: new URLSearchParams(params) });
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(body.error ? body.error.message : `HTTP ${res.status}`);
  return body;
}

function readPages(secret) {
  let json;
  try {
    json = JSON.parse(secret || '[]');
  } catch (err) {
    throw new Error('FB_PAGES is not valid JSON. Paste the whole Graph API Explorer response, from { to }.');
  }
  const list = Array.isArray(json) ? json : json.data || [];
  return list.map((p) => ({ id: p.id, name: p.name ? `${p.name} (${p.id})` : `page ${p.id}`, token: String(p.access_token || p.token || '').trim() }));
}

async function main() {
  console.log(`${today} ${slot}:\n${post.text}\nLink: ${post.link}\n`);
  if (dryRun) return;
  const pages = readPages(process.env.FB_PAGES);
  if (!pages.length) throw new Error('FB_PAGES secret is empty');
  let failed = 0;
  for (const page of pages) {
    let id;
    try {
      ({ id } = await graph(`${page.id}/feed`, { message: post.text, access_token: page.token }));
      console.log(`Posted to ${page.name}: ${id}`);
    } catch (err) {
      failed++;
      console.error(`${page.name}: post failed: ${err.message}`);
      continue;
    }
    try {
      await graph(`${id}/comments`, { message: post.link, access_token: page.token });
    } catch (err) {
      failed++;
      console.error(`${page.name}: link comment failed: ${err.message}`);
    }
  }
  if (failed) process.exit(1);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
