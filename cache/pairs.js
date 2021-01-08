const { pairs } = require("./index");
const { models } = require("../config/database");

const initializePairs = () => {
  return models.Pair.find({})
    .populate("token0", ["address", "symbol", "decimals"])
    .populate("token1", ["address", "symbol", "decimals"])
    .then((pairArray) => {
      if (pairArray.length > 0) {
        pairArray.forEach((item) => {
          pairs.set(item.address, item._doc);
        });
        console.log("[INFO]: Copied all pairs into cache");
      } else console.log("[WARNING]: Failed to initialize any pairs!");
    });
};

module.exports = initializePairs;
