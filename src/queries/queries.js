v3Query = `
{
  pools(orderBy: volumeUSD, orderDirection: desc, first:100){
    id
    volumeUSD
    feeTier
    liquidity
    token0 {
      id
      symbol
      name
      decimals
      tokenDayData(orderBy: date, orderDirection: desc,first: 1) {
        priceUSD
      }
    }
    token1 {
      id
      symbol
      name
      decimals
      tokenDayData(orderBy: date, orderDirection: desc,first: 1) {
        priceUSD  
      }
    }
    tick
    poolDayData(orderBy: date, orderDirection: desc, first: 14) {
      high
      low
    }
  }
}
`;

v2Query = `
{
  pairs(orderBy: volumeUSD, orderDirection: desc, first:100){
    id
    volumeUSD
    reserve0
    reserve1
    token0 {
      id
      symbol
      name
      decimals
      tokenDayData(orderBy: date, orderDirection: desc,first: 1) {
        priceUSD
      }
    }
    token1 {
      id
      symbol
      name
      decimals
      tokenDayData(orderBy: date, orderDirection: desc,first: 1) {
        priceUSD
      }
    }
  }
}
`;

v2QuickswapQuery = `
{
  pairs(orderBy: volumeUSD, orderDirection: desc, first:100){
    id
    volumeUSD
    reserve0
    reserve1
    token0 {
      id
      symbol
      name
      decimals
    }
    token1 {
      id
      symbol
      name
      decimals
    }
  }
}
`;

module.exports = { v3Query, v2Query, v2QuickswapQuery };
