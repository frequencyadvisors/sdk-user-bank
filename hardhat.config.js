require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");

module.exports = {
  solidity: "0.8.22",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://localhost:7545",
      chainId: 1337
    }
    // add testnet/mainnet config here if needed
  }
};