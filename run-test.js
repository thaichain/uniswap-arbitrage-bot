const Web3 = require("web3");
const rpcURL = "http://127.0.0.1:7545";
const web3 = new Web3(rpcURL);
const contract = require("./build/contracts/SwapContract.json");
const { WETH } = require("@uniswap/sdk");

var contractAddress = contract.networks[5777].address;
var contractAbi = contract.abi;
const swapContract = new web3.eth.Contract(contractAbi, contractAddress);
var accounts = [];

const etherToWei = (n) => {
  return web3.utils.toWei(n, "ether");
};
const toBN = (string) => {
  return web3.utils.toBN(string);
};

const init = async () => {
  accounts = await web3.eth.getAccounts();

  test(accounts[0], accounts[1]);
};

const test = async (owner, stranger) => {
  //deposit("2", owner);
  trade(owner);
};

const deposit = (ether, owner) => {
  web3.eth
    .sendTransaction({
      from: owner,
      to: contractAddress,
      gas: 4000000,
      value: etherToWei(ether),
    })
    .on("transactionHash", (hash) => {
      console.log("SUCCESS?: ", hash);
    })
    .on("receipt", (hash) => {
      console.log("SUCCESS1?: ", hash);
    })
    .on("error", (hash) => {
      console.log("ERROR: ", hash);
    });
};

const trade = (owner) => {
  const path = [
    WETH[4].address,
    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    WETH[4].address,
  ];

  swapContract.methods
    .trade(
      etherToWei("1"),
      etherToWei("1"),
      path,
      Math.floor(Date.now() / 1000) + 60 * 20
    )
    .send({
      from: owner,
      gas: 550000,
      //nonce: count + 3,
    })
    .on("transactionHash", (hash) => {
      console.log("SUCCESS?: ", hash);
    });
};

init();
