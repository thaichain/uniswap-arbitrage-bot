require("dotenv").config();

const { web3, chainId, Contract, admin } = require("../config/web3");
const { uniswap: abis, swapContract: swapContractAbi } = require("../abis/index");
const { swapContract: swapContractAddress } = require("../addresses/index");
const { etherToWei, weitoEther } = require('../utils/index')
const { WETH } = require("@uniswap/sdk");
const owner = process.env.OWNER

const swapContract = new Contract(swapContractAbi, swapContractAddress);
const wethContract = new Contract(abis.token, WETH[chainId].address);

const transferAmount = parseFloat(process.argv[2])
var transferAddress = process.argv[3]

if (transferAddress == "owner")
	transferAddress = owner

const main = async () => {
	const contractBalance = parseFloat(weitoEther(await wethContract.methods.balanceOf(swapContractAddress).call()))
	const contractMinAmount = parseFloat(weitoEther(await swapContract.methods.minAmount().call()))

	if (contractBalance > transferAmount + contractMinAmount && (admin == owner) || transferAddress == owner) {
		swapContract.methods
			.withdraw(etherToWei(toBN(withdrawAmount)))
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
		console.log("[UNAUTHORIZED]: Sender must be owner or destination address must be owner")
}

main()