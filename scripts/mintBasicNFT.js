// scripts/mintBasicNFT.js
const { ethers } = require("hardhat");

async function main() {
    const contractAddress = "0x94eC85B4b5163002D3E1c144D94BDc5A097C818f";
    const BasicNFT = await ethers.getContractAt("BasicNFT", contractAddress);

    const [owner] = await ethers.getSigners();
    const to = owner.address;
    const duration = 60 * 60 * 24 * 30; // 30 days in seconds

    const tx = await BasicNFT.mint(to, duration);
    const receipt = await tx.wait();
    if (!receipt.status) {
        throw new Error("Transaction failed");
    }
    console.log(`Minting transaction successful: ${receipt}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});