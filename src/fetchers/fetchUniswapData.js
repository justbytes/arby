require("dotenv").config({ path: "../../.env" });
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { BigNumber } = require("bignumber.js");
const { v3Query, v2Query } = require("../queries/queries");
const sleep = require("./utils/sleep");
const findPriceFromFile = require("./utils/getPriceFromFile");
const getTokenBalance = require("./utils/getTokenBalance");

const UNISWAP_V3_POOLS_JSON = path.join(
  __dirname,
  "../../data/uniswap/uniswap_v3_pools.json"
);

const UNISWAP_V2_PAIRS_JSON = path.join(
  __dirname,
  "../../data/uniswap/uniswap_v2_pairs.json"
);
const UNISWAP_MASTER_LIST_JSON = path.join(
  __dirname,
  "../../data/uniswap/uniswap_master_list.json"
);

const rawUniswapV3Data = fs.readFileSync(UNISWAP_V3_POOLS_JSON);
const rawUniswapV2Data = fs.readFileSync(UNISWAP_V2_PAIRS_JSON);

const UNISWAP_V3_POOLS = JSON.parse(rawUniswapV3Data);
const UNISWAP_V2_PAIRS = JSON.parse(rawUniswapV2Data);

/**
 * Main function that controls the flow of getting and sorting data from the Uniswap subgraph.
 */
const fetchUniswapTokens = async () => {
  console.log("Getting Uniswap pool/pair data...");
  let totalPools = [];

  await requestV3PoolData();
  await requestV2PairData();
  // Sort through v2 & v3 data to find target pools/pairs that have liquidity greater than 20k USD.
  let v3Pools = await computeV3Pools(UNISWAP_V3_POOLS.pools);
  totalPools = totalPools.concat(v3Pools);
  let v2Pairs = await computeV2Pairs(UNISWAP_V2_PAIRS.pairs);
  totalPools = totalPools.concat(v2Pairs);

  console.log(`Adding ${totalPools.length} to master file.`);

  // Write the the pools to a master list file for future use
  //
  fs.writeFileSync(
    UNISWAP_MASTER_LIST_JSON,
    JSON.stringify(
      {
        dex: "uniswap",
        address: {
          v2: {
            factory: "0x9e5A52f57b3038F1B8EeE45F28b3C1967e22799C",
            router: "0xedf6066a2b290C185783862C7F4776A2C8077AD1",
          },
          v3: {
            factory: "0x1f98431c8ad98523631ae4a59f267346ea31f984",
            router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
            quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
          },
        },
        pairs: totalPools,
      },
      null,
      2
    )
  );

  console.log("File was saved!");
};

/**
 * Analyze V3 Uniswap subgraph data to find target pairs
 */
const computeV3Pools = async (pools) => {
  console.log("Computing V3 Pools...");
  let targetPools = [];
  let badPools = [];

  for (const pool of pools) {
    // Gets the amount of token0 & token1 in a given contract
    // waiting 2 seconds inbetween to reduce rate limiting errors
    //
    await sleep(2000);
    let token0Reserves = await getTokenBalance(pool.token0.id, pool.id);
    await sleep(2000);
    let token1Reserves = await getTokenBalance(pool.token1.id, pool.id);

    // Format each amount to the correct decimal place of the token
    //
    let token0InContract = new BigNumber(token0Reserves)
      .dividedBy(new BigNumber(10).pow(Number(pool.token0.decimals)))
      .toString();
    let token1InContract = new BigNumber(token1Reserves)
      .dividedBy(new BigNumber(10).pow(Number(pool.token1.decimals)))
      .toString();

    // Attempt to get the price from the subgraph
    // -- often this can return a zero and more steps will need to be taken if true
    //
    let priceUSDX = Number(pool.token0.tokenDayData[0].priceUSD);
    let priceUSDY = Number(pool.token1.tokenDayData[0].priceUSD);

    // Check to see if the price from subgraph is zero
    // If it is the best solution I came up with was getting the price from
    // the Coin Market Cap Api
    //
    if (priceUSDX == 0) {
      console.log(
        "Subgraph is not returing a price for token " +
          pool.token0.symbol +
          " " +
          pool.token0.name +
          "\n" +
          "Getting token price from CoinMarketCap api...\n"
      );

      // Gets the price from the Coin Market Cap API
      //
      priceUSDX = findPriceFromFile(pool.token0.symbol);
      console.log("PRICE FROM COIN MARKET CAP: ", priceUSDX);
    }

    // Check to see if the price from subgraph is zero
    // If it is the best solution I came up with was getting the price from
    // the Coin Market Cap Api
    //
    if (priceUSDY == 0) {
      console.log(
        "Subgraph is not returing a price for token " +
          pool.token1.symbol +
          " " +
          pool.token1.name +
          "\n" +
          "Getting token price from CoinMarketCap api...\n"
      );

      // Gets the price from the Coin Market Cap API
      //
      priceUSDY = findPriceFromFile(pool.token1.symbol);
      console.log("PRICE FROM COIN MARKET CAP: ", priceUSDY);
    }

    // Multiply the amount of tokens in the contract by the price to see the value in USD
    //
    let token0InContractUSD = new BigNumber(token0InContract).multipliedBy(
      priceUSDX
    );

    // Multiply the amount of tokens in the contract by the price to see the value in USD
    //
    let token1InContractUSD = new BigNumber(token1InContract).multipliedBy(
      priceUSDY
    );

    // Now check to make sure there is atleast 20k USD value of each token to ensure ample liquidity for trades
    // Trades that have enough will be put in a good list the other will be discarded
    //
    if (token0InContractUSD > 20000 && token1InContractUSD > 20000) {
      targetPools.push({ v3: true, ...pool });
      console.log("A good pool was added");
    } else {
      badPools.push(pool);
      console.log("That was a bad pool");
    }
  }

  // Display how many v3 pools are availiable for arbitrage
  //
  console.log(
    `There are ${targetPools.length} good pools and ${badPools.length} bad pools.`
  );

  return targetPools;
};

const computeV2Pairs = async (pairs) => {
  console.log("Computing V2 Pairs...");
  let targetPairs = [];
  let badPairs = [];

  for (const pair of pairs) {
    // Attempt to get the price from the subgraph
    // -- often this can return a zero and more steps will need to be taken if true
    //
    let priceUSDX = Number(pair.token0.tokenDayData[0].priceUSD);
    let priceUSDY = Number(pair.token1.tokenDayData[0].priceUSD);

    // Check to see if the price from subgraph is zero
    // If it is the best solution I came up with was getting the price from
    // the Coin Market Cap Api
    //
    if (priceUSDX == 0) {
      console.log(
        "Subgraph is not returing a price for token " +
          pair.token0.symbol +
          " " +
          pair.token0.name +
          "\n" +
          "Getting token price from CoinMarketCap api...\n"
      );

      // Gets the price from the Coin Market Cap API
      //
      priceUSDX = findPriceFromFile(pair.token0.symbol);
      console.log("PRICE FROM COIN MARKET CAP: ", priceUSDX);
    }

    // Check to see if the price from subgraph is zero
    // If it is the best solution I came up with was getting the price from
    // the Coin Market Cap Api
    //
    if (priceUSDY == 0) {
      console.log(
        "Subgraph is not returing a price for token " +
          pair.token1.symbol +
          " " +
          pair.token1.name +
          "\n" +
          "Getting token price from CoinMarketCap api...\n"
      );

      // Gets the price from the Coin Market Cap API
      //
      priceUSDY = findPriceFromFile(pair.token1.symbol);
      console.log("PRICE FROM COIN MARKET CAP: ", priceUSDY);
    }

    // Multiply the amount of tokens in the contract by the price to see the value in USD
    //
    let token0InContractUSD = new BigNumber(pair.reserve0).multipliedBy(
      priceUSDX
    );

    // Multiply the amount of tokens in the contract by the price to see the value in USD
    //
    let token1InContractUSD = new BigNumber(pair.reserve1).multipliedBy(
      priceUSDY
    );

    // Now check to make sure there is atleast 20k USD value of each token to ensure ample liquidity for trades
    // Trades that have enough will be put in a good list the other will be discarded
    //
    if (token0InContractUSD > 20000 && token1InContractUSD > 20000) {
      targetPairs.push({ v3: false, ...pair });
      console.log("A good pool was added");
    } else {
      badPairs.push(pair);
      console.log("That was a bad pool");
    }
  }

  // Display how many v3 pools are availiable for arbitrage
  //
  console.log(
    `There are ${targetPairs.length} good pools and ${badPairs.length} bad pools.`
  );

  return targetPairs;
};

/**
 * Get token data from the Uniswap v3 subgraph
 */
const requestV3PoolData = async () => {
  console.log("Requesting V3 pool data...");
  // Uniswap v3 polygon subgraph
  //
  const V3_URL = `https://gateway-arbitrum.network.thegraph.com/api/${process.env.SUBGRAPH_API}/subgraphs/id/3hCPRGf4z88VC5rsBKU5AA9FBBq5nF3jbKJG7VZCbhjm`;
  let pools;

  try {
    // Request data from subgraph
    //
    const request = await axios.post(V3_URL, { query: v3Query });
    pools = request.data.data;

    // Write data to Uniswap file cache
    fs.writeFileSync(UNISWAP_V3_POOLS_JSON, JSON.stringify(pools, null, 2));
  } catch (error) {
    console.error(
      "*********    Error retrieving top tokens on the POLYGON and UNISWAP protocols  ********* \n",
      error
    );
  }
};

/**
 * Get token data from the Uniswap v2 subgraph
 */
const requestV2PairData = async () => {
  console.log("Requesting V2 pair data...");
  // Uniswap v2 polygon subgraph
  //
  const V2_URL = `https://gateway-arbitrum.network.thegraph.com/api/${process.env.SUBGRAPH_API}/subgraphs/id/EXBcAqmvQi6VAnE9X4MNK83LPeA6c1PsGskffbmThoeK`; // This one is for ethereum mainnet ---> `https://gateway-arbitrum.network.thegraph.com/api/${process.env.SUBGRAPH_API}/subgraphs/id/A3Np3RQbaBA6oKJgiwDJeo5T3zrYfGHPWFYayMwtNDum`;
  let pairs;

  try {
    // Request data from subgraph
    //
    const request = await axios.post(V2_URL, { query: v2Query });
    pairs = request.data.data;

    // Write data to Uniswap file cache
    fs.writeFileSync(UNISWAP_V2_PAIRS_JSON, JSON.stringify(pairs, null, 2));
  } catch (error) {
    console.error(
      "*********    Error retrieving top tokens on the POLYGON and UNISWAP protocols  ********* \n",
      error
    );
  }
};

module.exports = fetchUniswapTokens;
