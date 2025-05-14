const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8001 });

wss.on("connection", (ws) => {
  console.log("New connection was made to trader websocket!");

  // Listen for a messeage that should be coming from the computer websocket - ./computer.js
  //
  ws.on("message", async (data) => {
    console.log("Trader websocket recieved data");
    var busy = false;

    //TODO: The data might already be parsed but this needs to be verified
    //
    let trade = data.toString();
    let jsonTrade = JSON.parse(trade);
    console.log(jsonTrade);

    // Check to see if there is currently a trade being performed
    // If there is the current jsonTrade should be cached and then attempted if its been within a minute since it was cached
    //
    if (!busy) {
      // Set busy to true so we don't call attempt to multiple times while its currently processing
      //
      busy = true;

      // Attemp to trade
      //
      // TODO: TRADE LOGIC HERE

      if (trade) {
        console.log("A successfull trade was made.");
      } else {
        console.log("Trade wasn't profitable...");
      }

      // Set busy to false so we can perform another trade
      //
      busy = false;
    } else {
      console.log("Currently trading...");
    }
  });

  ws.on("close", () => {
    console.log("Socket disconnected!");
  });
});

console.log("WebSocket server started on ws://localhost:8001");
