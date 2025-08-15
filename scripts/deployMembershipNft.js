const hre = require("hardhat");

async function main() {
    const name = "RevocableNFT";
    const symbol = "RNFT";

    const RevocableNFT = await hre.ethers.getContractFactory("RevokableMembershipNFT");
    const contract = await RevocableNFT.deploy(name, symbol);
    await contract.waitForDeployment(); // ✅ Use this in Hardhat v2.17+

    console.log("✅ Contract deployed to:", await contract.getAddress());

    const bence = "0x9EB4B6861e2470F5CbB6EBe62F3476a1D45Ec0C9"; 
    const hiren = "0xCA567B480a90F3ccb4888EBdCD78BC29dBf7047d";
    const kirsty = "0x61b33e2b591202d68A3ac4950F1687A0f67E2d80";
    const toba = "0x4950b897348004B8b2bFF1D37788147F9612bd56"; 
    const pasquale = "0x766E360ce143a4959396Dd5DbBA2808F8092D6f9";
    const nish = "0xF5abbD37397E8dB85A25E5De472a932807Cb4220"; 
    const ade_1 = "0xF50EA4041C38Ddc5A4181155975eA1d797A163dB";
    const ade_2 = "0x0339C73583636dB77f6eC8F7a9d2c922b329E697";
    const ade_3 = "0x35e35a48d3b6edd3E91DB2C70887e0B6D1339989"; 
    const iqra = "0x3CEDad48A59e2Be2Be8FF22F494F316e34b4DEC5";

    const auth0WalletAddresses = [bence, hiren, kirsty, toba, pasquale, nish, ade_1, ade_2, ade_3, iqra]; 
    const [owner] = await hre.ethers.getSigners();

    auth0WalletAddresses.forEach(async (address) => {
        const tx = await contract.connect(owner).mint(1, address, "write:admin", 0, true);
        const receipt = await tx.wait(1);
        console.log(`Minting transaction successful for ${address}: ${receipt.status === 1}`);

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

        const membership = await contract.viewMembership(tokenId);
        console.log(`Membership minted: membership ${membership.membershipType} to ${membership.user} with token ID ${membership.tokenId}`);
        console.log(`is transferable: ${membership.transferable}, expiration: ${membership.expiration}`);
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});