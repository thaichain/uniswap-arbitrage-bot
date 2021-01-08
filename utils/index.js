const { web3, Contract, admin, chainId } = require("../config/web3");
const {
  Token,
  WETH,
  TokenAmount,
  Pair,
  Route,
  Trade,
  TradeType,
} = require("@uniswap/sdk");

const { pairs, blocks, trades } = require("../cache/index");
const { models } = require("../config/database");
const {
  uniswap: abis,
  swapContract: swapContractAbi,
} = require("../abis/index");
const { whitelist, blacklist, useWhitelist } = require("../config/tokens");
const { swapContract: swapContractAddress } = require("../addresses/index");

const wethContract = new Contract(abis.token, WETH[chainId].address);
const swapContract = new Contract(swapContractAbi, swapContractAddress);

const etherToWei = (n) => {
  return web3.utils.toWei(n, "ether");
};

const weitoEther = (n) => {
  return web3.utils.fromWei(n, "ether");
};

const isAddress = (address) => {
  return web3.utils.isAddress(address);
};

const getEthAmount = (
  token,
  percent,
  max = process.env.MAX_TRADE_ETH,
  min = process.env.MIN_TRADE_ETH
) => {
  const eth = web3.utils.toBN(Math.floor(parseInt(token.reserve) * percent));
  if (parseInt(eth) > parseInt(web3.utils.toWei(max, "ether")))
    return web3.utils.toWei(max, "ether");
  else if (parseInt(eth) < parseInt(web3.utils.toWei(min, "ether")))
    return web3.utils.toWei(min, "ether");
  else return eth;
};

const toBN = (string) => {
  return web3.utils.toBN(string);
};

const isNumeric = (n) => {
  return !isNaN(parseFloat(n)) && isFinite(n);
};

const checkWhitelist = (pair) => {
  if (
    ((whitelist.indexOf(pair.token0.symbol) > -1 &&
      whitelist.indexOf(pair.token1.symbol) > -1) ||
      !useWhitelist) &&
    blacklist.indexOf(pair.token0.symbol) == -1 &&
    blacklist.indexOf(pair.token1.symbol) == -1
  )
    return true;
  else return false;
};

const parseReserves = (sync) => {
  return web3.eth.abi.decodeParameters(["uint256", "uint256"], sync.data);
};

const buildTradePair = async (pair) => {
  const TOKENS = [
    new Token(
      chainId,
      pair.token0.address,
      pair.token0.decimals,
      pair.token0.symbol,
      pair.token0.name
    ),
    new Token(
      chainId,
      pair.token1.address,
      pair.token1.decimals,
      pair.token1.symbol,
      pair.token1.name
    ),
  ];
  const PAIR = new Pair(
    new TokenAmount(TOKENS[0], pair.token0.reserve),
    new TokenAmount(TOKENS[1], pair.token1.reserve)
  );

  return { pair: PAIR, token0: { ...pair.token0 }, token1: { ...pair.token1 } };
};

const newTradePair = async (pair) => {
  var cachedPair = pairs.get(pair.address);

  if (cachedPair == undefined) {
    cachedPair = await addPairToCache(pair._id);
  }
  if (cachedPair) {
    return buildTradePair(cachedPair);
  } else return false;
};

const estimateGasFees = async () => {
  // return routerContract.methods
  //   .swapExactTokensForTokens(
  //     etherToWei((0.5).toString()),
  //     etherToWei((0.3).toString()),
  //     [
  //       WETH[chainId].address,
  //       "0xD04785C4d8195e4A54d9dEc3a9043872875ae9E2",
  //       // "0xb8a5dBa52FE8A0Dd737Bf15ea5043CEA30c7e30B",
  //       // WETH[chainId].address,
  //     ],
  //     admin,
  //     Math.floor(Date.now() / 1000) + 60 * 10
  //   )
  //   .estimateGas({ from: admin })
  //   .catch((err) => console.log(err));
  return parseFloat(weitoEther(toBN(200000 * blocks.get("gasPrice"))));
};

const getTrade = async (pairs) => {
  var route = new Route(pairs, WETH[chainId]);
  var midPrice = route.midPrice.toSignificant(6);
  if (
    (midPrice > 1.02 && midPrice < 2) ||
    (midPrice < 0.98 && midPrice > 0.5)
  ) {
    // Check if we need reverse route
    if (midPrice < 1) {
      route = new Route([pairs[2], pairs[1], pairs[0]], WETH[chainId]);
      midPrice = route.midPrice.toSignificant(6);
    }
    const TRADE = new Trade(
      route,
      new TokenAmount(WETH[chainId], etherToWei("0.1")), //0.1 ETH
      TradeType.EXACT_INPUT
    );

    const executionPrice = TRADE.executionPrice.toSignificant(6);
    const priceImpact = TRADE.priceImpact.toSignificant(6);
    const slippage = priceImpact - 0.9;
    const maxProfit = (executionPrice - 1) * 100;
    const gasFees = await estimateGasFees();
    const input = TRADE.inputAmount.toSignificant(6);
    const output = TRADE.outputAmount.toSignificant(6);
    const outputFinal = output - gasFees;

    // Profit must be at least 20% of fee or maxProfit must be greater than price impact
    if (
      outputFinal > input + gasFees * 0.2 ||
      (output > input && priceImpact < maxProfit)
    ) {
      // Calculate input increase to maximize profit
      var inputIncrease = maxProfit / slippage / 2;
      // New input
      var input2 = input * inputIncrease;

      // Final trade info
      const TRADE2 = new Trade(
        route,
        new TokenAmount(WETH[chainId], etherToWei(input2.toString())),
        TradeType.EXACT_INPUT
      );

      var outputFinal2 = TRADE2.outputAmount.toSignificant(6) - gasFees;
      var profitInEth = outputFinal2 - input2;
      var percentProfit = (profitInEth / input2) * 100;
      console.log("[SUCCESS]: " + percentProfit);
      if (profitInEth > 0.002) {
        //if profit is at least ~$1
        console.log(
          pairs[0].tokenAmounts[0].token.symbol,
          pairs[0].tokenAmounts[1].token.symbol,
          pairs[1].tokenAmounts[0].token.symbol,
          pairs[1].tokenAmounts[1].token.symbol
        );
        console.log("\texecutionPrice: ", executionPrice);
        console.log("\tpriceImpact: ", priceImpact);
        console.log("\tmaxProfit (without gas fees): ", maxProfit);
        console.log("\tinput: ", input);
        console.log("\toutput: ", output);
        console.log("\tgasFees: ", gasFees);
        console.log("\tgasPrice", blocks.get("gasPrice"));
        console.log("\tfinal output:", outputFinal);
        console.log("\t\t\t actual: ", TRADE2.priceImpact.toSignificant(6));
        console.log("\t\t\t output: ", outputFinal2);
        console.log("\t\t\t profit: ", profitInEth);

        createTransaction(
          TRADE2,
          profitInEth,
          executionPrice,
          priceImpact,
          maxProfit,
          outputFinal2
        );
      }
    }
  }
};

const setGasCost = async (profitInEth) => {
  const currentGasPrice = parseInt(blocks.get("gasPrice"));
  const initialFee = await estimateGasFees();
  const maxMultplier = (initialFee + profitInEth) / initialFee;

  if (currentGasPrice < 20000000000)
    if (maxMultplier > 1.5) return [currentGasPrice * 1.5, initialFee * 1.5];
    else if (maxMultplier > 1.2)
      return [currentGasPrice * 1.2, initialFee * 1.2];
    else return null;
  else if (currentGasPrice < 40000000000)
    if (maxMultplier > 1.8) return [currentGasPrice * 1.8, initialFee * 1.8];
    else if (maxMultplier > 1.2)
      return [currentGasPrice * 1.2, initialFee * 1.2];
    else return null;
  else if (currentGasPrice < 60000000000)
    if (maxMultplier > 2) return [currentGasPrice * 2, initialFee * 2];
    else if (maxMultplier > 1.3)
      return [currentGasPrice * 1.3, initialFee * 1.3];
    else return null;
  else if (maxMultplier > 2) return [currentGasPrice * 2, initialFee * 2];
  else if (maxMultplier > 1.4) return [currentGasPrice * 1.4, initialFee * 1.4];
  else return null;
};

const createTransaction = async (
  trade,
  profitInEth,
  executionPrice,
  priceImpact,
  maxProfit,
  outputFinal2
) => {
  const input = trade.inputAmount.toSignificant(6);
  const output = trade.outputAmount.toSignificant(6);
  const path = [
    trade.route.path[0].address,
    trade.route.path[1].address,
    trade.route.path[2].address,
    trade.route.path[3].address,
  ];

  const [gasCost, gasFees] = await setGasCost(profitInEth);
  const gas = 400000;
  const minimumOutput = parseFloat(input) + gasFees;

  if (
    gasCost &&
    gasFees &&
    gasCost !== null &&
    gasFees !== null &&
    blocks.get("balance") > input &&
    output > input &&
    input < minimumOutput &&
    path[0] == WETH[chainId].address &&
    path[3] == WETH[chainId].address &&
    blocks.get("timestamp") &&
    blocks.get("timestamp") < Date.now() / 1000 + 5 &&
    trades.keys().length == 0
  ) {
    console.log("processing trade");
    blocks.del("timestamp");
    trades.set(
      trade.route.path[1].address.substr(35) +
        trade.route.path[2].address.substr(35),
      true
    );
    web3.eth.getTransactionCount(admin).then((count) => {
      var hash = "";
      swapContract.methods
        .trade(
          etherToWei(input.toString()),
          etherToWei(minimumOutput.toString()),
          path,
          Math.floor(Date.now() / 1000) + 60
        )
        .send({
          from: admin,
          gas: gas,
          gasPrice: parseInt(gasCost),
          //nonce: count + 1,
        })
        .on("transactionHash", (txhash) => {
          hash = txhash;
          console.log("[INFO]: Successfully sent tx: ", txhash);
        })
        .on("receipt", async (receipt) => {
          trades.del(
            trade.route.path[1].address.substr(35) +
              trade.route.path[2].address.substr(35)
          );
          blocks.set(
            "balance",
            parseFloat(
              weitoEther(
                await wethContract.methods.balanceOf(swapContractAddress).call()
              )
            )
          );
          saveTrade(
            admin,
            gas,
            gasCost,
            count + 1,
            hash,
            trade,
            "success",
            receipt,
            input,
            minimumOutput,
            path,
            executionPrice,
            priceImpact,
            maxProfit,
            output,
            outputFinal2
          );
          console.log("[SUCCESS]: Transaction confirmed: ", receipt);
        })
        .on("error", (error) => {
          trades.del(
            trade.route.path[1].address.substr(35) +
              trade.route.path[2].address.substr(35)
          );
          saveTrade(
            admin,
            gas,
            gasCost,
            count + 1,
            hash,
            trade,
            "error",
            error,
            input,
            minimumOutput,
            path,
            executionPrice,
            priceImpact,
            maxProfit,
            output,
            outputFinal2
          );
          console.log("[ERROR]: ", error);
        });
    });
  } else {
    console.log(gasFees, gas, gasCost, input, minimumOutput, path);
    console.log(gasCost);
    console.log(gasFees);
    console.log(blocks.get("balance") > input);
    console.log(output > input);
    console.log(input < minimumOutput);
    console.log(
      path[0] == WETH[chainId].address && path[3] == WETH[chainId].address
    );
    console.log(blocks.get("timestamp"));
    console.log(trades.keys().length == 0);
  }
};

const saveTrade = (
  from,
  gas,
  gasCost,
  nonce,
  hash,
  tradeObject,
  status,
  receipt,
  input,
  minimumOutput,
  path,
  executionPrice,
  priceImpact,
  maxProfit,
  output,
  outputFinal2
) => {
  console.log(
    gas,
    parseInt(gasCost),
    blocks.get("gasPrice"),
    input,
    minimumOutput,
    path
  );
  var trade = new models.Trade({
    from,
    gas,
    gasCost,
    nonce,
    hash,
    tradeObject,
    status,
    receipt,
    input,
    minimumOutput,
    path,
    executionPrice,
    priceImpact,
    maxProfit,
    output,
    outputFinal2,
  });

  trade.save();
};

const getNonEthPairs = async (id) => {
  const token = await models.Token.findById({
    _id: id,
  }).populate("pairs", null, { tokenWeth: -1 });
  return token.pairs;
};

const getEthPairs = async (id) => {
  const token = await models.Token.findById({
    _id: id,
  }).populate("pairs", null, {
    $or: [{ tokenWeth: 1 }, { tokenWeth: 0 }],
  });
  return token.pairs;
};

const getEthPair = async (idA, idB) => {
  const pair = await models.Pair.findOne({
    $or: [
      {
        token0: idA,
        token1: idB,
      },
      {
        token0: idB,
        token1: idA,
      },
    ],
  });
  return pair;
};

const updatePairCache = async (pair, reserves) => {
  return pairs.set(pair.address, {
    ...pair,
    token0: {
      ...pair.token0,
      reserve: reserves[0],
    },
    token1: {
      ...pair.token1,
      reserve: reserves[1],
    },
    timestamp: blocks.get("timestamp"),
  });
};

const addPairToCache = async (id) => {
  const newPair = await models.Pair.findById({
    _id: id,
  })
    .populate("token0", ["address", "symbol", "decimals"])
    .populate("token1", ["address", "symbol", "decimals"]);

  var pairContract = new Contract(abis.pair, newPair._doc.address);

  const reserves = await pairContract.methods
    .getReserves()
    .call()
    .catch((err) => "[WARNING]: Failed to fetch pair reserves");

  if (
    isNumeric(reserves[0]) &&
    isNumeric(reserves[1]) &&
    isNumeric(reserves[2])
  ) {
    var addedPair = {
      ...newPair._doc,
      token0: {
        ...newPair._doc.token0._doc,
        reserve: reserves[0],
      },
      token1: {
        ...newPair._doc.token1._doc,
        reserve: reserves[1],
      },
      timestamp: reserves[2],
    };
    pairs.set(newPair._doc.address, addedPair);
    return addedPair;
  } else return false;
};

const addPair = async (address, reserves) => {
  const pair = await models.Pair.findOne({ address: address })
    .populate("token0")
    .populate("token1");

  if (pair) {
    var token0 = pair.token0.address;
    var token1 = pair.token1.address;
  } else {
    var pairContract = new Contract(abis.pair, address);

    var [token0, token1] = await Promise.all([
      pairContract.methods
        .token0()
        .call()
        .catch((err) => console.log("Failed to fetch token0", err.data)),
      pairContract.methods
        .token1()
        .call()
        .catch((err) => console.log("Failed to fetch token1", err.data)),
    ]);
  }
  if (token0 && token1) {
    var [savedToken0, savedToken1] = await Promise.all([
      await models.Token.findOne(
        { address: token0 },
        { _id: 1, address: 1, symbol: 1, decimals: 1 }
      ),
      await models.Token.findOne(
        { address: token1 },
        { _id: 1, address: 1, symbol: 1, decimals: 1 }
      ),
    ]);

    if (!savedToken0) {
      const token0Added = await _addToken(token0);
      if (token0Added) {
        await models.Token.findOne(
          { address: token0 },
          { _id: 1, address: 1, symbol: 1, decimals: 1 }
        ).then((token) => (savedToken0 = token));
      }
    }
    if (!savedToken1) {
      const token1Added = await _addToken(token1);
      if (token1Added) {
        await models.Token.findOne(
          { address: token1 },
          { _id: 1, address: 1, symbol: 1, decimals: 1 }
        ).then((token) => (savedToken1 = token));
      }
    }
    if (savedToken0 && savedToken1) {
      var tokenWeth = -1;
      if (savedToken0.symbol === "WETH") tokenWeth = 0;
      else if (savedToken1.symbol === "WETH") tokenWeth = 1;

      var updatedPair = {
        address: address,
        token0: savedToken0._doc,
        token1: savedToken1._doc,
        symbol0: savedToken0._doc.symbol,
        symbol1: savedToken1._doc.symbol,
        address0: savedToken0._doc.address,
        address1: savedToken1._doc.address,
        tokenWeth,
      };

      updatePairCache(updatedPair, reserves);

      models.Pair.upsert({ address: address }, updatedPair).then((upserted) => {
        if (upserted) {
          models.Token.findOneAndUpdate(
            { _id: savedToken0._id },
            { $push: { pairs: upserted._id } },
            (err, result0) => {
              if (err) console.log(err);

              models.Token.findOneAndUpdate(
                { _id: savedToken1._id },
                { $push: { pairs: upserted._id } },
                (err, result1) => {
                  if (err) console.log(err);
                  else
                    console.log(
                      `[INFO]: Added ${result0.name} (${result0.symbol}) - ${result1.name} (${result1.symbol})`
                    );
                }
              );
            }
          );
        }
      });
      return true;
    } else return false;
  }
};

const _addToken = async (token) => {
  const tokenContract = new Contract(abis.token, token);
  const [symbol, name, decimals] = await Promise.all([
    tokenContract.methods
      .symbol()
      .call()
      .catch((err) =>
        console.log("[WARNING]: Failed to fetch token symbol", err.data)
      ),
    tokenContract.methods
      .name()
      .call()
      .catch((err) =>
        console.log("[WARNING]: Failed to fetch token name", err.data)
      ),
    tokenContract.methods
      .decimals()
      .call()
      .catch((err) =>
        console.log("[WARNING]: Failed to fetch token decimals", err.data)
      ),
  ]);

  if (symbol && decimals) {
    const newToken = new models.Token({
      address: token,
      name,
      symbol,
      decimals: parseInt(decimals),
      chainId: 1,
    });

    return newToken
      .save()
      .then((result) => `[INFO]: Added ${name} (${symbol})`)
      .catch((err) => `[WARNING]: Failed to add ${name} (${symbol})`);
  } else {
    console.log(`[WARNING]: Failed to fetch token info for ${token}`);
    return false;
  }
};

module.exports = {
  isAddress,
  getEthAmount,
  toBN,
  isNumeric,
  checkWhitelist,
  parseReserves,
  newTradePair,
  updatePairCache,
  addPairToCache,
  getNonEthPairs,
  getEthPairs,
  addPair,
  buildTradePair,
  getTrade,
  getEthPair,
  weitoEther,
  etherToWei,
  setGasCost,
};
