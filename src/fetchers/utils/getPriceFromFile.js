const fs = require("fs");
const path = require("path");

const COIN_MARKET_CAP_JSON = path.join(
  __dirname,
  "../../../data/coinMarketCap/coin_market_cap_data.json"
);
const rawCMCData = fs.readFileSync(COIN_MARKET_CAP_JSON);
const COIN_MARKET_CAP = JSON.parse(rawCMCData);

/**
 * Loops throught the CoinMarketCap cached data to find a given token symbol
 */
function findPriceFromFile(targetSym) {
  console.log(
    "Getting price from market cap cache...",
    targetSym.toLowerCase()
  );

  // Loop through CoinMarketCap API data
  for (let i = 0; i < COIN_MARKET_CAP.length; i++) {
    let data = COIN_MARKET_CAP[i];
    let symbol = data.symbol.toLowerCase();
    if (symbol === targetSym.toLowerCase()) {
      let price = data.quote.USD.price;
      return price;
    }
  }
}

module.exports = findPriceFromFile;
