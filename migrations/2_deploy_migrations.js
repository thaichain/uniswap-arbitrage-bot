const SwapContract = artifacts.require("SwapContract");
const { uniswap: addresses } = require("../addresses/index");
const { WETH } = require("@uniswap/sdk");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(SwapContract, addresses.factory, WETH[1].address);
};
