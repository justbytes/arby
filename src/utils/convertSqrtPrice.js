const convertSqrtPrice = (sqrtPriceX96, amount, Decimal0, Decimal1) => {
  const buyOneOfToken0 =
    (sqrtPriceX96 / 2 ** 96) ** 2 /
    (10 ** Decimal1 / 10 ** Decimal0).toFixed(Decimal1);

  const buyOneOfToken1 = (amount / buyOneOfToken0).toFixed(Decimal0);

  console.log(
    "price of token0 in value of token1 : " + buyOneOfToken0.toString()
  );
  console.log(
    "price of token1 in value of token0 : " + buyOneOfToken1.toString()
  );
  console.log("");

  return buyOneOfToken0 * buyOneOfToken1;
};

module.exports;
