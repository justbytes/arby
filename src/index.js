require("dotenv").config({ path: "../.env" });
const { WebSocketProvider, ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const computer = new WebSocket("ws://127.0.0.1:8000");
const PROVIDER = new WebSocketProvider(process.env.POLYGON_WS); // Can only handle 200 listeners at a given time

/**
 * Import contract ABI's
 */
const {
  abi: IUniswapV3PoolABI,
} = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");
const {
  abi: UniSwapV2PairABI,
} = require("@uniswap/v2-periphery/build/IUniswapV2Pair.json");

/**   Configure JSON data so it can be read properly
_________________________________________________________
 */
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
/**
___________________________________________________________
 */

/**
 * Activate listeners for a pool address that uses the v3 Uniswap fork
 */
const activateV3Listener = async (targetAddress) => {
  let poolContract;

  // Connect to an instance of the pools contract
  //
  try {
    poolContract = new ethers.Contract(
      targetAddress,
      IUniswapV3PoolABI,
      PROVIDER
    );
  } catch (error) {
    console.log(
      "*********    ERROR when connecting to poolContract | activateV3Listener() index.js    *********\n",
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
        tick,
        event
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

        // Check to see if there are similiar pools, if there is more than two similar pools
        // send the pools over the websocket
        //
        let similarPairs = await getSimilarPairs(targetAddress);

        // Arbitrage requires at least 2 pairs in order to run a trade
        //
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
};

/**
 * Activate listeners for a pair address that uses the v2 Uniswap fork
 */
const activateV2Listener = async (targetAddress) => {
  let pairContract;

  // Connect to an instance of the pairs contract
  //
  try {
    pairContract = new ethers.Contract(
      targetAddress,
      UniSwapV2PairABI,
      PROVIDER
    );
  } catch (error) {
    console.log(
      "*********    ERROR when connecting to pairContract | activateV2Listener() index.js   *********\n",
      error
    );
  }

  // Subscribe to the pairs swap event
  //
  try {
    pairContract.on(
      "Swap",
      async (sender, amount0In, amount1In, amount0Out, amount1Out, to) => {
        console.log(`*********   V2 SWAP EVENT TRIGGERED    *********
                Sender: ${sender}
                Amount0In: ${amount0In}
                Amount1In: ${amount1In}
                Amount0Out: ${amount0Out}
                Amount1Out: ${amount1Out}
                To: ${to}
                `);

        // Check to see if there are similiar pairs, if there is more than two similar pairs
        // send the pairs over the websocket
        //
        let similarPairs = await getSimilarPairs(targetAddress);

        // Arbitrage requires at least 2 pairs in order to run a trade
        //
        if (similarPairs.length > 1) {
          computer.send(JSON.stringify(similarPairs));
          console.log("Data sent to local websocket server.");
        } else {
          console.log("Not enough pairs for arbitrage!!!");
        }
      }
    );
  } catch (error) {
    console.log(
      "*********    ERROR WITH CONTRACT SWAP LISTENER    *********\n",
      error
    );
  }
};

/**
 * Loop through each dex and find the token0 and token1 address, then loop back through finding
 * any similiar pairs and return them back to the function that called
 */
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

  console.log(JSON.stringify(similarPairs, null, 2));

  return similarPairs;
};

/**
 * Deactivate all listeners for the v3 Uniswap forks
 *  - TODO: still needs to be implemented!!!
 */
const deactivateV3Listener = async (tokenPair) => {
  let poolContract;
  try {
    poolContract = new ethers.Contract(tokenPair, IUniswapV3PoolABI, provider);
  } catch (error) {
    console.log(
      "*********    ERROR when connecting to poolContract | index.js    *********\n",
      error
    );
  }

  poolContract.removeAllListeners();
};

/**
 * Deactivate all listeners for the v2 Uniswap forks
 *  - TODO: still needs to be implemented!!!
 */
const deactivateV2Listener = async (tokenPair) => {
  let pairContract;
  try {
    pairContract = new ethers.Contract(tokenPair, UniSwapV2PairABI, provider);
  } catch (error) {
    console.log(
      "*********    ERROR when connecting to pairContract | index.js    *********\n",
      error
    );
  }

  pairContract.removeAllListeners();
};

/**
 * Safely stop all listeners for each exchange
 */
const stopListeners = () => {
  const dexs = [UNISWAP, SUSHISWAP, QUICKSWAP, APESWAP];

  // loop through each dex and add matching pairs
  for (let i = 0; i < dexs.length; i++) {
    let dex = dexs[i];

    for (let j = 0; j < dex.length; j++) {
      let pair = dex[j].pairs[j];
      let pairAddress = pair.id;
      let version = pair.v3;

      if (version == true) {
        deactivateV3Listener(pairAddress);
      } else {
        deactivateV2Listener(pairAddress);
      }
    }
  }
  console.log("*********    ALL LISTENERS DEACTIVEATED    *********");
};

/**
 * Activates the listeners for swap events using the data from the fetchers in ../fetchers/index.js
 */
const main = () => {
  let exchange, pairs;
  // Dex data coming from JSON files
  //
  const dexs = [UNISWAP, SUSHISWAP, QUICKSWAP, APESWAP];

  // loop through each Dex
  //
  for (let i = 0; i < dexs.length; i++) {
    exchange = dexs[i];
    pairs = exchange.pairs;

    // Loop through each pair within that dex
    //
    for (let j = 0; j < pairs.length; j++) {
      let pair = pairs[j];
      let targetAddress = pair.id;
      let targetVersion = pair.v3;

      // Activate the listener
      if (targetVersion == true) {
        activateV3Listener(targetAddress);
      } else {
        activateV2Listener(targetAddress);
      }
    }
  }
  console.log("*********    ALL LISTENERS ACTIVE    *********");
};

main();

//stopListeners();
