'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { checkNews, sourceKind } = require('../src/news');

const item = (over) => ({
  date: '2026-10-20', kind: 'reported',
  title: { en: 'T', hi: 'शी' }, summary: { en: 'S', hi: 'सा' },
  sources: [{ name: 'A', url: 'https://www.mercomindia.com/a' }, { name: 'B', url: 'https://economictimes.indiatimes.com/b' }],
  ...over
});
const news = (items) => ({ last_checked: '2026-10-24', status: [], items });

test('the published news file passes the sourcing check', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/news.json'), 'utf8'));
  assert.deepStrictEqual(checkNews(data), []);
});

test('sources are classified by site', () => {
  assert.strictEqual(sourceKind('https://pib.gov.in/PressReleasePage.aspx?PRID=1'), 'official');
  assert.strictEqual(sourceKind('https://energy.economictimes.indiatimes.com/x'), 'outlet');
  assert.strictEqual(sourceKind('https://x.com/PIB_India/status/1'), 'official');
  assert.strictEqual(sourceKind('https://x.com/someone/status/1'), null);
  assert.strictEqual(sourceKind('https://solarblog.example.com/post'), null);
  assert.strictEqual(sourceKind('http://pib.gov.in/x'), null);
});

test('bad entries are rejected', () => {
  assert.strictEqual(checkNews(news([item()])).length, 0);
  assert.match(checkNews(news([item({ sources: [{ name: 'A', url: 'https://www.mercomindia.com/a' }] })]))[0], /two different sources/);
  assert.match(checkNews(news([item({ sources: [{ name: 'A', url: 'https://www.mercomindia.com/a' }, { name: 'A2', url: 'https://www.mercomindia.com/b' }] })]))[0], /two different sources/);
  assert.match(checkNews(news([item({ kind: 'official' })]))[0], /needs an official source/);
  assert.match(checkNews(news([item({ sources: [{ name: 'Blog', url: 'https://cheapsolar.in/x' }, { name: 'B', url: 'https://www.livemint.com/b' }] })]))[0], /listed outlet/);
  assert.match(checkNews(news([item({ date: '2026-12-01' })]))[0], /after last_checked/);
  assert.match(checkNews(news([item({ title: { en: 'T' } })]))[0], /en and hi/);
});
