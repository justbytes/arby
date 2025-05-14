const { AlchemyProvider, ethers } = require("ethers");

const {
  abi: IERC20ABI,
} = require("@aave/core-v3/artifacts/contracts/dependencies/openzeppelin/contracts/IERC20.sol/IERC20.json");

// Connect to ethers.js provider of Polygon MainNet
//
const PROVIDER = new AlchemyProvider(
  "matic",
  process.env.POLYGON_LIQUIDITY_PROVIDER_KEY
);

/**
 * Gets the token balance from the pool
 * -- currently the only way I could figure out how to get the amount of tokens in the contract :(
 */
async function getTokenBalance(tokenAddress, poolAddress) {
  try {
    // Connect to contract instance of token
    //
    let tokenContract = new ethers.Contract(tokenAddress, IERC20ABI, PROVIDER);

    // Get balance of token in pool
    //
    let tokenReserves = await tokenContract.balanceOf(poolAddress);
    return tokenReserves;
  } catch (error) {
    console.error("There was an error getting the token balance \n", error);
    return false;
  }
}

module.exports = getTokenBalance;
