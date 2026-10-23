#!/usr/bin/env node
/*
 * Posts today's Facebook update (from social/facebook-posts.json) to each Page, then adds
 * the link as the first comment. Run by .github/workflows/facebook-posts.yml every Monday.
 *
 *   FB_PAGES='[{"id":"123","token":"EAA..."}]' node social/post-to-facebook.js salary
 *   node social/post-to-facebook.js solar --dry-run --date 2026-10-26
 *
 * FB_PAGES holds one long-lived Page access token per Page (needs pages_manage_posts).
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

async function main() {
  console.log(`${today} ${slot}:\n${post.text}\nLink: ${post.link}\n`);
  if (dryRun) return;
  const pages = JSON.parse(process.env.FB_PAGES || '[]');
  if (!pages.length) throw new Error('FB_PAGES secret is empty');
  let failed = 0;
  for (const page of pages) {
    try {
      const { id } = await graph(`${page.id}/feed`, { message: post.text, access_token: page.token });
      await graph(`${id}/comments`, { message: post.link, access_token: page.token });
      console.log(`Posted to page ${page.id}: ${id}`);
    } catch (err) {
      failed++;
      console.error(`Page ${page.id} failed: ${err.message}`);
    }
  }
  if (failed) process.exit(1);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
