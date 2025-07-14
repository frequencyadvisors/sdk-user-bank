const { ethers } = require("hardhat");

async function main() {
    const SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
    const uri = "https://example.com/api/{id}.json";
    const contract = await SimpleERC1155.deploy(uri);
    await contract.waitForDeployment();
    console.log("SimpleERC1155 deployed to:", contract);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});