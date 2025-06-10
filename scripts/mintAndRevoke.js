const hre = require("hardhat");

async function main() {
    // Replace this with your deployed contract address
    const contractAddress = "0xFA59A8cB7Bc3E53DEFf88744631a1B129B0A4B0F";

    // Get contract factory and attach to deployed address
    const MembershipNFT = await hre.ethers.getContractFactory("MembershipNFT");
    const contract = await MembershipNFT.attach(contractAddress);

    // Create a random wallet (this address won't have a private key locally!)
    const randomWallet = hre.ethers.Wallet.createRandom();
    const randomAddress = randomWallet.address;

    console.log("📦 Minting NFT to:", randomAddress);

    // Mint NFT to the random address
    const mintTx = await contract.mint(randomAddress, "golden-ticket", 80600);
    await mintTx.wait();
    const nextTokenIdBN = await contract.nextTokenId();

    console.log(nextTokenIdBN)

    const tokenId = BigInt(nextTokenIdBN.toString()) - 1n;

    console.log(`✅ Minted token ID ${tokenId} to ${randomAddress}`);

    // Revoke the NFT
    console.log("❌ Revoking token...");
    const revokeTx = await contract.revoke(tokenId);
    await revokeTx.wait();

    console.log(`✅ Token ID ${tokenId} revoked`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});