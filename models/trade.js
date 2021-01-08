const mongoose = require("mongoose");

const Trade = new mongoose.Schema(
  {
    hash: {
      type: String,
      unique: true
    },
    status: {
      type: String
    },
    from: {
      type: String
    },
    gas: {
      type: Number
    },
    gasCost: {
      type: Number
    },
    nonce: {
      type: Number
    },
    receipt: {
      type: mongoose.Schema.Types.Mixed,
    },
    input: {
      type: Number,
    },
    minimumOutput: {
      type: Number,
    },
    deadline: {
      type: Number
    },
    executionPrice: {
      type: Number
    },
    priceImpact: {
      type: Number
    },
    maxProfit: {
      type: Number
    },
    input: {
      type: Number
    },
    output: {
      type: Number
    },
    outputFinal2: {
      type: Number 
    },
    path: [String],
    tradeObject: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { minimize: false }
);

module.exports = mongoose.model("Trade", Trade);