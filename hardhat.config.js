require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env" });

/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
  solidity: "0.8.10",
  networks: {
    polygon: {
      url: process.env.POLYGON_URL,
      accounts: [process.env.WALLET_PRIVATE_KEY],
    },
  },
};
