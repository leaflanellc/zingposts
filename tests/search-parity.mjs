import assert from 'node:assert/strict';
import {
  marketplaceSearchTokens,
  matchesMarketplaceSearch,
  normalizeMarketplaceSearchInput,
} from '../lib/marketplace-search.ts';

const ford = {
  title: '1972 Ford F-100 Ranger XLT',
  category: 'Cars & trucks',
  description: 'Long-bed pickup with a rebuilt V8.',
  location: 'Staunton, VA',
  condition: 'Good',
  make: 'Ford',
  model: 'F-100',
  price: 24_200,
  year: 1972,
  attributes: {},
};

const bmw = {
  title: '1974 BMW 2002 tii',
  category: 'Cars & trucks',
  description: 'Restored two-door sport sedan.',
  location: 'Richmond, VA',
  condition: 'Very good',
  make: 'BMW',
  model: '2002 tii',
  price: 28_900,
  year: 1974,
  attributes: {},
};

const oldTruckSearch = normalizeMarketplaceSearchInput({ query: 'old trucks' });

assert.deepEqual(marketplaceSearchTokens('old trucks'), ['trucks']);
assert.equal(oldTruckSearch.category, 'Cars & trucks');
assert.equal(matchesMarketplaceSearch(ford, oldTruckSearch), true);
assert.equal(matchesMarketplaceSearch(bmw, oldTruckSearch), false);

console.log(JSON.stringify({ ok: true, humanAndAgentSearchShareOneMatcher: true }));
