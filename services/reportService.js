const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const ReconciliationRun = require("../models/ReconciliationRun");

/**
 * Format a transaction for CSV output
 * @param {object} tx - Transaction object
 * @param {string} prefix - Prefix for field names (user_ or exchange_)
 * @returns {object} Formatted transaction object
 */
const formatTransactionForCSV = (tx, prefix) => {
  if (!tx) return {};

  return {
    [`${prefix}transaction_id`]: tx.transaction_id || "",
    [`${prefix}timestamp`]: tx.timestamp ? tx.timestamp.toISOString() : "",
    [`${prefix}type`]: tx.type || "",
    [`${prefix}asset`]: tx.asset || "",
    [`${prefix}quantity`]: tx.quantity || 0,
    [`${prefix}price_usd`]: tx.price_usd || "",
    [`${prefix}fee`]: tx.fee || "",
    [`${prefix}note`]: tx.note || "",
    [`${prefix}data_quality_issues`]: tx.dataQualityIssues
      ? tx.dataQualityIssues.join("; ")
      : "",
  };
};

/**
 * Generate CSV report from matching results
 * @param {object} matchingResults - Results from matching service
 * @param {string} runId - Unique run identifier
 * @returns {Promise<string>} Path to generated report file
 */
const generateCSVReport = async (matchingResults, runId) => {
  const reportsDir = path.join(__dirname, "../../reports");

  // Ensure reports directory exists
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = path.join(reportsDir, `reconciliation_${runId}.csv`);

  // CSV header
  const headers = [
    "category",
    "reason",
    "user_transaction_id",
    "exchange_transaction_id",
    "user_timestamp",
    "exchange_timestamp",
    "user_type",
    "exchange_type",
    "user_asset",
    "exchange_asset",
    "user_quantity",
    "exchange_quantity",
    "user_price_usd",
    "exchange_price_usd",
    "user_fee",
    "exchange_fee",
    "user_note",
    "exchange_note",
    "user_data_quality_issues",
    "exchange_data_quality_issues",
  ];

  // Build CSV rows
  const rows = [];

  // Matched transactions
  for (const item of matchingResults.matched) {
    const userFields = formatTransactionForCSV(item.userTx, "user_");
    const exchangeFields = formatTransactionForCSV(
      item.exchangeTx,
      "exchange_",
    );

    rows.push({
      category: "MATCHED",
      reason: item.reason,
      ...userFields,
      ...exchangeFields,
    });
  }

  // Conflicting transactions
  for (const item of matchingResults.conflicting) {
    const userFields = formatTransactionForCSV(item.userTx, "user_");
    const exchangeFields = formatTransactionForCSV(
      item.exchangeTx,
      "exchange_",
    );

    let conflictDetails = "";
    if (item.details) {
      const details = [];
      if (!item.details.timestampMatch)
        details.push(`Timestamp diff: ${item.details.timestampDiffSeconds}s`);
      if (!item.details.quantityMatch)
        details.push(
          `Quantity diff: ${item.details.quantityDiffPct.toFixed(2)}%`,
        );
      conflictDetails = details.join("; ");
    }

    rows.push({
      category: "CONFLICTING",
      reason: `${item.reason}. ${conflictDetails}`,
      ...userFields,
      ...exchangeFields,
    });
  }

  // Unmatched user transactions
  for (const item of matchingResults.unmatchedUser) {
    const userFields = formatTransactionForCSV(item.userTx, "user_");

    rows.push({
      category: "UNMATCHED_USER",
      reason: item.reason,
      ...userFields,
      exchange_transaction_id: "",
      exchange_timestamp: "",
      exchange_type: "",
      exchange_asset: "",
      exchange_quantity: "",
      exchange_price_usd: "",
      exchange_fee: "",
      exchange_note: "",
      exchange_data_quality_issues: "",
    });
  }

  // Unmatched exchange transactions
  for (const item of matchingResults.unmatchedExchange) {
    const exchangeFields = formatTransactionForCSV(
      item.exchangeTx,
      "exchange_",
    );

    rows.push({
      category: "UNMATCHED_EXCHANGE",
      reason: item.reason,
      user_transaction_id: "",
      user_timestamp: "",
      user_type: "",
      user_asset: "",
      user_quantity: "",
      user_price_usd: "",
      user_fee: "",
      user_note: "",
      user_data_quality_issues: "",
      ...exchangeFields,
    });
  }

  // Convert to CSV string
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = String(row[header] || "");
          // Escape quotes and wrap in quotes if contains comma or quote
          if (
            value.includes(",") ||
            value.includes('"') ||
            value.includes("\n")
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(","),
    ),
  ].join("\n");

  // Write to file
  fs.writeFileSync(reportPath, csvContent, "utf8");

  console.log(`Report generated at: ${reportPath}`);

  return reportPath;
};

/**
 * Save reconciliation run metadata to database
 * @param {string} runId - Unique run identifier
 * @param {object} config - Configuration used for the run
 * @param {object} stats - Statistics from the run
 * @param {string} reportPath - Path to generated report
 * @returns {Promise<object>} Saved reconciliation run
 */
const saveReconciliationRun = async (runId, config, stats, reportPath) => {
  const reconciliationRun = new ReconciliationRun({
    runId,
    config: {
      timestampToleranceSeconds: config.timestampToleranceSeconds,
      quantityTolerancePct: config.quantityTolerancePct,
    },
    stats: {
      matched: stats.matched,
      conflicting: stats.conflicting,
      unmatchedUser: stats.unmatchedUser,
      unmatchedExchange: stats.unmatchedExchange,
    },
    reportPath,
  });

  await reconciliationRun.save();
  console.log(`Reconciliation run ${runId} saved to database`);

  return reconciliationRun;
};

/**
 * Get reconciliation run by runId
 * @param {string} runId - Unique run identifier
 * @returns {Promise<object>} Reconciliation run document
 */
const getReconciliationRun = async (runId) => {
  return await ReconciliationRun.findOne({ runId });
};

/**
 * Get unmatched transactions for a run
 * @param {object} matchingResults - Results from matching service
 * @returns {object} Unmatched transactions grouped by source
 */
const getUnmatchedTransactions = (matchingResults) => {
  return {
    unmatchedUser: matchingResults.unmatchedUser.map((item) => ({
      transaction_id: item.userTx.transaction_id,
      timestamp: item.userTx.timestamp,
      type: item.userTx.type,
      asset: item.userTx.asset,
      quantity: item.userTx.quantity,
      reason: item.reason,
      dataQualityIssues: item.userTx.dataQualityIssues,
    })),
    unmatchedExchange: matchingResults.unmatchedExchange.map((item) => ({
      transaction_id: item.exchangeTx.transaction_id,
      timestamp: item.exchangeTx.timestamp,
      type: item.exchangeTx.type,
      asset: item.exchangeTx.asset,
      quantity: item.exchangeTx.quantity,
      reason: item.reason,
      dataQualityIssues: item.exchangeTx.dataQualityIssues,
    })),
  };
};

module.exports = {
  generateCSVReport,
  saveReconciliationRun,
  getReconciliationRun,
  getUnmatchedTransactions,
};
