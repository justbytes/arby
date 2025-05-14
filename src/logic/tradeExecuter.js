require("dotenv").config({ path: "../../.env" });
const { AlchemyProvider, ethers } = require("ethers");

const {
  abi: ARBY_ABI,
} = require("../../artifacts/contracts/ARBY.sol/ARBY.json");

const ARBY_POLYGON = "0x1F4945796b9B07404f15955ea40f5d618108296b";

class Arby {
  /**
   * Sets the provider and arby contract instances, also activates the listeners for contract events
   */
  constructor(address) {
    // Provider
    this.provider = new AlchemyProvider(
      "matic",
      process.env.POLYGON_PROVIDER_KEY
    );

    // Signer
    this.wallet = new ethers.Wallet(
      process.env.WALLET_PRIVATE_KEY,
      this.provider
    );

    // Contract
    this.arbyContract = new ethers.Contract(address, ARBY_ABI, this.wallet);

    // Contract listeners
    this.activateContractListeners();
  }

  /**
   * Request the flashloan and perform the arbitrage
   */
  async executeTrade(tokenIn, trades, amount) {
    // Encode the trades to bytes
    let encodedTrades = this.encodeParams(trades);

    try {
      // Request the flashloan
      let tx = await this.arbyContract.requestFlashLoan(
        tokenIn,
        amount,
        encodedTrades
      );
      console.log("*********    Transaction    *********\n", tx);
      console.log("");

      // Wait for trades to complete and recepit of transaction which will be used to save trade data locally
      let receipt = await tx.wait();
      console.log("*********    Receipt    *********\n", receipt);
      console.log("");

      // return true for trade being successful
      return true;
    } catch (error) {
      console.log("*********    There was an swapping    *********\n", error);
      console.log("");
      return false;
    }
  }

  /**
   * Encode the trades data before sending it to the smart contract
   */
  encodeParams(trades) {
    let coder = ethers.AbiCoder.defaultAbiCoder();
    const tradeData = coder.encode(
      [
        "tuple(address router, address tokenIn, address tokenOut, uint256 amountOutMinimum, uint256 sqrtX96, uint24 poolFee, bool v3)[]",
      ],
      [trades]
    );
    console.log("*********    ENCODED TRADE DATA    *********\n\n", tradeData);
    console.log("");
    return tradeData;
  }

  /**
   * ARBY Contract listeners
   */
  activateContractListeners() {
    // Remove any old listners
    try {
      this.arbyContract.removeAllListeners();
    } catch (error) {
      console.error(
        "*********    ERROR STOPING LISTENERS    *********\n\n",
        error
      );
      console.log("");
    }

    // Listen to smart contract event
    this.arbyContract.on(
      "TradeDecoded",
      (
        router,
        tokenIn,
        tokenOut,
        amountOutMinimum,
        sqrtX96,
        poolFee,
        v3,
        event,
        length,
        trades
      ) => {
        console.log(`*********    Trade DECODED    *********\n\n
          Router: ${router}
          Token In: ${tokenIn}
          Token Out: ${tokenOut}
          Amount Out Minimum: ${amountOutMinimum}
          sqrtX96: ${sqrtX96}
          Pool Fee: ${poolFee}
          V3: ${v3}
          Event: ${event}
          TRADES LENGTH: ${length}
          Trades: ${trades}
        `);
        console.log("");
      }
    );

    this.arbyContract.on(
      "TradeExecuted",
      (router, tokenIn, tokenOut, amount, timestamp) => {
        console.log(
          `*********    TRADE EXECUTED    *********\n\n Router: ${router}, TokenIn: ${tokenIn}, tokenOut: ${tokenOut}, amount: ${amount} timestamp: ${timestamp}`
        );
        console.log("");
      }
    );

    this.arbyContract.on("TradeSuccess", (success) => {
      console.log("*********    TRADE SUCCESS    *********\n\n", success);
      console.log("");
    });
  }

  stopListeners() {
    try {
      this.arbyContract.removeAllListeners();
    } catch (error) {
      console.error(
        "*********    ERROR STOPING LISTENERS    *********\n\n",
        error
      );
      console.log("");
    }
  }
}

module.exports = Arby;
