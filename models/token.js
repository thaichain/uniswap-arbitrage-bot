const mongoose = require("mongoose");

const Token = new mongoose.Schema(
  {
    address: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
    },
    symbol: {
      type: String,
      unique: true,
    },
    decimals: {
      type: Number,
    },
    chainId: {
      type: Number,
    },
    pairs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Pair" }],
  },
  { minimize: false }
);

Token.index({ symbol: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Token", Token);
