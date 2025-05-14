require("dotenv").config({ path: "../../.env" });
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const sleep = require("./utils/sleep");

const COIN_MARKET_CAP_JSON = path.join(
  __dirname,
  "../../data/coinMarketCap/coin_market_cap_data.json"
);

/**
 * Gets the price from CoinMarketCap api, this is a last resort to get the current price.
 * Data is writin to file cache
 */
const fetchCoinMarketCapData = async () => {
  let dataStore = [];

  // Get the first 20,000 tokens (each api call gets 5,000)
  //
  for (let i = 0; i < 4; i++) {
    try {
      console.log("Fetching data from CoinMarketCap...");
      const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest`;
      const response = await axios.get(url, {
        headers: {
          "X-CMC_PRO_API_KEY": `${process.env.COIN_MARKET_CAP}`,
        },
        params: {
          convert: "USD",
          start: i * 5000 + 1,
          limit: 5000,
        },
      });

      // Retreive the data and write it to the local cache
      //
      const data = response.data.data;
      dataStore = dataStore.concat(data);
      console.log(`Batch ${i + 1} retrieved successfully.`);

      // Wait 60 seconds to avoid rate limiting
      //
      if (i < 3) {
        console.log("Cooling down before next api call...");
        await sleep(60000);
      }
    } catch (error) {
      console.error(
        "There was an error getting tokens from Coin Market Cap API",
        error
      );
      return;
    }
  }
  // Save the data to the coinmarketcap cache file
  //
  fs.writeFileSync(COIN_MARKET_CAP_JSON, JSON.stringify(dataStore, null, 2));
};

module.exports = fetchCoinMarketCapData;
