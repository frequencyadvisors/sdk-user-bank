const { ethers } = require("hardhat");

async function main() {
    const contractAddress = "0x7B2b3f47d280E9b74911dD31054f5D7Cb35263Ab";
    const SimpleERC20 = await ethers.getContractAt("SimpleERC20", contractAddress);

    const [owner] = await ethers.getSigners();
    const to = '0xF5abbD37397E8dB85A25E5De472a932807Cb4220';
    const amount = ethers.parseUnits("1000", 18); // Mint 1000 tokens (18 decimals)

    const tx = await SimpleERC20.mint(to, amount);
    await tx.wait();

    console.log(`Minted ${amount} tokens to ${to}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});