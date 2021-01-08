var Web3 = require("web3");
var isTest = process.env.ETH_NETWORK == "test";
var rpc = isTest ? process.env.TEST_RPC : process.env.MAIN_RPC;

var web3 = new Web3(
  Web3.givenProvider || new Web3.providers.WebsocketProvider(rpc)
);
const Contract = web3.eth.Contract;
const { address: admin } = web3.eth.accounts.wallet.add(
  isTest ? process.env.TEST_WALLET : process.env.MAIN_WALLET
);
const chainId = isTest ? 4 : 1;

module.exports = { web3, Contract, admin, chainId };
