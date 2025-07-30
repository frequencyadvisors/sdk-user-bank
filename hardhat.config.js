require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config({ path: ".env" });
require("hardhat-contract-sizer")


module.exports = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
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
    },
    zeeve: {
        url: "https://rpc.frequency.zeeve.net",
        chainId: 53716,
        accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    }
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: false,
    strict: true,
  }
};