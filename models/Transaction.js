const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ["user", "exchange"],
      required: true,
    },
    transaction_id: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: false,
    },
    type: {
      type: String,
      required: false,
    },
    asset: {
      type: String,
      required: false,
    },
    quantity: {
      type: Number,
      required: false,
    },
    price_usd: {
      type: Number,
      required: false,
    },
    fee: {
      type: Number,
      required: false,
    },
    note: {
      type: String,
      required: false,
    },
    dataQualityIssues: [
      {
        type: String,
      },
    ],
    rawRow: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient matching
transactionSchema.index({ source: 1, transaction_id: 1 });
transactionSchema.index({ source: 1, type: 1, asset: 1 });
transactionSchema.index({ source: 1, timestamp: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
