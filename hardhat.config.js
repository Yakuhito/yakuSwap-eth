require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

require("./tasks/faucet");
module.exports = {
  solidity: {
    version: "0.8.7",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      }
    }
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    coinmarketcap: require('dotenv').config().parsed.COINMARKETCAP_API_KEY,
    gasPrice: 100
  }
};
