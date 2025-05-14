require("dotenv").config({ path: "../../.env" });
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { BigNumber } = require("bignumber.js");
const { v2Query } = require("../queries/queries");
const findPriceFromFile = require("./utils/getPriceFromFile");

const APESWAP_V2_PAIRS_JSON = path.join(
  __dirname,
  "../../data/apeswap/apeswap_v2_pairs.json"
);
const APESWAP_MASTER_LIST_JSON = path.join(
  __dirname,
  "../../data/apeswap/apeswap_master_list.json"
);

const rawApeswapV2Data = fs.readFileSync(APESWAP_V2_PAIRS_JSON);

const APESWAP_V2_PAIRS = JSON.parse(rawApeswapV2Data);

/**
 * Main function that controls the flow of getting and sorting data from the apeswap subgraph.
 */
const fetchApeswapTokens = async () => {
  console.log("Getting apeswap pair data...");
  let totalPools = [];

  await requestV2PairData();
  // Sort through v2 data to find target pools/pairs that have liquidity greater than 20k USD.
  //
  let v2Pairs = await computeV2Pairs(APESWAP_V2_PAIRS.pairs);
  totalPools = totalPools.concat(v2Pairs);
  console.log(`Adding ${totalPools.length} to master file.`);

  // Write the the pools to a master list file for future use
  //
  fs.writeFileSync(
    APESWAP_MASTER_LIST_JSON,
    JSON.stringify(
      {
        dex: "apeswap",
        address: {
          v2: {
            factory: "0xCf083Be4164828f00cAE704EC15a36D711491284",
            router: "0xC0788A3aD43d79aa53B09c2EaCc313A787d1d607",
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
 * Get token data from the apeswap v2 subgraph
 */
const requestV2PairData = async () => {
  console.log("Requesting V2 pair data...");
  // apeswap v2 polygon subgraph
  //
  const V2_URL = `https://gateway-arbitrum.network.thegraph.com/api/${process.env.SUBGRAPH_API}/subgraphs/id/32BWziYZT6en9rVM9L3sDonnjHGtKvfsiJyMDv3T7Dx1`;
  let pairs;

  try {
    // Request data from subgraph
    //
    const request = await axios.post(V2_URL, { query: v2Query });
    pairs = request.data.data;
    console.log(pairs);
    // Write data to apeswap file cache
    fs.writeFileSync(APESWAP_V2_PAIRS_JSON, JSON.stringify(pairs, null, 2));
  } catch (error) {
    console.error(
      "*********    Error retrieving top tokens on the POLYGON and apeswap protocols  ********* \n",
      error
    );
  }
};

module.exports = fetchApeswapTokens;
