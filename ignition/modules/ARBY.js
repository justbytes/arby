//
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("LockModule", (m) => {
  const arby = m.contract("ARBY", [
    "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
  ]);

  console.log(arby);
  return { arby };
});

// wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, this.provider);
//const hre = require("hardhat");

// async function main() {
//   const ARBY = await hre.ethers.getContractFactory("ARBY");
//   const arby = await ARBY.deploy("0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb");

//   await arby.waitForDeployment();
//   console.log("Flash Loan contract deployed: ", arby.target);
// }

// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
