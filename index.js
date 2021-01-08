require("dotenv").config();

const { connectDb } = require("./config/database");
const { web3, chainId } = require("./config/web3");
const { WETH } = require("@uniswap/sdk");

const { syncs, pairs, blocks } = require("./cache/index");
const { uniswap: abis } = require("./abis/index");
const wethContract = new web3.eth.Contract(abis.token, WETH[chainId].address);

const {
  addPair,
  newTradePair,
  buildTradePair,
  parseReserves,
  updatePairCache,
  checkWhitelist,
  getNonEthPairs,
  getEthPairs,
  getTrade,
  getEthPair,
  weitoEther,
  toBN,
  setGasCost,
} = require("./utils/index");

const { uniswap: topics } = require("./topics/index");
const { swapContract: swapContractAddress } = require("./addresses/index");

syncs.on("expired", async (address, sync) => {
  if (blocks.get("timestamp")) {
    parseSync(address, sync);
  }
});

blocks.on("expired", async (key, value) => {
  if (key == "balance")
    blocks.set(
      "balance",
      parseFloat(
        weitoEther(
          await wethContract.methods.balanceOf(swapContractAddress).call()
        )
      )
    );
});

const main = () => {
  web3.eth
    .subscribe("logs", {
      topics: [topics.sync],
    })
    .on("connected", async () => {
      console.log(
        "[INFO]: Connected to Ethereum: Listening for syncs on chain " + chainId
      );
    })
    .on("data", async (sync) => {
      syncs.set(sync.address, sync);
    })
    .on("error", async (error) => {
      console.log("[ERROR]: " + error);
    });

  web3.eth
    .subscribe("newBlockHeaders")
    .on("connected", async () => {
      console.log(
        "[INFO]: Connected to Ethereum: Listening for new blocks on chain " +
          chainId
      );
    })
    .on("data", async (block) => {
      blocks.set("gasPrice", await web3.eth.getGasPrice());
      blocks.set("timestamp", block.timestamp);
      console.log(
        `[INFO]: Received block ${block.number} with gasCost: ${blocks.get(
          "gasPrice"
        )}`
      );
    })
    .on("error", async (error) => {
      console.log("[ERROR]: " + error);
    });
};

const parseSync = async (address, sync) => {
  var reserves = parseReserves(sync);
  var cachedPair = pairs.get(address);

  if (cachedPair == undefined) {
    const pairAdded = await addPair(address, reserves);
    if (pairAdded) cachedPair = pairs.get(address);
  } else {
    await updatePairCache(cachedPair, reserves);
  }

  if (cachedPair != undefined) {
    const isWhitelisted = checkWhitelist(cachedPair);
    if (isWhitelisted) {
      await scanArbitrage(cachedPair);
    }
  }
};

const scanArbitrage = async (pair) => {
  const tokenWeth = pair.tokenWeth;
  const routes = [];
  if (tokenWeth == -1) {
    var middlePair = await buildTradePair(pair);
    var pairs = [null, middlePair.pair, null];
    var startEthPairs = await getEthPairs(pair.token0._id);
    var endEthPairs = await getEthPairs(pair.token1._id);

    if (startEthPairs.length > 0 && endEthPairs.length > 0) {
      for (var i = 0; i < startEthPairs.length; i++) {
        var newStartEthPair = await newTradePair(startEthPairs[i]);
        if (newStartEthPair) {
          pairs[0] = newStartEthPair.pair;

          for (var j = 0; j < endEthPairs.length; j++) {
            var newEndEthPair = await newTradePair(endEthPairs[j]);
            if (newEndEthPair) {
              pairs[2] = newEndEthPair.pair;
              getTrade(pairs);
            }
          }
        }
      }
    }
  } else if (tokenWeth == 0 || tokenWeth == 1) {
    var startPair = await buildTradePair(pair);
    var pairs = [startPair.pair];
    var middlePairs = await getNonEthPairs(startPair.token1._id);

    for (var i = 0; i < middlePairs.length; i++) {
      var newMiddlePair = await newTradePair(middlePairs[i]);

      if (newMiddlePair) {
        pairs[1] = newMiddlePair.pair;
        var middleOutputToken = false;

        if (startPair.token1.address == newMiddlePair.token0.address)
          middleOutputToken = newMiddlePair.token1;
        else if (startPair.token1.address == newMiddlePair.token1.address)
          middleOutputToken = newMiddlePair.token0;

        var endPair = await getEthPair(
          middleOutputToken._id,
          startPair.token0._id
        );

        if (endPair) {
          var newEndPair = await newTradePair(endPair);

          if (newEndPair) {
            pairs[2] = newEndPair.pair;
            getTrade(pairs);
          }
        }
      }
    }
  }
};

connectDb().then(async () => {
  blocks.set(
    "balance",
    parseFloat(
      weitoEther(
        await wethContract.methods.balanceOf(swapContractAddress).call()
      )
    )
  );
  // try {
  //   await fetchTokens();
  // } catch (e) {}
  main();
});
