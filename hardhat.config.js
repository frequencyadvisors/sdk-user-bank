require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config({ path: ".env" });

module.exports = {
  solidity: "0.8.22",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://localhost:7545",
      chainId: 1337
    },
    bepolia: {
      url: "https://bepolia.rpc.berachain.com",
      chainId: 80069,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    }
  }
};