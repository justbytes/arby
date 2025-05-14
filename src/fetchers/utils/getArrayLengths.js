const fs = require("fs");
const path = require("path");

const UNISWAP_MASTER_LIST_JSON = path.join(
  __dirname,
  "../../../data/uniswap/uniswap_master_list.json"
);

const SUSHISWAP_MASTER_LIST_JSON = path.join(
  __dirname,
  "../../../data/sushiswap/sushiswap_master_list.json"
);

const QUICKSWAP_MASTER_LIST_JSON = path.join(
  __dirname,
  "../../../data/quickswap/quickswap_master_list.json"
);

const APESWAP_MASTER_LIST_JSON = path.join(
  __dirname,
  "../../../data/apeswap/apeswap_master_list.json"
);

const rawUniswapData = fs.readFileSync(UNISWAP_MASTER_LIST_JSON);
const rawSushiswapData = fs.readFileSync(SUSHISWAP_MASTER_LIST_JSON);
const rawQuickswapData = fs.readFileSync(QUICKSWAP_MASTER_LIST_JSON);
const rawApeswapData = fs.readFileSync(APESWAP_MASTER_LIST_JSON);

const UNISWAP = JSON.parse(rawUniswapData);
const SUSHISWAP = JSON.parse(rawSushiswapData);
const QUICKSWAP = JSON.parse(rawQuickswapData);
const APESWAP = JSON.parse(rawApeswapData);

const data = [UNISWAP, SUSHISWAP, QUICKSWAP, APESWAP];

const getArrayLengths = () => {
  let totalPools = 0;

  for (let i = 0; i < data.length; i++) {
    totalPools += data[i].pairs.length;
  }

  console.log(
    `
____________________________________________________
|                                                                                                      
|  Total Pools/Pairs: ${totalPools}                           
|                                                   
|  Uniswap Pools/Pairs: ${UNISWAP.pairs.length}           
|  Sushiswap Pools/Pairs: ${SUSHISWAP.pairs.length}       
|  Quickswap Pools/Pairs: ${QUICKSWAP.pairs.length}       
|  Apeswap Pools/Pairs: ${APESWAP.pairs.length}           
|                                                   
|___________________________________________________
`
  );
};

module.exports = getArrayLengths;
