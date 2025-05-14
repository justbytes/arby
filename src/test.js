require("dotenv").config({ path: "../.env" });
const { AlchemyProvider, WebSocketProvider, ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const computer = new WebSocket("ws://127.0.0.1:8000");

const provider = new WebSocketProvider(process.env.POLYGON_WS);

const targetAddress = "0xdac8a8e6dbf8c690ec6815e0ff03491b2770255d";

const {
  abi: IUniswapV3PoolABI,
} = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");

const {
  abi: UniSwapV2PairABI,
} = require("@uniswap/v2-periphery/build/IUniswapV2Pair.json");

const UNISWAP_JSON = path.join(
  __dirname,
  "../data/uniswap/uniswap_master_list.json"
);
const SUSHISWAP_JSON = path.join(
  __dirname,
  "../data/sushiswap/sushiswap_master_list.json"
);
const QUICKSWAP_JSON = path.join(
  __dirname,
  "../data/quickswap/quickswap_master_list.json"
);
const APESWAP_JSON = path.join(
  __dirname,
  "../data/apeswap/apeswap_master_list.json"
);

const rawUniswap = fs.readFileSync(UNISWAP_JSON);
const rawSushiswap = fs.readFileSync(SUSHISWAP_JSON);
const rawQuickswap = fs.readFileSync(QUICKSWAP_JSON);
const rawApeswap = fs.readFileSync(APESWAP_JSON);

const UNISWAP = JSON.parse(rawUniswap);
const SUSHISWAP = JSON.parse(rawSushiswap);
const QUICKSWAP = JSON.parse(rawQuickswap);
const APESWAP = JSON.parse(rawApeswap);

async function main() {
  //console.log(await provider.getBlockNumber());

  let poolContract;

  // Connect to an instance of the pools contract
  //
  try {
    poolContract = new ethers.Contract(
      targetAddress,
      IUniswapV3PoolABI,
      provider
    );
  } catch (error) {
    console.log(
      "*********    ERROR when connecting to poolContract | index.js    *********\n",
      error
    );
  }

  // Subscribe to the pools swap event
  //
  try {
    poolContract.on(
      "Swap",
      async (
        sender,
        recipient,
        amount0,
        amount1,
        sqrtPriceX96,
        liquidity,
        tick
      ) => {
        console.log(`*********   V3 SWAP EVENT TRIGGERED    *********
                Sender: ${sender}
                Recipient: ${recipient},
                Amount0: ${amount0}
                Amount1: ${amount1}
                sqrtPriceX96: ${sqrtPriceX96}
                Liquidity: ${liquidity}
                Tick: ${tick}
                `);
        let similarPairs = await getSimilarPairs(targetAddress);

        if (similarPairs.length > 1) {
          computer.send(JSON.stringify(similarPairs));
          console.log("Data sent to local websocket server.");
        } else {
          console.log("Not enough pools for arbitrage!!!");
        }
      }
    );
  } catch (error) {
    console.log(
      "*********    ERROR WITH CONTRACT SWAP LISTENER    *********\n",
      error
    );
  }
}

const getSimilarPairs = async (targetAddress) => {
  console.log("*********    GETTING SIMILAR PAIRS    *********");
  // Dex data coming from JSON files
  //
  const dexs = [UNISWAP, SUSHISWAP, QUICKSWAP, APESWAP];
  let exchange, dexName, v3Addresses, v2Addresses, pairs, token0, token1;
  let similarPairs = [];

  // Loop through the exchanges and find the token data by finding the matching token pair address
  //
  for (let i = 0; i < dexs.length; i++) {
    exchange = dexs[i];
    pairs = exchange.pairs;
    for (let j = 0; j < pairs.length; j++) {
      let pair = pairs[j];

      if (targetAddress === pair.id) {
        token0 = pair.token0;
        token1 = pair.token1;
        console.log(token0, token1);
        break;
      }
    }
  }

  // Loop back through the exchanges and find any matching pairs
  //
  for (let i = 0; i < dexs.length; i++) {
    exchange = dexs[i];
    dexName = exchange.dex;
    v3Addresses = exchange.address.v3;
    v2Addresses = exchange.address.v2;
    pairs = exchange.pairs;

    for (let j = 0; j < pairs.length; j++) {
      let pair = pairs[j];

      // Add a matching pair to the similarPairs list including the exchange data based on version 2 or 3
      //
      if (token0.id === pair.token0.id && token1.id === pair.token1.id) {
        if (pair.v3 === true) {
          similarPairs.push({ dexName, dexAddresses: v3Addresses, pair });
        } else {
          similarPairs.push({ dexName, dexAddresses: v2Addresses, pair });
        }
      }

      // Check to see if the token0 or token1 are swapped
      //
      if (token0.id === pair.token1.id && token1.id === pair.token0.id) {
        console.log("This pair was reversed!");
        if (pair.v3 === true) {
          similarPairs.push({ dexName, dexAddresses: v3Addresses, pair });
        } else {
          similarPairs.push({ dexName, dexAddresses: v2Addresses, pair });
        }
      }
    }
  }

  console.log(
    `*********    Found ${similarPairs.length} similar pairs.    *********`
  );

  return similarPairs;
};

main();
