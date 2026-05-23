const fs = require("fs");
const csv = require("csv-parser");
const Transaction = require("../models/Transaction");
const { normalizeAsset } = require("../utils/assetAliases");
const { validateTransaction, isValidType } = require("../utils/validators");

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        if (Object.keys(data).length > 0 && Object.values(data).some((v) => v && v.trim() !== "")) {
          results.push(data);
        }
      })
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
};

const processTransactionRow = (row, source) => {
  const errors = validateTransaction(row);

  const quantity = parseFloat(row.quantity) || 0;
  const priceUsd = row.price_usd ? parseFloat(row.price_usd) : null;
  const fee = row.fee ? parseFloat(row.fee) : null;

  let timestamp = null;
  if (row.timestamp && !errors.includes("Invalid timestamp format") && !errors.includes("Missing timestamp")) {
    timestamp = new Date(row.timestamp);
  }

  const asset = normalizeAsset(row.asset);

  return {
    source,
    transaction_id: row.transaction_id?.trim() || "",
    timestamp,
    type: row.type?.trim().toUpperCase() && isValidType(row.type?.trim().toUpperCase()) ? row.type?.trim().toUpperCase() : null,
    asset,
    quantity,
    price_usd: priceUsd,
    fee,
    note: row.note?.trim() || "",
    dataQualityIssues: errors,
    rawRow: row,
  };
};

const ingestTransactions = async (filePath, source) => {
  try {
    const rows = await parseCSV(filePath);
    const transactions = rows.map((row) => processTransactionRow(row, source));

    const transactionIds = transactions.map((t) => t.transaction_id);
    const duplicateIds = transactionIds.filter((id, index) => transactionIds.indexOf(id) !== index);

    transactions.forEach((t) => {
      if (duplicateIds.includes(t.transaction_id) && !t.dataQualityIssues.includes("Duplicate transaction_id within source")) {
        t.dataQualityIssues.push("Duplicate transaction_id within source");
      }
    });

    await Transaction.deleteMany({ source });
    const inserted = await Transaction.insertMany(transactions);

    const totalRows = rows.length;
    const rowsWithIssues = transactions.filter((t) => t.dataQualityIssues.length > 0).length;
    const cleanRows = totalRows - rowsWithIssues;

    console.log(`Ingested ${totalRows} transactions from ${source}`);
    console.log(`- Clean: ${cleanRows}, Issues: ${rowsWithIssues}`);

    return { source, totalRows, cleanRows, rowsWithIssues, insertedCount: inserted.length };
  } catch (error) {
    console.error(`Error ingesting ${filePath}:`, error);
    throw error;
  }
};

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
