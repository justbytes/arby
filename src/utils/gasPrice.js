require("dotenv").config({ path: "../.env" });
const axios = require("axios");

const getGasPrice = async (trade) => {
  let data;
  try {
    let request = await axios.get(
      `https://api.polygonscan.com/api?module=gastracker&action=gasoracle&apikey=${process.env.POLYGONSCAN}`
    );

    data = request.data.result.FastGasPrice;
  } catch (error) {
    console.error(
      "*********    Error when fetching gas price from orcale    *********\n",
      error
    );
    console.log("");
  }

  return data;
};

module.exports = getGasPrice;
