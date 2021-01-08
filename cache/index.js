const NodeCache = require("node-cache");

module.exports = {
  blocks: new NodeCache({
    stdTTL: 90,
    checkperiod: 3,
  }),
  syncs: new NodeCache({
    stdTTL: 2,
    checkperiod: 1,
  }),
  pairs: new NodeCache({
    stdTTL: 100,
    checkperiod: 5,
  }),
  trades: new NodeCache({
    stdTTL: 60,
    checkperiod: 1,
  }),
};

// tokens: new NodeCache({
//   stdTTL: 0,
//   checkperiod: 300,
//   deleteOnExpire: false,
// }),
