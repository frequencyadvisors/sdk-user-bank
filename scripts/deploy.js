const { ethers, upgrades } = require("hardhat");

async function main() {
    const UserBank = await ethers.getContractFactory("UserBank");
    const userBank = await upgrades.deployProxy(UserBank, [], {
        initializer: "initialize",
        kind: "uups",
    });

    await userBank.waitForDeployment();

    console.log("UserBank Proxy deployed to:", await userBank.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});