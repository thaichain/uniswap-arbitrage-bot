const mongoose = require("mongoose");

const Pair = new mongoose.Schema(
  {
    address: {
      type: String,
      unique: true,
    },
    tokenWeth: {
      type: Number,
    },
    token0: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Token",
    },
    token1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Token",
    },
    symbol0: {
      type: String,
    },
    symbol1: {
      type: String,
    },
    address0: {
      type: String,
    },
    address1: {
      type: String,
    },
  },
  { timestamps: true, minimize: false }
);

module.exports = mongoose.model("Pair", Pair);
