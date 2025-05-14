require("dotenv").config({ path: "../.env" });
const { v3Estimate, v2Estimate } = require("./utils/calculateAmountsOut");
const { ethers } = require("ethers");
const isTokenBorrowable = require("./utils/getAaveAddresses");
const getAmount = require("./utils/getAmount");

/**
 * Loops through the incoming pools/pairs to see if there is a aave borrowable asset
 * and returns the amount to borrow.
 *
 * This may need to be updated to a better control of getting an amount out due to the
 * future pools/pairs containing non aave assets and be bridges to maxamize profits
 */
const getTradeAmount = (tradeData) => {
  console.log("*********    Getting amount to borrow    *********");
  console.log("");
  let amount;

  for (let i = 0; i < tradeData.length; i++) {
    let pair = tradeData[i].pair;

    // Verify token0 is a borrowable asset from Aave
    //
    let isToken0Borrowable = isTokenBorrowable(pair.token0.id);
    // If borrowable get amount to be traded based off of baseAsset symbol
    // If token0 is not a Aave asset then check if token1 is
    //
    if (isToken0Borrowable) {
      // Get the amount to borrow, every token should get ~1000 dollars worth of a token
      //
      amt = getAmount(pair.token0.id);

      // Convert the amount to the correct decimal point
      //
      amount = ethers.parseUnits(amt.toString(), Number(pair.token0.decimals));

      // Returns the starting amount in USD, the amount formated by the token decimal number, and the token address
      //
      return [amt, amount, pair.token0];
    } else {
      // See if token1 is an Aave asset
      //
      let isToken1Borrowable = isTokenBorrowable(pair.token1.id);

      if (isToken1Borrowable != false) {
        // Get the amount to borrow, every token should get ~1000 dollars worth of a token
        //
        amt = getAmount(pair.token1.id);

        // Convert the amount to the correct decimal point
        //
        amount = ethers.parseUnits(amt.toString(), pair.token1.decimals);

        // Returns the starting amount in USD, the amount formated by the token decimal number, and the token address
        //
        return [amt, amount, pair.token1];
      } else {
        // If its not an Aave asset we will return false
        // - Future implementation will just add this to a list for a multi swap arbitrage
        //   for now we will keep it simple
        //
        amount = false;
        return amount;
      }
    }
  }
};

/**
 * Takes a list of pairs and gets the amounts out for each one
 * oneForZero can be set to true which will swap the position of
 * token0 and token1 to get the amounts out going the other way
 */
const getTradeEstimates = async (tradeData, amount) => {
  let tradeList = [];

  // Loop throught the incoming trade data and get the amounts out based on v3 or v2 protocol
  //
  for (let i = 0; i < tradeData.length; i++) {
    let dexName = tradeData[i].dexName;
    let addresses = tradeData[i].dexAddresses;
    let pair = tradeData[i].pair;

    // Get amounts out for a pair using the Uniswap v3 protocol
    //
    if (pair.v3) {
      console.log(
        "*********    Estimating amount out for v3 swap    *********"
      );
      console.log("");

      // Get the amount out data from the v3 pool
      //
      let tradeEstimate = await v3Estimate(
        pair.id,
        addresses.quoter,
        pair.token0,
        pair.token1,
        amount,
        Number(pair.feeTier),
        false
      );

      // Display it so I have something to look at
      //
      console.log(
        "*********    TRADE ESTIMATE INFO    *********\n",
        tradeEstimate
      );
      console.log("");

      // Set a 0.3% slippage rate and convert it back to an integer
      //
      let amountOut = Number(tradeEstimate[0]);
      let calculatedAmountOutMin = Math.floor(amountOut - amountOut * 0.003);
      let amountOutMin = BigInt(calculatedAmountOutMin);

      // Update the current pool with the new data so it can be saved to a new list
      //
      let pairWithEstimate = {
        dexName,
        ...addresses,
        ...pair,
        amountOut: tradeEstimate[0],
        amountOutMinimum: amountOutMin,
        sqrtPriceAfter: tradeEstimate[1],
        ticksCrossed: tradeEstimate[2],
        estimatedGas: tradeEstimate[3],
      };

      // If the trade estimate returned false do not add it to the the list
      //
      if (!tradeEstimate) {
        console.log("V3 trade estimate failed and returned false");
        console.log("");
      } else {
        tradeList.push(pairWithEstimate);
      }
    }

    // Get amounts out for a pair using the Uniswap v2 protocol
    //
    if (!pair.v3) {
      console.log(
        "*********    Estimating amount out for v2 swap    *********"
      );
      console.log("");

      let tradeEstimate = await v2Estimate(
        addresses.router,
        pair.token0,
        pair.token1,
        amount,
        false
      );

      // Display it so I have something to look at
      //
      console.log("*********    TRADE INFO    *********\n", tradeEstimate);
      console.log("");

      // Set a 0.8% slippage rate and convert it back to an integer
      //
      let amountOut = Number(tradeEstimate[1]);
      let calculatedAmountOutMin = Math.floor(amountOut - amountOut * 0.003);
      let amountOutMinimum = BigInt(calculatedAmountOutMin);

      // Update the current pool with the new data so it can be saved to a new list
      //
      let pairWithEstimate = {
        dexName,
        ...addresses,
        ...pair,
        amountOut: tradeEstimate[1],
        amountOutMinimum: amountOutMinimum,
      };

      // If the trade estimate returned false do not add it to the the list
      //
      if (!tradeEstimate) {
        console.log("V3 trade estimate failed and returned false");
        console.log("");
      } else {
        tradeList.push(pairWithEstimate);
      }
    }
  }
  return tradeList;
};

/**
 * Finds the price difference between the given pairs, gets the estimate out returning back to the
 * borrowed asset and signals if its profitable
 */
const computePrices = async (tradeData, startingAmount, borrowedToken) => {
  console.log("*********    Computing trade amounts    *********");
  console.log("");
  var firstTrade, secondTrade;
  var firstTradePrice = 0n;
  var secondTradePrice = 0n;

  // Calculate fees for loan and a small profit buffer then add those numbers to
  // create a target price
  //
  const aaveFee = startingAmount * 0.0005; // 0.05% intrest on loan
  const buffer = startingAmount * 0.005; // .5% buffer to ensure small profit
  let targetPrice = startingAmount + aaveFee + buffer;

  // Convert the value to a big int
  //
  targetPrice = BigInt(
    ethers.parseUnits(targetPrice.toString(), Number(borrowedToken.decimals))
  );

  // Loop through each trade finding the highest and lowest price
  //
  for (let i = 0; i < tradeData.length; i++) {
    let amountOut = tradeData[i].amountOut;

    // Conditionals that filter the tradeData to find the highest and lowest amounts out
    //
    if (firstTradePrice === 0n && secondTradePrice === 0n) {
      firstTradePrice = amountOut;
      firstTrade = tradeData[i];
    } else if (amountOut > firstTradePrice && secondTradePrice === 0n) {
      secondTradePrice = firstTradePrice;
      secondTrade = firstTrade;
      firstTradePrice = amountOut;
      firstTrade = tradeData[i];
    } else if (amountOut < firstTradePrice && secondTradePrice === 0n) {
      secondTradePrice = amountOut;
      secondTrade = tradeData[i];
    } else if (amountOut > firstTradePrice) {
      firstTradePrice = amountOut;
      firstTrade = tradeData[i];
    } else if (amountOut < secondTradePrice) {
      secondTradePrice = amountOut;
      secondTrade = tradeData[i];
    }
  }
  console.log("TRADE DATA: ", tradeData);

  console.log("FIRST TRADE: ", firstTrade);

  console.log("SECOND TRADE: ", secondTrade);

  // This gets the amountOut from token1 back to token0 using secondTrade's amountOutMin
  // to get the "worst" case senerio
  //
  if (secondTrade.v3) {
    let tradeEstimate = await v3Estimate(
      secondTrade.id,
      secondTrade.quoter,
      secondTrade.token0,
      secondTrade.token1,
      firstTrade.amountOut,
      Number(secondTrade.feeTier),
      true
    );

    //
    secondTrade = {
      ...secondTrade,
      amountOut: tradeEstimate[0],
      sqrtPriceAfter: tradeEstimate[1],
      ticksCrossed: tradeEstimate[2],
      estimatedGas: tradeEstimate[3],
    };

    if (secondTrade.amountOut > targetPrice) {
      console.log(
        "*********    Trade is profitable    *********\n" +
          "Target Price: " +
          targetPrice +
          "\n" +
          "Returned Price: " +
          secondTrade.amountOut +
          "\n" +
          "Difference: ",
        secondTrade.amountOut - targetPrice
      );
      console.log("");
      return [secondTrade, firstTrade];
    } else {
      console.log(
        "*********    Trade is not profitable    *********\n" +
          "Target Price: " +
          targetPrice +
          "\n" +
          "Returned Price: " +
          secondTrade.amountOut
      );
      console.log("");
      return false;
    }
  }

  if (!secondTrade.v3) {
    let tradeEstimate = await v2Estimate(
      secondTrade.router,
      secondTrade.token0,
      secondTrade.token1,
      firstTrade.amountOut,
      true
    );

    // Update the current pool with the new data so it can be saved to a new list
    //
    secondTrade = {
      ...secondTrade,
      amountOut: tradeEstimate[1],
    };

    if (secondTrade.amountOut > targetPrice) {
      console.log(
        "*********    Trade is profitable    *********\n" +
          "Target Price: " +
          targetPrice +
          "\n" +
          "Returned Price: " +
          secondTrade.amountOut +
          "\n" +
          "Difference: ",
        secondTrade.amountOut - targetPrice
      );
      console.log("");
      return [secondTrade, firstTrade];
    } else {
      console.log(
        "*********    Trade is not profitable    *********\n" +
          "Target Price: " +
          targetPrice +
          "\n" +
          "Returned Price: " +
          secondTrade.amountOut
      );
      console.log("");
      return false;
    }
  }
};

/**
 * Finds a profitable trade by indexing through the pairs and calculating liquidity,amount out, and fees
 */
const computeTrade = async (incomingData) => {
  let startingAmount, amountToTrade, borrowedToken;
  console.log("Checking for trade...");

  // Get the starting amount, the amount of token to borrow formated to the tokens decimal,
  // and the startingAddress
  // TODO: send the borrowedToken to getTradeAmount and do a check to make sure the first token is the borrowed asset
  [startingAmount, amountToTrade, borrowedToken] = getTradeAmount(incomingData);

  console.log(
    `Starting amount: ${startingAmount} amountToTrade: ${amountToTrade} borrowedToken ${borrowedToken}`
  );

  // If its not an Aave asset we will return false
  //
  if (!amountToTrade) return false;

  //Get estimated amounts out for each pair
  //
  let tradesWithEstimates = await getTradeEstimates(
    incomingData,
    amountToTrade,
    false
  );

  // Sanity check to ensure there are still enough pairs
  //
  if (tradesWithEstimates.length < 2) return false;

  let trades = await computePrices(
    tradesWithEstimates,
    startingAmount,
    borrowedToken
  );

  if (!trades) return false;

  return trades;

  //if (trades != false && trades != undefined) {
  // Format trades to be sent to ARBY contract
  // formatedTrades = formatTrade(trades);
  // console.log("formated trades", formatedTrades);
  // Attempt to perform the trade
  //   let success = await arby.executeTrade(
  //     pairs[0].baseAsset.address,
  //     formatedTrades,
  //     amount
  //   );
  //   // Log approprate response based on returned value
  //   if (success) {
  //     console.log("A profitable trade was made");
  //     return true;
  //   } else {
  //     console.log(
  //       "A price change or something else made the trade revert. Continue searching..."
  //     );
  //     return false;
  //   }
  // } else {
  //   console.log("*********    Trade was not profitable    *********");
  //   return false;
  // }
  //}
};

module.exports = computeTrade;
