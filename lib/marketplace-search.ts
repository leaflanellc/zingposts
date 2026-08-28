export type MarketplaceSearchInput = Record<string, unknown>;

const SEARCH_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'find',
  'for',
  'good',
  'in',
  'looking',
  'me',
  'near',
  'of',
  'old',
  'the',
  'under',
  'vintage',
  'with',
]);

const SEARCH_SYNONYMS: Record<string, string[]> = {
  boat: ['boat', 'boats', 'watercraft', 'sailboat', 'sailboats'],
  boats: ['boat', 'boats', 'watercraft', 'sailboat', 'sailboats'],
  watercraft: ['boat', 'boats', 'watercraft'],
  sailboat: ['sailboat', 'sailboats', 'boat'],
  sailboats: ['sailboat', 'sailboats', 'boat'],
  truck: ['truck', 'trucks', 'pickup', '4x4', '4×4'],
  trucks: ['truck', 'trucks', 'pickup', '4x4', '4×4'],
  pickup: ['truck', 'trucks', 'pickup'],
  '4x4': ['4x4', '4×4', 'four wheel drive'],
  car: ['car', 'cars', 'automobile'],
  cars: ['car', 'cars', 'automobile'],
  camper: ['camper', 'campers', 'rv', 'airstream'],
  campers: ['camper', 'campers', 'rv', 'airstream'],
};

export function marketplaceSearchTokens(query: string) {
  return [
    ...new Set(
      query
        .toLowerCase()
        .replace(/[^a-z0-9×]+/g, ' ')
        .split(/\s+/)
        .filter((token) => token && !SEARCH_STOP_WORDS.has(token)),
    ),
  ];
}

export function inferMarketplaceCategory(query: string) {
  const normalized = query.toLowerCase();
  if (/\b(boat|boats|watercraft|marine|sailboat|sailboats)\b/.test(normalized)) return 'Boats';
  if (/\b(car|cars|truck|trucks|pickup|4x4|4×4|jeep|automobile)\b/.test(normalized)) return 'Cars & trucks';
  if (/\b(camper|campers|rv|airstream)\b/.test(normalized)) return 'Campers';
  if (/\b(machine|machinery|lathe|tool)\b/.test(normalized)) return 'Machinery';
  if (/\b(motorcycle|motorcycles|bike|panhead)\b/.test(normalized)) return 'Motorcycles';
  return null;
}

function searchableListing(listing: Record<string, unknown>, sellerName = '') {
  return `${listing.title ?? ''} ${listing.category ?? ''} ${listing.description ?? ''} ${listing.location ?? ''} ${listing.condition ?? ''} ${listing.make ?? ''} ${listing.model ?? ''} ${sellerName} ${JSON.stringify(listing.attributes ?? {})}`.toLowerCase();
}

function listingMatchesVehicleKind(listing: Record<string, unknown>, token: string): boolean | null {
  const text = searchableListing(listing);
  if (['truck', 'trucks', 'pickup'].includes(token)) {
    return listing.category === 'Cars & trucks' && /\b(truck|pickup|4x4|4×4|cab|bed|f-?\d{2,3}|fj\d+|cj-?\d+|series ii)\b/i.test(text);
  }
  if (['car', 'cars', 'automobile'].includes(token)) {
    return listing.category === 'Cars & trucks' && !listingMatchesVehicleKind(listing, 'truck');
  }
  return null;
}

export function normalizeMarketplaceSearchInput(input: MarketplaceSearchInput): MarketplaceSearchInput {
  const query = String(input.query ?? '');
  const category = input.category ?? inferMarketplaceCategory(query);
  return { ...input, ...(category ? { category } : {}) };
}

export function matchesMarketplaceSearch(
  listing: Record<string, unknown>,
  input: MarketplaceSearchInput,
  sellerName = '',
) {
  const minPrice = Number(input.minPrice ?? 0);
  const maxPrice = Number(input.maxPrice ?? Infinity);
  const afterYear = Number(input.afterYear ?? 0);
  const beforeYear = Number(input.beforeYear ?? Infinity);
  const category = String(input.category ?? '');
  const condition = String(input.condition ?? '');
  const location = String(input.location ?? '').toLowerCase();

  if (Number(listing.price) < minPrice || Number(listing.price) > maxPrice) return false;
  if (Number(listing.year ?? 0) < afterYear || Number(listing.year ?? 0) > beforeYear) return false;
  if (category && category !== 'All' && listing.category !== category) return false;
  if (condition && String(listing.condition).toLowerCase() !== condition.toLowerCase()) return false;
  if (location && !String(listing.location).toLowerCase().includes(location)) return false;

  const haystack = searchableListing(listing, sellerName);
  return marketplaceSearchTokens(String(input.query ?? '')).every((token) => {
    const vehicleKind = listingMatchesVehicleKind(listing, token);
    if (vehicleKind !== null) return vehicleKind;
    return (SEARCH_SYNONYMS[token] ?? [token]).some((term) => haystack.includes(term));
  });
}
