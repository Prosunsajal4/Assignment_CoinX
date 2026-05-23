const fs = require("fs");
const csv = require("csv-parser");
const Transaction = require("../models/Transaction");
const { normalizeAsset } = require("../utils/assetAliases");
const { validateTransaction, isValidType } = require("../utils/validators");

/**
 * Parse CSV file and return array of row objects
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} Array of parsed rows
 */
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        // Skip empty rows
        if (
          Object.keys(data).length > 0 &&
          Object.values(data).some((v) => v && v.trim() !== "")
        ) {
          results.push(data);
        }
      })
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
};

/**
 * Process and validate a single transaction row
 * @param {object} row - Raw CSV row
 * @param {string} source - 'user' or 'exchange'
 * @returns {object} Processed transaction object
 */
const processTransactionRow = (row, source) => {
  const errors = validateTransaction(row);

  // Parse numeric fields
  const quantity = parseFloat(row.quantity) || 0;
  const priceUsd = row.price_usd ? parseFloat(row.price_usd) : null;
  const fee = row.fee ? parseFloat(row.fee) : null;

  // Parse timestamp if valid
  let timestamp = null;
  if (
    row.timestamp &&
    !errors.includes("Invalid timestamp format") &&
    !errors.includes("Missing timestamp")
  ) {
    timestamp = new Date(row.timestamp);
  }

  // Normalize asset name
  const asset = normalizeAsset(row.asset);

  return {
    source,
    transaction_id: row.transaction_id?.trim() || "",
    timestamp,
    type:
      row.type?.trim().toUpperCase() &&
      isValidType(row.type?.trim().toUpperCase())
        ? row.type?.trim().toUpperCase()
        : null,
    asset,
    quantity,
    price_usd: priceUsd,
    fee,
    note: row.note?.trim() || "",
    dataQualityIssues: errors,
    rawRow: row,
  };
};

/**
 * Ingest transactions from CSV file into database
 * @param {string} filePath - Path to CSV file
 * @param {string} source - 'user' or 'exchange'
 * @returns {Promise<object>} Ingestion statistics
 */
const ingestTransactions = async (filePath, source) => {
  try {
    // Parse CSV
    const rows = await parseCSV(filePath);

    // Process each row
    const transactions = rows.map((row) => processTransactionRow(row, source));

    // Check for duplicate transaction_ids within the same source
    const transactionIds = transactions.map((t) => t.transaction_id);
    const duplicateIds = transactionIds.filter(
      (id, index) => transactionIds.indexOf(id) !== index,
    );

    // Flag duplicates
    transactions.forEach((t) => {
      if (duplicateIds.includes(t.transaction_id)) {
        if (
          !t.dataQualityIssues.includes(
            "Duplicate transaction_id within source",
          )
        ) {
          t.dataQualityIssues.push("Duplicate transaction_id within source");
        }
      }
    });

    // Clear existing transactions for this source
    await Transaction.deleteMany({ source });

    // Insert new transactions
    const inserted = await Transaction.insertMany(transactions);

    // Calculate statistics
    const totalRows = rows.length;
    const rowsWithIssues = transactions.filter(
      (t) => t.dataQualityIssues.length > 0,
    ).length;
    const cleanRows = totalRows - rowsWithIssues;

    console.log(`Ingested ${totalRows} transactions from ${source} source`);
    console.log(`- Clean rows: ${cleanRows}`);
    console.log(`- Rows with issues: ${rowsWithIssues}`);

    return {
      source,
      totalRows,
      cleanRows,
      rowsWithIssues,
      insertedCount: inserted.length,
    };
  } catch (error) {
    console.error(`Error ingesting transactions from ${filePath}:`, error);
    throw error;
  }
};

/**
 * Ingest both user and exchange transaction files
 * @param {string} userFilePath - Path to user transactions CSV
 * @param {string} exchangeFilePath - Path to exchange transactions CSV
 * @returns {Promise<object>} Combined ingestion statistics
 */
const ingestAllTransactions = async (userFilePath, exchangeFilePath) => {
  const userStats = await ingestTransactions(userFilePath, "user");
  const exchangeStats = await ingestTransactions(exchangeFilePath, "exchange");

  return {
    user: userStats,
    exchange: exchangeStats,
    total: userStats.totalRows + exchangeStats.totalRows,
    totalClean: userStats.cleanRows + exchangeStats.cleanRows,
    totalWithIssues: userStats.rowsWithIssues + exchangeStats.rowsWithIssues,
  };
};

module.exports = {
  ingestTransactions,
  ingestAllTransactions,
  parseCSV,
};
