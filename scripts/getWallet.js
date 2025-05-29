const { ethers, upgrades } = require("hardhat");

async function main() {

    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, new ethers.JsonRpcProvider("https://bepolia.rpc.berachain.com/"));

    const contract = new ethers.Contract("0x3a501DCc5195AA0576e6F3dFc8B0d054F1ABB168", [{
        "inputs": [
            {
                "internalType": "string",
                "name": "addr",
                "type": "string"
            }
        ],
        "name": "getProjectGuid",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }], signer);

    console.log(await contract.getProjectGuid("0xE83ffdF465465725bA38993B708964fBe156cb16"));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});