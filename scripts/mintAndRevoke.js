const hre = require("hardhat");

async function main() {
    // Replace this with your deployed contract address
    const contractAddress = "0xEa651e5cc57036D92FB1a00d6533975d44183AE5";

    // Get contract factory and attach to deployed address
    const MembershipNFT = await hre.ethers.getContractFactory("MembershipNFT");
    const contract = await MembershipNFT.attach(contractAddress);

    // Create a random wallet (this address won't have a private key locally!)
    const randomWallet = hre.ethers.Wallet.createRandom();
    const randomAddress = randomWallet.address;

    console.log("📦 Minting NFT to:", randomAddress);

    for (let i = 0; i < 5; i++) {
        // Mint NFT to the random address
        const mintTx = await contract.mint("0xF5abbD37397E8dB85A25E5De472a932807Cb4220", "golden-ticket", 80600);
        const receipt = await mintTx.wait();

        console.log("Transaction receipt:", receipt);
        console.log("Transaction status:", receipt.status);
    }
    // console.log("Logs:", receipt.logs);

    // Parse and print all contract events from the receipt
    // for (const log of receipt.logs) {
    //     try {
    //         const parsed = contract.interface.parseLog(log);
    //         console.log("Event:", parsed);
    //     } catch (e) {
    //         // Not a log from this contract, skip
    //     }
    // }

    // console.log(mintTx)

    // const nextTokenIdBN = await contract.nextTokenId();
    //
    // console.log(nextTokenIdBN)
    //
    // const tokenId = BigInt(nextTokenIdBN.toString()) - 1n;
    //
    // console.log(`✅ Minted token ID ${tokenId} to ${randomAddress}`);
    //
    // // Revoke the NFT
    // console.log("❌ Revoking token...");
    // const revokeTx = await contract.revoke(tokenId);
    // await revokeTx.wait();
    //
    // console.log(`✅ Token ID ${tokenId} revoked`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

