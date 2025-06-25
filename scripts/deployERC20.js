const { ethers } = require("hardhat");

async function main() {
    const name = "FreeqERC20";
    const symbol = "FERC20";

    const SimpleERC20 = await ethers.getContractFactory("SimpleERC20");
    const contract = await SimpleERC20.deploy(name, symbol);
    await contract.waitForDeployment();

    console.log("SimpleERC20 deployed to:", await contract.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});