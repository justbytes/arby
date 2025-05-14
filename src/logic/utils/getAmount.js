const getAmount = (baseAsset) => {
  let amount;

  switch (baseAsset) {
    case "0x2791bca1f2de4661ed88a30c99a7a9449aa84174": // USDC.e
      amount = 1000;
      return amount;
    case "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619": // WETH
      amount = 0.3;
      return amount;
    case "0xc2132d05d31c914a87c6611c10748aeb04b58e8f": // USDT
      amount = 1000;
      return amount;
    case "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270": // WMATIC
      amount = 1900;
      return amount;
    case "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359": // USDC
      amount = 1000;
      return amount;
    case "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063": // DAI
      amount = 1000;
      return amount;
    case "0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39": // LINK
      amount = 65;
      return amount;
    case "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6": // WBTC
      amount = 0.015;
      return amount;

    default:
      console.log("***  BASE ASSET NOT FOUND  ***");
      return false;
  }
};

module.exports = getAmount;
