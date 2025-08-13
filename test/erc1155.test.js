const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("SimpleERC1155", function () {
    let erc1155;
    let owner;
    let user1;
    let user2;
    let user3;
    let addrs;

    const BASE_URI = "https://example.com/metadata/{id}.json";
    const TOKEN_ID_1 = 1;
    const TOKEN_ID_2 = 2;
    const TOKEN_ID_3 = 3;
    const AMOUNT_10 = 10;
    const AMOUNT_100 = 100;
    const EMPTY_DATA = "0x";
    const TRANSFERABLE = true;
    const NON_TRANSFERABLE = false;

    beforeEach(async function () {
        [owner, user1, user2, user3, ...addrs] = await ethers.getSigners();

        const SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
        erc1155 = await SimpleERC1155.deploy(BASE_URI);
        await erc1155.waitForDeployment();
    });

    describe("constructor", function () {
        it("Should set the correct URI", async function () {
            expect(await erc1155.uri(TOKEN_ID_1)).to.equal(BASE_URI);
        });

        it("Should set the correct owner", async function () {
            expect(await erc1155.owner()).to.equal(owner.address);
        });

        it("Should handle empty URI", async function () {
            const emptyContract = await (await ethers.getContractFactory("SimpleERC1155")).deploy("");
            expect(await emptyContract.uri(TOKEN_ID_1)).to.equal("");
        });

        it("Should handle very long URI", async function () {
            const longURI = "https://example.com/" + "a".repeat(1000) + "/{id}.json";
            const longContract = await (await ethers.getContractFactory("SimpleERC1155")).deploy(longURI);
            expect(await longContract.uri(TOKEN_ID_1)).to.equal(longURI);
        });
    });

    describe("mint", function () {
        describe("Access Control", function () {
            it("Should allow owner to mint", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await expect(erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA))
                    .to.emit(erc1155, "TransferSingle")
                    .withArgs(owner.address, ethers.ZeroAddress, user1.address, TOKEN_ID_1, AMOUNT_10);
            });

            it("Should reject minting from non-owner", async function () {
                const futureTime = (await time.latest()) + 3600;

                await expect(erc1155.connect(user1).mint(user2.address, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA))
                    .to.be.revertedWithCustomError(erc1155, "OwnableUnauthorizedAccount")
                    .withArgs(user1.address);
            });

            it("Should reject minting after ownership transfer by previous owner", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await erc1155.transferOwnership(user1.address);
                
                await expect(erc1155.mint(user2.address, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA))
                    .to.be.revertedWithCustomError(erc1155, "OwnableUnauthorizedAccount")
                    .withArgs(owner.address);
            });

            it("Should allow new owner to mint after ownership transfer", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await erc1155.transferOwnership(user1.address);
                
                await expect(erc1155.connect(user1).mint(user2.address, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA))
                    .to.emit(erc1155, "TransferSingle");
            });
        });

        describe("Input Validation", function () {
            it("Should reject minting to zero address", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await expect(erc1155.mint(ethers.ZeroAddress, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA))
                    .to.be.revertedWith("Cannot mint to the zero address");
            });

            it("Should reject token ID of zero", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await expect(erc1155.mint(user1.address, 0, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA))
                    .to.be.revertedWith("Token ID must be greater than zero");
            });

            it("Should reject amount of zero", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await expect(erc1155.mint(user1.address, TOKEN_ID_1, 0, futureTime, TRANSFERABLE, EMPTY_DATA))
                    .to.be.revertedWith("Amount must be greater than zero");
            });
            });

            it("Should accept maximum token ID", async function () {
                const futureTime = (await time.latest()) + 3600;
                const maxTokenId = ethers.MaxUint256;
                
                await expect(erc1155.mint(user1.address, maxTokenId, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA))
                    .to.emit(erc1155, "TransferSingle");
            });

            it("Should accept maximum amount", async function () {
                const futureTime = (await time.latest()) + 3600;
                const maxAmount = ethers.MaxUint256;
                
                await expect(erc1155.mint(user1.address, TOKEN_ID_1, maxAmount, futureTime, TRANSFERABLE, EMPTY_DATA))
                    .to.emit(erc1155, "TransferSingle");
            });

            it("Should accept zero expiration (no expiry)", async function () {
                await expect(erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, 0, TRANSFERABLE, EMPTY_DATA))
                    .to.emit(erc1155, "TransferSingle");
            });

            it("Should accept maximum expiration timestamp", async function () {
                const maxTimestamp = ethers.MaxUint256;
                
                await expect(erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, maxTimestamp, TRANSFERABLE, EMPTY_DATA))
                    .to.emit(erc1155, "TransferSingle");
            });

            it("Should handle large data payload", async function () {
                const futureTime = (await time.latest()) + 3600;
                const largeData = "0x" + "a".repeat(2000); // 1000 bytes
                
                await expect(erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, largeData))
                    .to.emit(erc1155, "TransferSingle");
            });
        });

        describe("Metadata Storage", function () {
            it("Should store transferable token metadata correctly", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA);
                
                const metadata = await erc1155.getMetadata(TOKEN_ID_1);
                expect(metadata.exists).to.be.true;
                expect(metadata.expiration).to.equal(futureTime);
                expect(metadata.transferable).to.be.true;
            });

            it("Should store non-transferable token metadata correctly", async function () {
                const futureTime = (await time.latest()) + 3600;

                await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, futureTime, NON_TRANSFERABLE, EMPTY_DATA);

                const metadata = await erc1155.getMetadata(TOKEN_ID_1);
                expect(metadata.exists).to.be.true;
                expect(metadata.expiration).to.equal(futureTime);
                expect(metadata.transferable).to.be.false;
            });

            it("Should store token balance correctly", async function () {
                const futureTime = (await time.latest()) + 3600;

                await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, futureTime, NON_TRANSFERABLE, EMPTY_DATA);

                expect(await erc1155.balanceOf(user1.address, TOKEN_ID_1)).to.equal(AMOUNT_10);
            });

            it("Should handle multiple tokens for same user", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA);
                await erc1155.mint(user1.address, TOKEN_ID_2, AMOUNT_100, futureTime, NON_TRANSFERABLE, EMPTY_DATA);
                
                expect(await erc1155.balanceOf(user1.address, TOKEN_ID_1)).to.equal(AMOUNT_10);
                expect(await erc1155.balanceOf(user1.address, TOKEN_ID_2)).to.equal(AMOUNT_100);
            });

            it("Should handle same token ID for different users", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA);
                await erc1155.mint(user2.address, TOKEN_ID_1, AMOUNT_100, futureTime, NON_TRANSFERABLE, EMPTY_DATA);
                
                expect(await erc1155.balanceOf(user1.address, TOKEN_ID_1)).to.equal(AMOUNT_10);
                expect(await erc1155.balanceOf(user2.address, TOKEN_ID_1)).to.equal(AMOUNT_100);
            });

            it("Should handle multiple mints of same token to same user", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA);
                await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, futureTime, NON_TRANSFERABLE, EMPTY_DATA);
                
                expect(await erc1155.balanceOf(user1.address, TOKEN_ID_1)).to.equal(AMOUNT_10 + AMOUNT_10);
            });
            it("should handle minting with zero expiration", async function () {    
                
                await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, 0, TRANSFERABLE, EMPTY_DATA);

                const metadata = await erc1155.getMetadata(TOKEN_ID_1);
                expect(metadata.expiration).to.equal(0); // No expiration
                expect(metadata.transferable).to.be.true;
            });
            it("should handle minting with maximum expiration", async function () {
                const maxExpiration = ethers.MaxUint256;
                
                await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, maxExpiration, TRANSFERABLE, EMPTY_DATA);

                const metadata = await erc1155.getMetadata(TOKEN_ID_1);
                expect(metadata.expiration).to.equal(maxExpiration);
                expect(metadata.transferable).to.be.true;
            });
        });

        describe("Balance Updates", function () {
            it("Should update balance correctly for new token", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                expect(await erc1155.balanceOf(user1.address, TOKEN_ID_1)).to.equal(0);
                
                await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA);
                
                expect(await erc1155.balanceOf(user1.address, TOKEN_ID_1)).to.equal(AMOUNT_10);
            });

            it("Should accumulate balance for additional mints", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA);
                await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_100, futureTime, TRANSFERABLE, EMPTY_DATA);
                
                expect(await erc1155.balanceOf(user1.address, TOKEN_ID_1)).to.equal(AMOUNT_10 + AMOUNT_100);
            });
        });
    

    describe("_setTokenMetadata", function () {
        // This is an internal function, so we test it indirectly through mint
        describe("Metadata Creation", function () {

            it("Should handle different token IDs with same base URI", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA);
                await erc1155.mint(user1.address, TOKEN_ID_2, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA);
                
                expect(await erc1155.uri(TOKEN_ID_1)).to.equal(BASE_URI);
                expect(await erc1155.uri(TOKEN_ID_2)).to.equal(BASE_URI);
            });

            it("Should handle metadata overwrites for same token ID", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                // First mint
                await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA);
                expect(await erc1155.balanceOf(user1.address, TOKEN_ID_1)).to.equal(AMOUNT_10);

                const metadataBefore = await erc1155.getMetadata(TOKEN_ID_1);
                expect(metadataBefore.exists).to.equal(true);
                expect(metadataBefore.expiration).to.equal(futureTime);
                expect(metadataBefore.transferable).to.equal(TRANSFERABLE);
                
                await erc1155.updateMetadata(TOKEN_ID_1, 0, NON_TRANSFERABLE);
                const metadataAfter = await erc1155.getMetadata(TOKEN_ID_1);
                expect(metadataAfter.exists).to.equal(true);
                expect(metadataAfter.expiration).to.equal(0);
                expect(metadataAfter.transferable).to.equal(NON_TRANSFERABLE);
            });
        });
    });

    describe("_update", function () {
        beforeEach(async function () {
            const futureTime = (await time.latest()) + 3600;
            await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_100, futureTime, TRANSFERABLE, EMPTY_DATA); // transferable
            await erc1155.mint(user1.address, TOKEN_ID_2, AMOUNT_100, futureTime, NON_TRANSFERABLE, EMPTY_DATA);  // non-transferable
            await erc1155.mint(user1.address, TOKEN_ID_3, AMOUNT_100, futureTime, TRANSFERABLE, EMPTY_DATA); // transferable
            await erc1155.mint(user2.address, TOKEN_ID_3, AMOUNT_100, futureTime, TRANSFERABLE, EMPTY_DATA); // transferable
        });

        describe("Regular User Transfers", function () {
            it("Should allow transfer of transferable tokens", async function () {
                await expect(erc1155.connect(user1).safeTransferFrom(user1.address, user2.address, TOKEN_ID_1, AMOUNT_10, EMPTY_DATA))
                    .to.emit(erc1155, "TransferSingle");
            });

            it("Should prevent transfer of non-transferable tokens", async function () {
                await expect(erc1155.connect(user1).safeTransferFrom(user1.address, user2.address, TOKEN_ID_2, AMOUNT_10, EMPTY_DATA))
                    .to.be.revertedWith(`token id ${TOKEN_ID_2} is non-transferable`);
            });

            it("Should prevent partial transfer of non-transferable tokens", async function () {
                await expect(erc1155.connect(user1).safeTransferFrom(user1.address, user2.address, TOKEN_ID_2, 1, EMPTY_DATA))
                    .to.be.revertedWith(`token id ${TOKEN_ID_2} is non-transferable`);
            });

            it("Should allow batch transfer of only transferable tokens", async function () {
                const futureTime = (await time.latest()) + 3600;
                await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA); // transferable
                await erc1155.mint(user1.address, TOKEN_ID_3, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA); // transferable

                const ids = [TOKEN_ID_1, TOKEN_ID_3];
                const amounts = [AMOUNT_10, AMOUNT_10];

                await expect(erc1155.connect(user1).safeBatchTransferFrom(user1.address, user2.address, ids, amounts, EMPTY_DATA))
                    .to.emit(erc1155, "TransferBatch");
            });

            it("Should prevent batch transfer containing non-transferable tokens", async function () {
                const ids = [TOKEN_ID_1, TOKEN_ID_2]; // Mix of transferable and non-transferable
                const amounts = [AMOUNT_10, AMOUNT_10];
                
                await expect(erc1155.connect(user1).safeBatchTransferFrom(user1.address, user2.address, ids, amounts, EMPTY_DATA))
                    .to.be.revertedWith(`token id ${TOKEN_ID_2} is non-transferable`);
            });

            it("Should handle approved transfers", async function () {
                await erc1155.connect(user1).setApprovalForAll(user2.address, true);
                
                await expect(erc1155.connect(user2).safeTransferFrom(user1.address, user3.address, TOKEN_ID_1, AMOUNT_10, EMPTY_DATA))
                    .to.emit(erc1155, "TransferSingle");
            });

            it("Should prevent approved transfer of non-transferable tokens", async function () {
                await erc1155.connect(user1).setApprovalForAll(user2.address, true);
                
                await expect(erc1155.connect(user2).safeTransferFrom(user1.address, user3.address, TOKEN_ID_2, AMOUNT_10, EMPTY_DATA))
                    .to.be.revertedWith(`token id ${TOKEN_ID_2} is non-transferable`);
            });
        });

        describe("Edge Cases", function () {
            it("Should handle transfer to same address", async function () {
                await expect(erc1155.connect(user1).safeTransferFrom(user1.address, user1.address, TOKEN_ID_1, AMOUNT_10, EMPTY_DATA))
                    .to.emit(erc1155, "TransferSingle");
            });

            it("Should handle zero amount transfers", async function () {
                await expect(erc1155.connect(user1).safeTransferFrom(user1.address, user2.address, TOKEN_ID_1, 0, EMPTY_DATA))
                    .to.emit(erc1155, "TransferSingle");
            });

            it("Should handle partial transfers", async function () {
                await expect(erc1155.connect(user1).safeTransferFrom(user1.address, user2.address, TOKEN_ID_1, 5, EMPTY_DATA))
                    .to.emit(erc1155, "TransferSingle");

                expect(await erc1155.balanceOf(user1.address, TOKEN_ID_1)).to.equal(95);
                expect(await erc1155.balanceOf(user2.address, TOKEN_ID_1)).to.equal(5);
            });

            it("Should fail for empty id transfers", async function () {
                const ids = [];
                const amounts = [];
                
                await expect(erc1155.connect(user1).safeBatchTransferFrom(user1.address, user2.address, ids, amounts, EMPTY_DATA))
                    .to.be.revertedWith("ERC1155: ids is empty");
            });

            it("Should fail for empty amounts transfers", async function () {
                const ids = [TOKEN_ID_1, TOKEN_ID_2];
                const amounts = [];
                
            await expect(erc1155.connect(user1).safeBatchTransferFrom(user1.address, user2.address, ids, amounts, EMPTY_DATA))
                    .to.be.revertedWith("ERC1155: amount is empty");
            });

            it("Should handle mismatched ids and values arrays", async function () {
                const ids = [TOKEN_ID_1, TOKEN_ID_3];
                const amounts = [AMOUNT_10]; // Wrong length
                
                await expect(erc1155.connect(user1).safeBatchTransferFrom(user1.address, user2.address, ids, amounts, EMPTY_DATA))
                    .to.be.revertedWith("ERC1155: ids and values length mismatch");
            });

            it("Should handle transfer of non-existent token", async function () {
                const nonExistentId = 999;
                
                await expect(erc1155.connect(user1).safeTransferFrom(user1.address, user2.address, nonExistentId, 1, EMPTY_DATA))
                    .to.be.revertedWith(`token id ${nonExistentId} does not exist`);
            });

            it("Should handle transfer more than balance", async function () {
                await expect(erc1155.connect(user1).safeTransferFrom(user1.address, user2.address, TOKEN_ID_1, AMOUNT_100 + 1, EMPTY_DATA))
                    .to.be.revertedWithCustomError(erc1155, "ERC1155InsufficientBalance");
            });
        });
    });

    describe("ERC1155 Standard Functions", function () {
        beforeEach(async function () {
            const futureTime = (await time.latest()) + 3600;
            await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA);
            await erc1155.mint(user1.address, TOKEN_ID_2, AMOUNT_100, futureTime, NON_TRANSFERABLE, EMPTY_DATA);
            await erc1155.mint(user2.address, TOKEN_ID_1, AMOUNT_10, futureTime, TRANSFERABLE, EMPTY_DATA);
        });

        describe("balanceOf", function () {
            it("Should return correct balance for existing tokens", async function () {
                expect(await erc1155.balanceOf(user1.address, TOKEN_ID_1)).to.equal(AMOUNT_10);
                expect(await erc1155.balanceOf(user1.address, TOKEN_ID_2)).to.equal(AMOUNT_100);
                expect(await erc1155.balanceOf(user2.address, TOKEN_ID_1)).to.equal(AMOUNT_10);
            });

            it("Should return zero for non-existent tokens", async function () {
                expect(await erc1155.balanceOf(user1.address, 999)).to.equal(0);
                expect(await erc1155.balanceOf(user3.address, TOKEN_ID_1)).to.equal(0);
            });
        });

        describe("balanceOfBatch", function () {
            it("Should return correct balances for multiple accounts and tokens", async function () {
                const accounts = [user1.address, user1.address, user2.address];
                const ids = [TOKEN_ID_1, TOKEN_ID_2, TOKEN_ID_1];
                
                const balances = await erc1155.balanceOfBatch(accounts, ids);
                
                expect(balances[0]).to.equal(AMOUNT_10);
                expect(balances[1]).to.equal(AMOUNT_100);
                expect(balances[2]).to.equal(AMOUNT_10);
            });

            it("Should handle empty arrays", async function () {
                const balances = await erc1155.balanceOfBatch([], []);
                expect(balances.length).to.equal(0);
            });

            it("Should revert on mismatched array lengths", async function () {
                const accounts = [user1.address, user2.address];
                const ids = [TOKEN_ID_1]; // Wrong length
                
                await expect(erc1155.balanceOfBatch(accounts, ids))
                    .to.be.revertedWithCustomError(erc1155, "ERC1155InvalidArrayLength");
            });
        });

        describe("setApprovalForAll", function () {
            it("Should set approval correctly", async function () {
                await expect(erc1155.connect(user1).setApprovalForAll(user2.address, true))
                    .to.emit(erc1155, "ApprovalForAll")
                    .withArgs(user1.address, user2.address, true);
                
                expect(await erc1155.isApprovedForAll(user1.address, user2.address)).to.be.true;
            });

            it("Should remove approval correctly", async function () {
                await erc1155.connect(user1).setApprovalForAll(user2.address, true);
                await erc1155.connect(user1).setApprovalForAll(user2.address, false);
                
                expect(await erc1155.isApprovedForAll(user1.address, user2.address)).to.be.false;
            });
        });

        describe("uri", function () {
            it("Should return correct URI for any token ID", async function () {
                expect(await erc1155.uri(TOKEN_ID_1)).to.equal(BASE_URI);
                expect(await erc1155.uri(TOKEN_ID_2)).to.equal(BASE_URI);
                expect(await erc1155.uri(999)).to.equal(BASE_URI);
            });

            it("Should handle maximum token ID", async function () {
                expect(await erc1155.uri(ethers.MaxUint256)).to.equal(BASE_URI);
            });
        });
    });

    describe("supportsInterface", function () {
        it("Should support ERC1155 interface", async function () {
            const ERC1155_INTERFACE_ID = "0xd9b67a26";
            expect(await erc1155.supportsInterface(ERC1155_INTERFACE_ID)).to.be.true;
        });

        it("Should support ERC165 interface", async function () {
            const ERC165_INTERFACE_ID = "0x01ffc9a7";
            expect(await erc1155.supportsInterface(ERC165_INTERFACE_ID)).to.be.true;
        });

        it("Should not support random interface", async function () {
            expect(await erc1155.supportsInterface("0x12345678")).to.be.false;
        });
    });

    describe("Integration Tests", function () {
        it("Should handle complete token lifecycle", async function () {
            const futureTime = (await time.latest()) + 3600;
            
            // 1. Mint
            await erc1155.mint(user1.address, TOKEN_ID_1, AMOUNT_100, futureTime, TRANSFERABLE, EMPTY_DATA);
            expect(await erc1155.balanceOf(user1.address, TOKEN_ID_1)).to.equal(AMOUNT_100);
            
            // 3. Transfer via approved operator
            await erc1155.connect(user1).safeTransferFrom(user1.address, user3.address, TOKEN_ID_1, AMOUNT_10, EMPTY_DATA);
            expect(await erc1155.balanceOf(user1.address, TOKEN_ID_1)).to.equal(90);
            expect(await erc1155.balanceOf(user3.address, TOKEN_ID_1)).to.equal(AMOUNT_10);
            
            // 4. Direct transfer
            await erc1155.connect(user1).safeTransferFrom(user1.address, user2.address, TOKEN_ID_1, 20, EMPTY_DATA);
            expect(await erc1155.balanceOf(user1.address, TOKEN_ID_1)).to.equal(70);
            expect(await erc1155.balanceOf(user2.address, TOKEN_ID_1)).to.equal(20);
        });
    });
});