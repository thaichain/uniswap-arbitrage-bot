require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");

const Web3 = require("web3");
const web3 = new Web3();

const getEnv = (env) => {
  const value = process.env[env];
  if (typeof value === "undefined") {
    throw new Error(`${env} has not been set.`);
  }
  return value;
};
const mainWallet = getEnv("MAIN_WALLET");
const mainRPC = getEnv("MAIN_RPC");
const testWallet = getEnv("TEST_WALLET");
const testRPC = getEnv("TEST_RPC");

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*", // Match any network id
    },
    main: {
      provider: () => new HDWalletProvider(mainWallet, mainRPC),
      network_id: 1,
      gasPrice: web3.utils.toWei("15", "gwei"),
    },
    test: {
      networkCheckTimeout: 100 * 1000,
      provider: function () {
        return new HDWalletProvider(testWallet, testRPC);
      },
      network_id: 4,
      gas: 10000000, //4000000, //make sure this gas allocation isn't over 4M, which is the max
      gasPrice: web3.utils.toWei("10", "gwei"),
    },
  },
  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.7.0", // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      // settings: {          // See the solidity docs for advice about optimization and evmVersion
      //  optimizer: {
      //    enabled: false,
      //    runs: 200
      //  },
      //  evmVersion: "byzantium"
      // }
    },
  },
};
