const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8000 });

const computeTrade = require("../src/logic/tradeComputer");
//const trader = new WebSocket("ws://localhost:8001");

let busy = false;

wss.on("connection", (ws) => {
  console.log("New connection was made to computer websocket!");

  // Listen for a messeage that should be coming from the listener - ../src/index.js
  //
  ws.on("message", async (data) => {
    console.log("Trade computer websocket recieved data");

    //Convert and parse data sent from listener
    //
    let pairs = data.toString();
    let jsonPairs = JSON.parse(pairs);
    console.log(jsonPairs.length, busy);

    // Check to see if there is currently a pair being checked for profitablity
    //
    if (!busy) {
      // Set busy to true so we don't call checkForProfitableTrade multiple times while its processing
      //
      busy = true;

      // Check for a profitable trade
      //
      let trade = await computeTrade(jsonPairs);

      if (trade) {
        console.log("A successfull trade was made.");
        // TODO: send trades to trader websocket
      }

      // Set busy to false so we can check another trade
      //
      busy = false;
    } else {
      console.log("Currently computing a pool/pair...");
    }
  });

  ws.on("close", () => {
    console.log("Socket disconnected!");
  });
});

console.log("WebSocket server started on ws://localhost:8000");
