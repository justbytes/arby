/**
 * This code was borrowed from:
 * https://github.com/ngduythao/uniswap-v3-pool-analyzer/blob/master/src/utils/mathbn.ts
 *
 */
const { BigNumber } = require("bignumber.js");

const Q96 = new BigNumber(2).pow(96);

// private helper functions
const encodeSqrtPriceX96 = (price) => {
  return new BigNumber(price).sqrt().multipliedBy(Q96).integerValue(3);
};

const mulDecimals = (n, exp) => {
  return new BigNumber(n).multipliedBy(new BigNumber(10).pow(exp));
};

const getPriceFromTick = (tick, token0Decimal, token1Decimal) => {
  const sqrtPrice = new BigNumber(
    Math.pow(Math.sqrt(1.0001), tick)
  ).multipliedBy(new BigNumber(2).pow(96));

  const token0 = mulDecimals(1, Number(token0Decimal));
  const token1 = mulDecimals(1, Number(token1Decimal));
  const L2 = encodeSqrtPriceX96(token0)
    .multipliedBy(encodeSqrtPriceX96(token1))
    .div(Q96);
  const price = L2.multipliedBy(Q96)
    .div(sqrtPrice)
    .div(new BigNumber(2).pow(96))
    .div(new BigNumber(10).pow(token0Decimal))
    .pow(2);
  return price.toNumber();
};

const getTokensAmountFromDepositAmountUSD = (
  P,
  Pl,
  Pu,
  priceUSDX,
  priceUSDY,
  depositAmountUSD
) => {
  const deltaL =
    depositAmountUSD /
    ((Math.sqrt(P) - Math.sqrt(Pl)) * priceUSDY +
      (1 / Math.sqrt(P) - 1 / Math.sqrt(Pu)) * priceUSDX);

  let deltaY = deltaL * (Math.sqrt(P) - Math.sqrt(Pl));
  if (deltaY * priceUSDY < 0) deltaY = 0;
  if (deltaY * priceUSDY > depositAmountUSD)
    deltaY = depositAmountUSD / priceUSDY;

  let deltaX = deltaL * (1 / Math.sqrt(P) - 1 / Math.sqrt(Pu));
  if (deltaX * priceUSDX < 0) deltaX = 0;
  if (deltaX * priceUSDX > depositAmountUSD)
    deltaX = depositAmountUSD / priceUSDX;

  return { amount0: deltaX, amount1: deltaY };
};

const getLiquidityFromTick = (poolTicks, tick) => {
  let liquidity = new BigNumber(0);

  for (let i = 0; i < poolTicks.length - 1; ++i) {
    liquidity = liquidity.plus(new BigNumber(poolTicks[i].liquidityNet));

    const lowerTick = Number(poolTicks[i].tickIdx);
    const upperTick = Number(poolTicks[i + 1]?.tickIdx);

    if (lowerTick <= tick && tick <= upperTick) break;
  }

  return liquidity;
};

// amount0 * (sqrt(upper) * sqrt(lower)) / (sqrt(upper) - sqrt(lower))
function getLiquidityForAmount0(sqrtRatioAX96, sqrtRatioBX96, amount0) {
  sqrtRatioAX96 = new BigNumber(sqrtRatioAX96);
  sqrtRatioBX96 = new BigNumber(sqrtRatioBX96);
  amount0 = new BigNumber(amount0);
  const intermediate = sqrtRatioBX96.multipliedBy(sqrtRatioAX96).div(Q96);
  return amount0
    .multipliedBy(intermediate)
    .div(sqrtRatioBX96.minus(sqrtRatioAX96));
}

// amount1 / (sqrt(upper) - sqrt(lower))
function getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, amount1) {
  sqrtRatioAX96 = new BigNumber(sqrtRatioAX96);
  sqrtRatioBX96 = new BigNumber(sqrtRatioBX96);
  amount1 = new BigNumber(amount1);
  return amount1.multipliedBy(Q96).div(sqrtRatioBX96.minus(sqrtRatioAX96));
}

const getSqrtPriceX96 = (price, token0Decimal, token1Decimal) => {
  const token0 = mulDecimals(price, token0Decimal);
  const token1 = mulDecimals(1, token1Decimal);

  return token0.div(token1).sqrt().multipliedBy(Q96);
};

const getTickFromPrice = (price, token0Decimal, token1Decimal) => {
  const token0 = mulDecimals(price, Number(token0Decimal));
  const token1 = mulDecimals(1, Number(token1Decimal));
  const sqrtPrice = encodeSqrtPriceX96(token1).div(encodeSqrtPriceX96(token0));

  return Math.log(sqrtPrice.toNumber()) / Math.log(Math.sqrt(1.0001));
};

const getLiquidityDelta = (
  P,
  lowerP,
  upperP,
  amount0,
  amount1,
  token0Decimal,
  token1Decimal
) => {
  const amt0 = mulDecimals(amount0, token1Decimal);
  const amt1 = mulDecimals(amount1, token0Decimal);

  const sqrtRatioX96 = getSqrtPriceX96(P, token0Decimal, token1Decimal);
  const sqrtRatioAX96 = getSqrtPriceX96(lowerP, token0Decimal, token1Decimal);
  const sqrtRatioBX96 = getSqrtPriceX96(upperP, token0Decimal, token1Decimal);

  let liquidity;
  if (sqrtRatioX96.lte(sqrtRatioAX96)) {
    liquidity = getLiquidityForAmount0(sqrtRatioAX96, sqrtRatioBX96, amt0);
  } else if (sqrtRatioX96.lt(sqrtRatioBX96)) {
    const liquidity0 = getLiquidityForAmount0(
      sqrtRatioX96,
      sqrtRatioBX96,
      amt0
    );
    const liquidity1 = getLiquidityForAmount1(
      sqrtRatioAX96,
      sqrtRatioX96,
      amt1
    );

    liquidity = liquidity0.lt(liquidity1) ? liquidity0 : liquidity1;
  } else {
    liquidity = getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, amt1);
  }
  return liquidity;
};

const estimateFee = (liquidityDelta, liquidity, volume24H, feeTier) => {
  const feeTierPercentage = feeTier / 1000000;
  const liquidityPercentage = liquidityDelta
    .div(liquidity.plus(liquidityDelta))
    .toNumber();
  return feeTierPercentage * volume24H * liquidityPercentage;
};

module.exports = {
  getPriceFromTick,
  getTokensAmountFromDepositAmountUSD,
  getLiquidityFromTick,
  getLiquidityForAmount0,
  getLiquidityForAmount1,
  getTickFromPrice,
  getLiquidityDelta,
  estimateFee,
};
