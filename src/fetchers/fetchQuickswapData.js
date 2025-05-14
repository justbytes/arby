require("dotenv").config({ path: "../../.env" });
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { BigNumber } = require("bignumber.js");
const { v2QuickswapQuery } = require("../queries/queries");
const findPriceFromFile = require("./utils/getPriceFromFile");

const QUICKSWAP_V2_PAIRS_JSON = path.join(
  __dirname,
  "../../data/quickswap/quickswap_v2_pairs.json"
);
const QUICKSWAP_MASTER_LIST_JSON = path.join(
  __dirname,
  "../../data/quickswap/quickswap_master_list.json"
);

const rawQuickswapV2Data = fs.readFileSync(QUICKSWAP_V2_PAIRS_JSON);

const QUICKSWAP_V2_PAIRS = JSON.parse(rawQuickswapV2Data);

/**
 * Main function that controls the flow of getting and sorting data from the quickswap subgraph.
 */
const fetchQuickswapTokens = async () => {
  console.log("Getting Quickswap pool/pair data...");
  let totalPools = [];

  await requestV2PairData();
  // Sort through v2 data to find target pairs that have liquidity greater than 20k USD.
  let v2Pairs = await computeV2Pairs(QUICKSWAP_V2_PAIRS.pairs);
  totalPools = totalPools.concat(v2Pairs);

  console.log(`Adding ${totalPools.length} to master file.`);

  // Write the the pools to a master list file for future use
  //
  fs.writeFileSync(
    QUICKSWAP_MASTER_LIST_JSON,
    JSON.stringify(
      {
        dex: "quickswap",
        address: {
          v2: {
            factory: "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32",
            router: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
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
    // Check the price of the tokens using the data from coin market cap api
    //
    let priceUSDX = findPriceFromFile(pair.token0.symbol);
    console.log("PRICE FROM COIN MARKET CAP: ", priceUSDX);
    let priceUSDY = findPriceFromFile(pair.token1.symbol);
    console.log("PRICE FROM COIN MARKET CAP: ", priceUSDY);

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

  // Display how many v2 pools are availiable for arbitrage
  //
  console.log(
    `There are ${targetPairs.length} good pools and ${badPairs.length} bad pools.`
  );

  return targetPairs;
};

/**
 * Get token data from the quickswap v2 subgraph
 */
const requestV2PairData = async () => {
  console.log("Requesting V2 pair data...");
  // quickswap v2 polygon subgraph
  //
  const V2_URL = `https://gateway-arbitrum.network.thegraph.com/api/${process.env.SUBGRAPH_API}/subgraphs/id/FnbpmBoXSidpFCghB5oxEb7XBUyGsSmyyXs9p8t3esvF`;
  let pairs;

  try {
    // Request data from subgraph
    //
    const request = await axios.post(V2_URL, { query: v2QuickswapQuery });
    pairs = request.data.data;

    // Write data to quickswap file cache
    fs.writeFileSync(QUICKSWAP_V2_PAIRS_JSON, JSON.stringify(pairs, null, 2));
  } catch (error) {
    console.error(
      "*********    Error retrieving top tokens on the POLYGON and quickswap protocols  ********* \n",
      error
    );
  }
};

module.exports = fetchQuickswapTokens;
