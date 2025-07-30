const hre = require("hardhat");

async function main() {
    const name = "RevocableNFT";
    const symbol = "RNFT";

    const RevocableNFT = await hre.ethers.getContractFactory("RevokableMembershipNFT");
    const contract = await RevocableNFT.deploy(name, symbol);
    await contract.waitForDeployment(); // ✅ Use this in Hardhat v2.17+

    console.log("✅ Contract deployed to:", await contract.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});