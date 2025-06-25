// scripts/deployBasicNFT.js
const { ethers } = require("hardhat");

async function main() {
    const name = "BasicNFT";
    const symbol = "BNFT";
    const baseTokenURI = "https://example.com/metadata/";

    const BasicNFT = await ethers.getContractFactory("BasicNFT");
    const contract = await BasicNFT.deploy(name, symbol, baseTokenURI);
    await contract.waitForDeployment();

    console.log("BasicNFT deployed to:", await contract.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});