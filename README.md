# UserBank Smart Contract Project

#### Description
### store project guid and wallet address onchain
#### This project is a simple smart contract that allows users to store their project GUID and wallet address on the Ethereum blockchain. It provides a basic interface for adding, retrieving


## Prerequisites

- Node.js (v16 or later)
- npm
- Hardhat

## Setup

1. Clone the repository and navigate to the project directory.

2. Install dependencies:

npm install

## Running Tests

To run all tests:

npx hardhat test

To run tests in a specific file:
npx hardhat test test/YourTestFile.js

## Deploying the Contract (Local Network)

1. Start a local Hardhat node in a separate terminal:

npx hardhat node


2. Deploy the contract:

In another terminal, run:

npx hardhat run --network localhost scripts/deploy.js