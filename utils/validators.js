/**
 * Validate timestamp format (ISO 8601)
 * @param {string} timestamp - Timestamp string to validate
 * @returns {boolean} True if valid, false otherwise
 */
const isValidTimestamp = (timestamp) => {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
};

/**
 * Validate quantity is non-negative
 * @param {number} quantity - Quantity to validate
 * @returns {boolean} True if valid, false otherwise
 */
const isValidQuantity = (quantity) => {
  const num = parseFloat(quantity);
  return !isNaN(num) && num >= 0;
};

/**
 * Validate transaction type
 * @param {string} type - Transaction type to validate
 * @returns {boolean} True if valid, false otherwise
 */
const isValidType = (type) => {
  const validTypes = ['BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT'];
  return validTypes.includes(type);
};

/**
 * Check if transaction has all required fields
 * @param {object} transaction - Transaction object
 * @returns {array} Array of error messages
 */
const validateTransaction = (transaction) => {
  const errors = [];

  if (!transaction.transaction_id || transaction.transaction_id.trim() === '') {
    errors.push('Missing transaction_id');
  }

  if (!transaction.timestamp || transaction.timestamp.trim() === '') {
    errors.push('Missing timestamp');
  } else if (!isValidTimestamp(transaction.timestamp)) {
    errors.push('Invalid timestamp format');
  }

  if (!transaction.type || transaction.type.trim() === '') {
    errors.push('Missing type');
  } else if (!isValidType(transaction.type)) {
    errors.push(`Invalid type: ${transaction.type}`);
  }

  if (!transaction.asset || transaction.asset.trim() === '') {
    errors.push('Missing asset');
  }

  if (transaction.quantity === undefined || transaction.quantity === null || transaction.quantity === '') {
    errors.push('Missing quantity');
  } else if (!isValidQuantity(transaction.quantity)) {
    errors.push('Invalid quantity (must be non-negative)');
  }

  return errors;
};

module.exports = {
  isValidTimestamp,
  isValidQuantity,
  isValidType,
  validateTransaction
};
