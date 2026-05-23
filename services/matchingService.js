const Transaction = require('../models/Transaction');

/**
 * Check if two timestamps are within tolerance
 * @param {Date} timestamp1 - First timestamp
 * @param {Date} timestamp2 - Second timestamp
 * @param {number} toleranceSeconds - Tolerance in seconds
 * @returns {boolean} True if within tolerance
 */
const isTimestampWithinTolerance = (timestamp1, timestamp2, toleranceSeconds) => {
  if (!timestamp1 || !timestamp2) return false;
  const diff = Math.abs(new Date(timestamp1) - new Date(timestamp2));
  return diff <= (toleranceSeconds * 1000);
};

/**
 * Check if two quantities are within tolerance percentage
 * @param {number} quantity1 - First quantity
 * @param {number} quantity2 - Second quantity
 * @param {number} tolerancePct - Tolerance percentage
 * @returns {boolean} True if within tolerance
 */
const isQuantityWithinTolerance = (quantity1, quantity2, tolerancePct) => {
  const q1 = parseFloat(quantity1);
  const q2 = parseFloat(quantity2);
  if (q1 === 0 && q2 === 0) return true;
  if (q1 === 0 || q2 === 0) return false;
  
  const diff = Math.abs(q1 - q2);
  const avg = (q1 + q2) / 2;
  const diffPct = (diff / avg) * 100;
  
  return diffPct <= tolerancePct;
};

/**
 * Check if two transaction types match (including TRANSFER_IN/TRANSFER_OUT mapping)
 * @param {string} type1 - First transaction type
 * @param {string} type2 - Second transaction type
 * @returns {boolean} True if types match
 */
const isTypeMatch = (type1, type2) => {
  // Direct match
  if (type1 === type2) return true;
  
  // TRANSFER_IN on exchange matches TRANSFER_OUT on user
  if (type1 === 'TRANSFER_IN' && type2 === 'TRANSFER_OUT') return true;
  if (type1 === 'TRANSFER_OUT' && type2 === 'TRANSFER_IN') return true;
  
  return false;
};

/**
 * Check if two assets match (case-insensitive)
 * @param {string} asset1 - First asset
 * @param {string} asset2 - Second asset
 * @returns {boolean} True if assets match
 */
const isAssetMatch = (asset1, asset2) => {
  if (!asset1 || !asset2) return false;
  return asset1.toUpperCase() === asset2.toUpperCase();
};

/**
 * Calculate match score between two transactions
 * Higher score means better match
 * @param {object} userTx - User transaction
 * @param {object} exchangeTx - Exchange transaction
 * @param {object} config - Configuration object
 * @returns {object} Match result with score and details
 */
const calculateMatchScore = (userTx, exchangeTx, config) => {
  let score = 0;
  const details = {};
  
  // Type match (must match)
  if (isTypeMatch(userTx.type, exchangeTx.type)) {
    score += 100;
    details.typeMatch = true;
  } else {
    details.typeMatch = false;
    return { score: 0, match: false, details };
  }
  
  // Asset match (must match)
  if (isAssetMatch(userTx.asset, exchangeTx.asset)) {
    score += 100;
    details.assetMatch = true;
  } else {
    details.assetMatch = false;
    return { score: 0, match: false, details };
  }
  
  // Timestamp proximity (within tolerance)
  if (isTimestampWithinTolerance(userTx.timestamp, exchangeTx.timestamp, config.timestampToleranceSeconds)) {
    const timeDiff = Math.abs(new Date(userTx.timestamp) - new Date(exchangeTx.timestamp));
    score += Math.max(0, 50 - (timeDiff / 1000)); // Higher score for closer timestamps
    details.timestampMatch = true;
    details.timestampDiffSeconds = timeDiff / 1000;
  } else {
    details.timestampMatch = false;
    if (userTx.timestamp && exchangeTx.timestamp) {
      const timeDiff = Math.abs(new Date(userTx.timestamp) - new Date(exchangeTx.timestamp));
      details.timestampDiffSeconds = timeDiff / 1000;
    }
  }
  
  // Quantity proximity (within tolerance)
  if (isQuantityWithinTolerance(userTx.quantity, exchangeTx.quantity, config.quantityTolerancePct)) {
    score += 50;
    details.quantityMatch = true;
    details.quantityDiffPct = Math.abs((userTx.quantity - exchangeTx.quantity) / ((userTx.quantity + exchangeTx.quantity) / 2)) * 100;
  } else {
    details.quantityMatch = false;
    details.quantityDiffPct = Math.abs((userTx.quantity - exchangeTx.quantity) / ((userTx.quantity + exchangeTx.quantity) / 2)) * 100;
  }
  
  // Determine if it's a valid match
  const match = details.typeMatch && details.assetMatch && 
                details.timestampMatch && details.quantityMatch;
  
  return { score, match, details };
};

/**
 * Match transactions between user and exchange sources
 * @param {object} config - Configuration object with tolerances
 * @returns {Promise<object>} Matching results
 */
const matchTransactions = async (config) => {
  try {
    // Fetch all transactions from both sources
    const userTransactions = await Transaction.find({ source: 'user' }).lean();
    const exchangeTransactions = await Transaction.find({ source: 'exchange' }).lean();
    
    console.log(`Matching ${userTransactions.length} user transactions with ${exchangeTransactions.length} exchange transactions`);
    
    const matched = [];
    const conflicting = [];
    const unmatchedUser = [];
    const unmatchedExchange = [];
    
    const usedExchangeIds = new Set();
    
    // Match each user transaction
    for (const userTx of userTransactions) {
      let bestMatch = null;
      let bestScore = 0;
      
      // Find best matching exchange transaction
      for (const exchangeTx of exchangeTransactions) {
        if (usedExchangeIds.has(exchangeTx._id.toString())) continue;
        
        const result = calculateMatchScore(userTx, exchangeTx, config);
        
        if (result.match && result.score > bestScore) {
          bestMatch = { exchangeTx, result };
          bestScore = result.score;
        }
      }
      
      if (bestMatch) {
        usedExchangeIds.add(bestMatch.exchangeTx._id.toString());
        
        // Check if it's a conflict (matched but with significant differences)
        const isConflict = !bestMatch.result.details.timestampMatch || 
                         !bestMatch.result.details.quantityMatch;
        
        if (isConflict) {
          conflicting.push({
            userTx,
            exchangeTx: bestMatch.exchangeTx,
            reason: 'Matched but key fields differ beyond tolerance',
            details: bestMatch.result.details
          });
        } else {
          matched.push({
            userTx,
            exchangeTx: bestMatch.exchangeTx,
            reason: 'Successfully matched',
            details: bestMatch.result.details
          });
        }
      } else {
        unmatchedUser.push({
          userTx,
          reason: 'No matching exchange transaction found'
        });
      }
    }
    
    // Find unmatched exchange transactions
    for (const exchangeTx of exchangeTransactions) {
      if (!usedExchangeIds.has(exchangeTx._id.toString())) {
        unmatchedExchange.push({
          exchangeTx,
          reason: 'No matching user transaction found'
        });
      }
    }
    
    console.log(`Matching complete:`);
    console.log(`- Matched: ${matched.length}`);
    console.log(`- Conflicting: ${conflicting.length}`);
    console.log(`- Unmatched (User): ${unmatchedUser.length}`);
    console.log(`- Unmatched (Exchange): ${unmatchedExchange.length}`);
    
    return {
      matched,
      conflicting,
      unmatchedUser,
      unmatchedExchange,
      stats: {
        matched: matched.length,
        conflicting: conflicting.length,
        unmatchedUser: unmatchedUser.length,
        unmatchedExchange: unmatchedExchange.length
      }
    };
  } catch (error) {
    console.error('Error matching transactions:', error);
    throw error;
  }
};

module.exports = {
  matchTransactions,
  isTimestampWithinTolerance,
  isQuantityWithinTolerance,
  isTypeMatch,
  isAssetMatch
};
