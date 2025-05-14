/**
 * formate the trades to be sent to solidity
 */
const formatTrade = (trades) => {
  let tArray = [];
  let version;

  console.log("TRADES FROM FORMAT", trades);

  if (trades[0].version == "v3") {
    version = true;
  } else {
    version = false;
  }

  let trade = {
    router: trades[0].router,
    tokenIn: trades[0].baseAsset.address,
    tokenOut: trades[0].token.address,
    amountOutMinimum: trades[0].amountOutMinimum,
    sqrtX96: 0,
    poolFee: trades[0].fee,
    v3: version,
  };
  tArray.push(trade);

  if (trades[1].version == "v3") {
    version = true;
  } else {
    version = false;
  }

  trade = {
    router: trades[1].router,
    tokenIn: trades[1].baseAsset.address,
    tokenOut: trades[1].token.address,
    amountOutMinimum: trades[1].amountOutMinimum,
    sqrtX96: 0,
    poolFee: trades[1].fee,
    v3: version,
  };

  tArray.push(trade);

  return tArray;
};

module.exports = formatTrade;
