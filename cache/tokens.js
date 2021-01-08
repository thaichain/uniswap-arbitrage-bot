const axios = require("../config/axios");
const { models } = require("../config/database");
const { web3, chainId } = require("../config/web3");

const fetchTokens = async () => {
  const [uniswap, coingecko, roll, prime] = await Promise.all([
    axios.get(process.env.UNISWAP_TOKENS),
    axios.get(process.env.COINGECKO_TOKENS),
    axios.get(process.env.PRIME_TOKENS),
    axios.get(process.env.ROLL_TOKENS),
    axios.get(process.env.COMPOUND_TOKENS),
    axios.get(process.env.AAVE_TOKENS),
    axios.get(process.env.ONE_INCH_TOKENS),
    axios.get(process.env.SYNTHETIXS_TOKENS),
  ]);

  await Promise.all([
    updateTokens(uniswap.data.tokens, "Uniswap"),
    updateTokens(coingecko.data.tokens, "CoinGecko"),
    updateTokens(roll.data.tokens, "Roll"),
    updateTokens(prime.data.tokens, "Defi Prime"),
    updateTokens(prime.data.tokens, "Compound"),
    updateTokens(prime.data.tokens, "Aave"),
    updateTokens(prime.data.tokens, "One Inch"),
    updateTokens(prime.data.tokens, "Synthetixs"),
  ]);
};

const updateTokens = async (data, list) => {
  await data.forEach(async (item) => {
    var address = web3.utils.toChecksumAddress(item.address);
    if (item.chainId == chainId) {
      await models.Token.upsert({ address: address }, { ...item, address })
        .then((upserted) => {
          if (upserted)
            console.log(
              `[INFO]: Added token: ${upserted.name} (${upserted.symbol})`
            );
        })
        .catch((err) =>
          console.log(`[INFO]: Failed to import ${err.keyValue.symbol}`)
        );
    }
  });
  console.log(`[INFO]: Pulled updates from ${list} List`);
  return true;
};

module.exports = fetchTokens;
