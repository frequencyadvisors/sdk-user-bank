// scripts/mintBasicNFT.js
const { ethers } = require("hardhat");

async function main() {
    const contractAddress = "0xb08e098D9F3CBAa3B909Ff1A2955C26f30764F35";
    const RevocableNFT = await ethers.getContractAt("RevokableMembershipNFT", contractAddress);

    const [owner] = await ethers.getSigners();

    const projectId = 1;
    const to = "0x61b33e2b591202d68A3ac4950F1687A0f67E2d80"; // auth0 wallet address
    const membershipType = "write:admin" // grant minting and revoking rights
    const expiration = 0;
    const transferable = true; 

    const tx = await RevocableNFT.connect(owner).mint(projectId, to, membershipType, expiration, transferable);
    const receipt = await tx.wait(1);

    console.log(`Minting transaction successful: ${receipt.status === 1}`);

    const tokenId = receipt.logs[0].args[2];

    const membership = await RevocableNFT.viewMembership(tokenId);
    console.log(`Membership minted: membership ${membership.membershipType} for project ${membership.projectId} to ${membership.user} with token ID ${membership.tokenId}`);
    console.log(`is transferable: ${membership.transferable}, expiration: ${membership.expiration}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});