const mongoose = require("mongoose");
const plugins = require("./plugins");

mongoose.plugin(plugins);

const Token = require("../models/token");
const Pair = require("../models/pair");
const Trade = require("../models/trade")

var isTest = process.env.ETH_NETWORK == "test";

const connectDb = () => {
  return mongoose.connect(
    isTest ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    }
  );
};

const models = { Token, Pair, Trade };

module.exports = { models, connectDb, mongoose };
