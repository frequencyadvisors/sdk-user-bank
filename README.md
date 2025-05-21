# UserBank Smart Contract Project

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