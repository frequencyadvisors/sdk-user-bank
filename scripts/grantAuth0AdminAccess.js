// scripts/mintBasicNFT.js
const { ethers } = require("hardhat");

async function main() {
    const contractAddress = "0x9d7784a4221410d67564bE7118d00961B33DE581";
    const RevocableNFT = await ethers.getContractAt("RevokableMembershipNFT", contractAddress);

    const [owner] = await ethers.getSigners();

    const projectId = 0;
    const to = "0x61b33e2b591202d68A3ac4950F1687A0f67E2d80"; // auth0 wallet address
    const membershipType = "write:admin" // grant minting and revoking rights
    const expiration = 0;
    const transferable = true; 

    const tx = await RevocableNFT.connect(owner).mint(projectId, to, membershipType, expiration, transferable);
    const receipt = await tx.wait(1);

    console.log(`Minting transaction successful: ${receipt.status === 1}`);

        const transferEvent = receipt.logs
        .map(log => {
            try {
            return RevocableNFT.interface.parseLog(log);
            } catch {
            return null;
            }
        })
        .filter(Boolean)
        .find(e => e.name === "Transfer");

        const tokenId = transferEvent?.args.tokenId;
        console.log("Minted token ID:", tokenId.toString());


        const membership = await RevocableNFT.viewMembership(tokenId);
        console.log(`Membership minted: membership ${membership.membershipType} to ${membership.user} with token ID ${membership.tokenId}`);
        console.log(`is transferable: ${membership.transferable}, expiration: ${membership.expiration}`);
    }


main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});