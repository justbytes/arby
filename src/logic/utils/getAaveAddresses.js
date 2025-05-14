const fs = require("fs");
const path = require("path");

const AAVE_ASSETS_JSON = path.join(__dirname, "../../../data/aave_assets.json");

const rawAaveAssets = fs.readFileSync(AAVE_ASSETS_JSON);
const AAVE_ASSETS = JSON.parse(rawAaveAssets);

const isTokenBorrowable = (targetAddress) => {
  targetAddress = targetAddress.toLowerCase();
  for (let i = 0; i < AAVE_ASSETS.polygon_assets.length; i++) {
    let asset = AAVE_ASSETS.polygon_assets[i].address.toLowerCase();
    if (targetAddress === asset) {
      return true;
    }
  }
};

module.exports = isTokenBorrowable;
