require("dotenv").config();

const { web3, chainId, Contract, admin } = require("../config/web3");
const {
  uniswap: abis,
  swapContract: swapContractAbi,
} = require("../abis/index");
const { swapContract: swapContractAddress } = require("../addresses/index");
const { etherToWei, weitoEther, toBN } = require("../utils/index");
const { WETH } = require("@uniswap/sdk");
const owner = process.env.OWNER;

const swapContract = new Contract(swapContractAbi, swapContractAddress);

const newMinAmount = parseFloat(process.argv[2]);

const main = async () => {
  const contractMinAmount = parseFloat(
    weitoEther(await swapContract.methods.minAmount().call())
  );

  if (admin == owner && newMinAmount != contractMinAmount) {
    swapContract.methods
      .changeMinAmount(etherToWei(toBN(newMinAmount)))
      .send({
        from: admin,
        gas: 50000,
      })
      .on("transactionHash", (txhash) => {
        console.log("[INFO]: Successfully sent tx: ", txhash);
      })
      .on("receipt", (receipt) => {
        console.log("[SUCCESS]: ", receipt);
      })
      .on("error", (error) => {
        console.log("[ERROR]: ", error);
      });
  } else
    console.log(
      "[UNAUTHORIZED]: Admin address is not the owner or minAmount already set to",
      newMinAmount
    );
};

main();
