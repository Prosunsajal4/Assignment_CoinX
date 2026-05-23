const mongoose = require('mongoose');

const reconciliationRunSchema = new mongoose.Schema({
  runId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  config: {
    timestampToleranceSeconds: {
      type: Number,
      required: true
    },
    quantityTolerancePct: {
      type: Number,
      required: true
    }
  },
  stats: {
    matched: {
      type: Number,
      default: 0
    },
    conflicting: {
      type: Number,
      default: 0
    },
    unmatchedUser: {
      type: Number,
      default: 0
    },
    unmatchedExchange: {
      type: Number,
      default: 0
    }
  },
  reportPath: {
    type: String,
    required: false
  },
  reportContent: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ReconciliationRun', reconciliationRunSchema);
