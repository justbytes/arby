/*__________________________________    Dependency Imports    __________________________________________
 */
const { AlchemyProvider, ethers } = require("ethers");
const { computePoolAddress } = require("@uniswap/v3-sdk");
const { Token } = require("@uniswap/sdk-core/");

/**_______________________________________   ABI Imports   ____________________________________________
 */
const {
  abi: UniswapV2FactoryABI,
} = require("@uniswap/v2-periphery/build/IUniswapV2Factory.json");

const {
  abi: UniswapV3FactoryABI,
} = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json");

const {
  abi: IUniswapV3PoolABI,
} = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");

/**________________________________     Provider Declaration     _______________________________________
 */
const PROVIDER = new AlchemyProvider("matic", process.env.POLYGON_PROVIDER_KEY); // Maybe create a setter function to set the proper MainNet

/**
 * gets a token pool of a single token on the uniswap v3 protocol
 */
async function getV3Pools(v3FactoryAddress, tokenA, tokenB) {
  let pool;
  let pools = [];
  let fees = [100, 500, 3000, 10000];

  try {
    let factory = new ethers.Contract(
      v3FactoryAddress,
      UniswapV3FactoryABI,
      this.provider
    );

    for (let i = 0; i < fees.length; i++) {
      pool = await factory.getPool(tokenA, tokenB, fees[i]);
      pools.push(pool);
    }

    return pools;
  } catch (error) {
    console.error("*********    Error with getPool()    *********\n" + error);
  }
  // Get an instance of the v3 factory
}

/**
 * Another way to verify the pool address exists or how to get pool data
 */
async function getPoolAddress(_factoryAddress, _tokenIn, _tokenOut, _fee) {
  let poolAddress;

  let address = _tokenIn.address;
  let decimals = _tokenIn.decimals;
  let symbol = _tokenIn.symbol;

  let _tokenA = new Token(137, address, decimals, symbol, "");

  address = _tokenOut.address;
  decimals = _tokenOut.decimals;
  symbol = _tokenOut.symbol;

  let _tokenB = new Token(137, address, decimals, symbol, "");

  // Get the pool address
  try {
    poolAddress = computePoolAddress({
      factoryAddress: _factoryAddress,
      tokenA: _tokenA,
      tokenB: _tokenB,
      fee: _fee,
    });
  } catch (error) {
    console.error(
      "*********    Error Computing Pool Address    *********\n" + error
    );
    return;
  }

  return poolAddress;
}

//
/**
 * gets a token pair with the uniswap v2 protocol
 */
async function getV2Pair(v2FactoryAddress, tokenA, tokenB) {
  try {
    let factory = new ethers.Contract(
      v2FactoryAddress,
      UniswapV2FactoryABI,
      this.provider
    );

    let pool = await factory.getPair(tokenA, tokenB);

    return pool;
  } catch (error) {
    console.error("*********    Error with getPair()    *********\n" + error);
  }
}

/**
 * Has access to the data for the pool
 */
async function getPoolData(poolAddress) {
  console.log("GETTING POOL DATA");

  let poolContract;

  try {
    poolContract = new ethers.Contract(
      poolAddress,
      IUniswapV3PoolABI,
      this.provider
    );
  } catch (error) {
    console.error(
      "*********    Error Connecting Pool Address    *********\n" + error
    );
    return;
  }
  let slot0 = await poolContract.slot0();
  let token0 = await poolContract.token0();
  let token1 = await poolContract.token1();

  return { slot0, token0, token1 };
}

module.exports = { getV3Pools, getPoolAddress, getV2Pair, getPoolData };
