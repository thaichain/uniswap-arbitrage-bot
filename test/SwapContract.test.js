const Web3 = require("web3");
const rpcURL = "http://127.0.0.1:7545";
const web3 = new Web3(rpcURL);

const SwapContract = artifacts.require("SwapContract");
const { uniswap: addresses } = require("../addresses/index");
const { uniswap: abis } = require("../abis/index");
const { WETH } = require("@uniswap/sdk");

require("chai").use(require("chai-as-promised")).should();

const wei = (n) => {
  return web3.utils.toWei(n, "ether");
};

const eth = (str) => {
  return web3.utils.fromWei(str, "ether");
};

contract("SwapContract", ([owner, stranger]) => {
  let swapContract;
  let wethContract;

  beforeEach(async () => {
    swapContract = await SwapContract.new(addresses.factory, WETH[4].address);
    wethContract = new web3.eth.Contract(abis.token, WETH[4].address);

    await web3.eth.sendTransaction({
      from: owner,
      to: swapContract.address,
      value: wei("1"),
    });

    await swapContract.changeMinAmount(wei("0.01"), {
      from: owner,
      to: swapContract.address,
    });
  });

  describe("payable functionality", async () => {
    it("allows receving ether and converts to WETH", async () => {
      startAmount = eth(await web3.eth.getBalance(owner));
      await web3.eth.sendTransaction({
        from: owner,
        to: swapContract.address,
        value: wei("1"),
      });
      endAmount = eth(await web3.eth.getBalance(owner));
      endAmountContract = eth(
        await wethContract.methods.balanceOf(swapContract.address).call()
      );
      assert.equal(endAmountContract, 2);
      assert(startAmount > endAmount, "ether has not been transfered");
    });

    it("allows withdrawing to owner", async () => {
      startAmount = eth(await wethContract.methods.balanceOf(owner).call());
      await swapContract.withdraw(wei("0.1"), {
        from: owner,
      });
      endAmount = eth(await wethContract.methods.balanceOf(owner).call());
      endAmountContract = eth(
        await wethContract.methods.balanceOf(swapContract.address).call()
      );

      assert.equal(endAmountContract, 0.9);
      assert(startAmount < endAmount, "ether has not been transfered to owner");
    });

    it("does not allow withdrawing to stranger", async () => {
      await swapContract
        .withdraw(wei("0.1"), {
          from: stranger,
        })
        .catch(async (err) => {
          if (err.toString().indexOf("UNAUTHORIZED") == -1)
            assert.fail(err.toString());
          else {
            endAmountContract = eth(
              await wethContract.methods.balanceOf(swapContract.address).call()
            );
            assert.equal(endAmountContract, 1);
          }
        });
    });

    it("allows transferring to stranger using owner", async () => {
      startAmount = eth(await wethContract.methods.balanceOf(stranger).call());
      await swapContract.transfer(stranger, wei("0.1"), {
        from: owner,
      });
      endAmount = eth(await wethContract.methods.balanceOf(stranger).call());
      endAmountContract = eth(
        await wethContract.methods.balanceOf(swapContract.address).call()
      );

      assert.equal(endAmountContract, 0.9);
      assert(
        startAmount < endAmount,
        "ether has not been transfered to stranger"
      );
    });

    it("does not allow transfering to stranger from stranger", async () => {
      await swapContract
        .transfer(stranger, wei("0.1"), {
          from: stranger,
        })
        .catch(async (err) => {
          if (err.toString().indexOf("UNAUTHORIZED") == -1)
            assert.fail(err.toString());
          else {
            endAmountContract = eth(
              await wethContract.methods.balanceOf(swapContract.address).call()
            );
            assert.equal(endAmountContract, 1);
          }
        });
    });

    it("does not allow transfering to stranger more that minAmount from owner", async () => {
      await swapContract
        .transfer(stranger, wei("9"), {
          from: owner,
        })
        .catch(async (err) => {
          if (err.toString().indexOf("INSUFFICIENT_BALANCE") == -1)
            assert.fail(err.toString());
          else {
            endAmountContract = eth(
              await wethContract.methods.balanceOf(swapContract.address).call()
            );
            assert.equal(endAmountContract, 1);
          }
        });
    });

    it("allows transferring to owner using stranger", async () => {
      startAmount = eth(await wethContract.methods.balanceOf(owner).call());
      await swapContract.transfer(owner, wei("0.1"), {
        from: stranger,
      });
      endAmount = eth(await wethContract.methods.balanceOf(owner).call());
      endAmountContract = eth(
        await wethContract.methods.balanceOf(swapContract.address).call()
      );

      assert.equal(endAmountContract, 0.9);
      assert(startAmount < endAmount, "ether has not been transfered to owner");
    });

    it("does not allow transfering to owner more that minAmount from stranger", async () => {
      await swapContract
        .transfer(owner, wei("1"), {
          from: stranger,
        })
        .catch(async (err) => {
          if (err.toString().indexOf("INSUFFICIENT_BALANCE") == -1)
            assert.fail(err.toString());
          else {
            endAmountContract = eth(
              await wethContract.methods.balanceOf(swapContract.address).call()
            );
            assert.equal(endAmountContract, 1);
          }
        });
    });

    it("allows owner to change minAmount", async () => {
      await swapContract.changeMinAmount(wei("2"), {
        from: owner,
        to: swapContract.address,
      });
      var minAmount = eth(await swapContract.minAmount.call());
      assert.equal(minAmount, 2);
    });

    it("does not allow stranger to change minAmount", async () => {
      await swapContract
        .changeMinAmount(wei("4"), {
          from: stranger,
          to: swapContract.address,
        })
        .catch(async (err) => {
          if (err.toString().indexOf("UNAUTHORIZED") == -1)
            assert.fail(err.toString());
          else {
            var minAmount = eth(await swapContract.minAmount.call());
            assert.equal(minAmount, 0.01);
          }
        });
    });
  });

  describe("trade functionality", async () => {
    it("fails if minimum output minus initial gas usage is ", async () => {
      const path = [
        WETH[4].address,
        "0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735",
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        WETH[4].address,
      ];
      await swapContract
        .trade(
          wei("0.1"),
          wei("0.11"),
          path,
          Math.floor(Date.now() / 1000) + 60 * 2,
          { from: owner }
        )
        .catch(async (err) => {
          if (err.toString().indexOf("INSUFFICIENT_OUTPUT") == -1)
            assert.fail(err.toString());
          else {
          }
        });
    });

    it("fails when input is not WETH", async () => {
      const path = [
        "0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735",
        "0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735",
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        WETH[4].address,
      ];
      await swapContract
        .trade(
          wei("0.1"),
          wei("0.2"),
          path,
          Math.floor(Date.now() / 1000) + 60 * 2,
          { from: owner }
        )
        .catch(async (err) => {
          if (err.toString().indexOf("INVALID_INPUT") == -1)
            assert.fail(err.toString());
        });
    });

    it("fails when output is not WETH", async () => {
      const path = [
        WETH[4].address,
        "0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735",
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      ];
      await swapContract
        .trade(
          wei("0.1"),
          wei("0.2"),
          path,
          Math.floor(Date.now() / 1000) + 60 * 2,
          { from: owner }
        )
        .catch(async (err) => {
          if (err.toString().indexOf("INVALID_OUTPUT") == -1)
            assert.fail(err.toString());
        });
    });

    it("fails when min output is less than input", async () => {
      const path = [
        WETH[4].address,
        "0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735",
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        WETH[4].address,
      ];
      await swapContract
        .trade(
          wei("0.1"),
          wei("0.09"),
          path,
          Math.floor(Date.now() / 1000) + 60 * 20,
          { from: owner }
        )
        .catch(async (err) => {
          if (err.toString().indexOf("INVALID_MIN_OUTPUT") == -1)
            assert.fail(err.toString());
        });
    });
  });
});
