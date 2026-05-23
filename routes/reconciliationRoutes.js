const express = require('express');
const router = express.Router();
const {
  reconcile,
  getReport,
  getSummary,
  getUnmatched
} = require('../controllers/reconciliationController');

// POST /reconcile - Trigger reconciliation run
router.post('/reconcile', reconcile);

// GET /report/:runId - Fetch full reconciliation report
router.get('/report/:runId', getReport);

// GET /report/:runId/summary - Fetch reconciliation summary
router.get('/report/:runId/summary', getSummary);

// GET /report/:runId/unmatched - Fetch unmatched transactions
router.get('/report/:runId/unmatched', getUnmatched);

module.exports = router;
