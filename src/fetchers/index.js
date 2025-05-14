const fs = require("fs");
const path = require("path");
const fetchUniswapTokens = require("./fetchUniswapData");
const fetchSushiswapTokens = require("./fetchSushiswapData");
const fetchQuickswapTokens = require("./fetchQuickswapData");
const fetchApeswapTokens = require("./fetchApeswapData");
const fetchCoinMarketCapData = require("./fetchCoinMarketCapData");
const getArrayLengths = require("./utils/getArrayLengths");

// JSON file that contains the timestamp for the fresh data check
//
const TIME_JSON = path.join(__dirname, "../../data/time.json");
const rawTimeData = fs.readFileSync(TIME_JSON);
const TIME = JSON.parse(rawTimeData);

// Dates and times for tracking purposes
//
const CACHE_FRESH = 24 * 60 * 60 * 1000; // 24 hours in mS
const NOW = Date.now();

/**
 * Checks to make sure the cached data is still fresh | fetched within the last 24 hours.
 */
const isFresh = () => {
  const timeDifference = NOW - TIME.timestamp;
  const fresh = timeDifference <= CACHE_FRESH;
  console.log("CACHE IS FRESH:", fresh);

  return fresh;
};

/**
 * Creates the master lists of token data along with data from coin market cap and compiles JSON files for each exchange
 */
async function main() {
  // See if the data has been retrieved within the last 24 hours
  //

  // let fresh = isFresh();

  let fresh = false;
  // If the data is not fresh (fetched within the last 24 hours) then it will fetch fresh data
  //
  if (fresh) {
    console.log("Exchange data has been retrieved within the last 24 hours...");
    getArrayLengths();
    return;
  }

  // Get data from coin market cap in case a cross reference is needed when retrieving token data from exhanges
  //
  try {
    await fetchCoinMarketCapData();
  } catch (error) {
    console.error(
      "There was an error when retrieving data from coin market cap!"
    );
  }

  // Get data token data from exchanges
  //

  try {
    await fetchUniswapTokens();
    await fetchSushiswapTokens();
    await fetchQuickswapTokens();
    await fetchApeswapTokens();

    fs.writeFileSync(TIME_JSON, JSON.stringify({ timestamp: NOW }, null, 2));

    getArrayLengths();

    console.log(
      "*********    Data has been compiled ready for arbitrage!    *********"
    );
  } catch (error) {
    console.error(
      "There was an error when getting data from one of the exchanges!"
    );
  }
}

main();
