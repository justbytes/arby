require("dotenv").config({ path: "../../.env" });
const { AlchemyProvider, ethers } = require("ethers");

const {
  abi: UniswapV2Router02ABI,
} = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");

const {
  abi: QuoterV2ABI,
} = require("@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json");

const {
  abi: IUniswapV3PoolABI,
} = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");

const PROVIDER = new AlchemyProvider("matic", process.env.POLYGON_PROVIDER_KEY);

const v3Estimate = async (
  poolAddress,
  quoterAddress,
  tokenIn,
  tokenOut,
  amount,
  fee,
  oneForZero
) => {
  let quoterV2, poolContract, amountOut, token0, token1;

  // Flip token positions to calculate estimates out going the other way
  //
  if (oneForZero) {
    token0 = tokenOut;
    token1 = tokenIn;
  } else {
    token0 = tokenIn;
    token1 = tokenOut;
  }

  // Connect to quoterV2 contract instance
  //
  try {
    quoterV2 = new ethers.Contract(quoterAddress, QuoterV2ABI, PROVIDER);
  } catch (error) {
    console.error(
      "*********    Error when connecting to QuoterV2 contract | getEstimateOutV3 Searcher.js    *********\n",
      error
    );
    console.log("");
  }

  // Connect to pools contract instance
  //
  try {
    poolContract = new ethers.Contract(
      poolAddress,
      IUniswapV3PoolABI,
      PROVIDER
    );
  } catch (error) {
    console.error(
      "*********    Error when connecting to pool contract | getEstimateOutV3 Searcher.js    *********\n",
      error
    );
    console.log("");
  }

  // Get quote for swap
  //
  try {
    let params = {
      tokenIn: token0.id,
      tokenOut: token1.id,
      amountIn: amount,
      fee: fee,
      sqrtPriceLimitX96: 0,
    };
    amountOut = await quoterV2.quoteExactInputSingle.staticCall(params);

    return amountOut;
  } catch (error) {
    console.log(
      "*********    Error when getting quote    *********\n" +
        `Pool: ${token0.symbol}/${token1.symbol}\n` +
        `Pool Tier: ${fee}\n\n` +
        error
    );
    console.log("");
    return false;
  }
};

/**
 * Get a quote using Uniswap v2 quoter
 */
const v2Estimate = async (
  routerAddress,
  tokenIn,
  tokenOut,
  amount,
  oneForZero
) => {
  let router, amountOut, token0, token1;

  // Flip token positions to calculate estimates out going the other way
  //
  if (oneForZero) {
    token0 = tokenOut;
    token1 = tokenIn;
  } else {
    token0 = tokenIn;
    token1 = tokenOut;
  }

  let path = [token0.id, token1.id];

  // Connect to the router contract
  try {
    router = new ethers.Contract(routerAddress, UniswapV2Router02ABI, PROVIDER);
  } catch (error) {
    console.log(
      "*********    Error when connecting Uniswap V2 Router contract    *********\n",
      error
    );
    console.log("");
  }

  // Get the amount out
  try {
    amountOut = await router.getAmountsOut.staticCall(amount, path);

    return amountOut;
  } catch (error) {
    console.log(
      "*********    Error when getting quote    *********\n" +
        `Pool: ${token0.symbol}/${token1.symbol}\n\n` +
        error
    );
    console.log("");
    return false;
  }
};

module.exports = { v3Estimate, v2Estimate };
