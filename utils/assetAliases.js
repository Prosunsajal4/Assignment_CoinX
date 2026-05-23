// Asset alias mappings - normalize different names for the same asset
const assetAliases = {
  'bitcoin': 'BTC',
  'Bitcoin': 'BTC',
  'btc': 'BTC',
  'ethereum': 'ETH',
  'Ethereum': 'ETH',
  'eth': 'ETH',
  'solana': 'SOL',
  'Solana': 'SOL',
  'sol': 'SOL',
  'matic': 'MATIC',
  'Polygon': 'MATIC',
  'link': 'LINK',
  'Chainlink': 'LINK',
  'usdt': 'USDT',
  'tether': 'USDT'
};

/**
 * Normalize asset name to standard format
 * @param {string} asset - Asset name to normalize
 * @returns {string} Normalized asset name
 */
const normalizeAsset = (asset) => {
  if (!asset) return asset;
  const normalized = asset.trim();
  return assetAliases[normalized] || normalized.toUpperCase();
};

module.exports = {
  assetAliases,
  normalizeAsset
};
