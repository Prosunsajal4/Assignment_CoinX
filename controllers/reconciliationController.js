const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { ingestAllTransactions } = require('../services/ingestionService');
const { matchTransactions } = require('../services/matchingService');
const { generateCSVReport, saveReconciliationRun, getReconciliationRun, getUnmatchedTransactions } = require('../services/reportService');
const config = require('../utils/config');

/**
 * Trigger reconciliation run
 * POST /reconcile
 */
const reconcile = async (req, res) => {
  try {
    // Get config overrides from request body
    const timestampToleranceSeconds = req.body.timestampToleranceSeconds || config.timestampToleranceSeconds;
    const quantityTolerancePct = req.body.quantityTolerancePct || config.quantityTolerancePct;
    
    const runConfig = {
      timestampToleranceSeconds,
      quantityTolerancePct
    };
    
    console.log('Starting reconciliation with config:', runConfig);
    
    // Generate unique run ID
    const runId = uuidv4();
    
    // Ingest transactions
    const userFilePath = path.join(__dirname, '../../data/user_transactions.csv');
    const exchangeFilePath = path.join(__dirname, '../../data/exchange_transactions.csv');
    
    const ingestionStats = await ingestAllTransactions(userFilePath, exchangeFilePath);
    
    // Match transactions
    const matchingResults = await matchTransactions(runConfig);
    
    // Generate CSV report
    const reportPath = await generateCSVReport(matchingResults, runId);
    
    // Save reconciliation run to database
    await saveReconciliationRun(runId, runConfig, matchingResults.stats, reportPath);
    
    res.status(200).json({
      success: true,
      runId,
      stats: matchingResults.stats,
      ingestion: ingestionStats,
      config: runConfig
    });
  } catch (error) {
    console.error('Error in reconciliation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Fetch full reconciliation report
 * GET /report/:runId
 */
const getReport = async (req, res) => {
  try {
    const { runId } = req.params;
    
    const reconciliationRun = await getReconciliationRun(runId);
    
    if (!reconciliationRun) {
      return res.status(404).json({
        success: false,
        error: 'Reconciliation run not found'
      });
    }
    
    const fs = require('fs');
    if (!fs.existsSync(reconciliationRun.reportPath)) {
      return res.status(404).json({
        success: false,
        error: 'Report file not found'
      });
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=reconciliation_${runId}.csv`);
    
    const fileStream = fs.createReadStream(reconciliationRun.reportPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Fetch reconciliation summary
 * GET /report/:runId/summary
 */
const getSummary = async (req, res) => {
  try {
    const { runId } = req.params;
    
    const reconciliationRun = await getReconciliationRun(runId);
    
    if (!reconciliationRun) {
      return res.status(404).json({
        success: false,
        error: 'Reconciliation run not found'
      });
    }
    
    res.status(200).json({
      success: true,
      runId,
      timestamp: reconciliationRun.timestamp,
      config: reconciliationRun.config,
      stats: {
        matched: reconciliationRun.stats.matched,
        conflicting: reconciliationRun.stats.conflicting,
        unmatched_user: reconciliationRun.stats.unmatchedUser,
        unmatched_exchange: reconciliationRun.stats.unmatchedExchange
      }
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Fetch unmatched transactions
 * GET /report/:runId/unmatched
 */
const getUnmatched = async (req, res) => {
  try {
    const { runId } = req.params;
    
    const reconciliationRun = await getReconciliationRun(runId);
    
    if (!reconciliationRun) {
      return res.status(404).json({
        success: false,
        error: 'Reconciliation run not found'
      });
    }
    
    // Re-run matching to get unmatched details
    const runConfig = {
      timestampToleranceSeconds: reconciliationRun.config.timestampToleranceSeconds,
      quantityTolerancePct: reconciliationRun.config.quantityTolerancePct
    };
    
    const matchingResults = await matchTransactions(runConfig);
    const unmatched = getUnmatchedTransactions(matchingResults);
    
    res.status(200).json({
      success: true,
      runId,
      unmatched
    });
  } catch (error) {
    console.error('Error fetching unmatched:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  reconcile,
  getReport,
  getSummary,
  getUnmatched
};
