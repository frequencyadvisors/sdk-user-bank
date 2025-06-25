// scripts/mintERC1155.js
const { ethers } = require("hardhat");

async function main() {
    const [owner] = await ethers.getSigners();
    const contractAddress = "0x5C964B962bBB2A95254E973F8ED45B89Ad212d92";
    const SimpleERC1155 = await ethers.getContractAt("SimpleERC1155", contractAddress);

    const to = "0xF5abbD37397E8dB85A25E5De472a932807Cb4220";
    const id = 1; // token id
    const amount = 1; // number of tokens to mint
    const data = "0x"; // usually empty

    const tx = await SimpleERC1155.mint(to, id, amount, data);
    await tx.wait();

    console.log(`Transaction successful: ${tx.hash}`);

    console.log(`Minted ${amount} of token id ${id} to ${to}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});