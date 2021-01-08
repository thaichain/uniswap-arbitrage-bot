require("dotenv").config();

const { web3, chainId, Contract, admin } = require("../config/web3");
const { uniswap: abis, swapContract: swapContractAbi } = require("../abis/index");
const { swapContract: swapContractAddress } = require("../addresses/index");
const { etherToWei, weitoEther, toBN } = require('../utils/index')
const { WETH } = require("@uniswap/sdk");
const owner = process.env.OWNER

const swapContract = new Contract(swapContractAbi, swapContractAddress);
const wethContract = new Contract(abis.token, WETH[chainId].address);

const withdrawAmount = parseFloat(process.argv[2])

const main = async () => {
	const contractBalance = weitoEther(await wethContract.methods.balanceOf(swapContractAddress).call())

	if (contractBalance > withdrawAmount && admin == owner) {
		swapContract.methods
			.withdraw(etherToWei(withdrawAmount.toString()))
			.send({
				from: admin,
				gas: 100000,
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
	}
	else
		console.log("[UNAUTHORIZED]: Admin address is not the owner of the contract")
}

main()
