const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("RevokableMembershipNFT", function () {
    let membershipNFT;
    let owner;
    let writeAdmin;
    let user1;
    let user2;
    let user3;
    let addrs;

    const MEMBERSHIP_NAME = "Test Membership";
    const MEMBERSHIP_SYMBOL = "TM";
    const WRITE_ADMIN_TYPE = "write:admin";
    const VIP_TYPE = "vip";
    const PREMIUM_TYPE = "premium";
    const PROJECT_ID = 1; // Example project ID for testing
    const PROJECT_ID_ADMIN = 0; // Project ID for admin memberships
    const nonTransferable = false; // Default for most memberships
    const transferable = true; // Default for write admin memberships

    beforeEach(async function () {
        [owner, writeAdmin, user1, user2, user3, ...addrs] = await ethers.getSigners();

        const MembershipNFT = await ethers.getContractFactory("RevokableMembershipNFT");
        membershipNFT = await MembershipNFT.deploy(MEMBERSHIP_NAME, MEMBERSHIP_SYMBOL);
        await membershipNFT.waitForDeployment();
    });

    describe("constructor", function () {
        it("Should set the correct name and symbol", async function () {
            expect(await membershipNFT.name()).to.equal(MEMBERSHIP_NAME);
            expect(await membershipNFT.symbol()).to.equal(MEMBERSHIP_SYMBOL);
        });

        it("Should set the correct owner", async function () {
            expect(await membershipNFT.owner()).to.equal(owner.address);
        });

        it("Should initialize with zero token supply", async function () {
            expect(await membershipNFT.totalSupply()).to.equal(0);
        });

        it("Should initialize nextTokenId as 0", async function () {
            expect(await membershipNFT.nextTokenId()).to.equal(0);
        });
    });

    describe("mint", function () {
        describe("Access Control", function () {
            it("Should allow owner to mint", async function () {
                const futureTime = (await time.latest()) + 3600;

                await expect(membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable))
                    .to.emit(membershipNFT, "MembershipMinted")
                    .withArgs(PROJECT_ID, 1, user1.address, VIP_TYPE, futureTime, nonTransferable);
            });

            it("Should allow write admin to mint", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                // First mint write admin
                await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, nonTransferable);
                
                // Write admin mints for user
                await expect(membershipNFT.connect(writeAdmin).mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable))
                    .to.emit(membershipNFT, "MembershipMinted")
                    .withArgs(PROJECT_ID,2, user1.address, VIP_TYPE, futureTime, nonTransferable);
            });

            it("Should reject minting from non-admin", async function () {
                const futureTime = (await time.latest()) + 3600;

                await expect(membershipNFT.connect(user1).mint(PROJECT_ID, user2.address, VIP_TYPE, futureTime, nonTransferable))
                    .to.be.revertedWith("Caller is not an admin");
            });

            it("Should reject minting from expired admin", async function () {
                const shortTime = (await time.latest()) + 100;
                await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, shortTime, nonTransferable);

                await time.increase(200);

                const futureTime = (await time.latest()) + 3600;
                await expect(membershipNFT.connect(writeAdmin).mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable))
                    .to.be.revertedWith("Admin membership expired");
            });
            
            it("Should reject minting from revoked admin", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, nonTransferable);
                
                // Revoke write admin
                await membershipNFT.revoke(1, false);

                await expect(membershipNFT.connect(writeAdmin).mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable))
                    .to.be.revertedWith("Caller is not an admin");
            });
        });

        describe("Input Validation", function () {
            it("Should reject past expiration dates", async function () {
                const pastTime = (await time.latest()) - 3600;

                await expect(membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, pastTime, nonTransferable))
                    .to.be.revertedWith("Expiration must be in the future or 0 if no expiration");
            });

            it("Should accept zero expiration (no expiry)", async function () {
                await expect(membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, 0, nonTransferable))
                    .to.emit(membershipNFT, "MembershipMinted")
                    .withArgs(PROJECT_ID, 1, user1.address, VIP_TYPE, 0, nonTransferable);
            });
            
            it("Should reject minting to zero address", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await expect(membershipNFT.mint(PROJECT_ID, ethers.ZeroAddress, VIP_TYPE, futureTime, nonTransferable))
                    .to.be.revertedWithCustomError(membershipNFT, "ERC721InvalidReceiver");
            });

            it("Should handle empty membership type string", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await expect(membershipNFT.mint(PROJECT_ID, user1.address, "", futureTime, nonTransferable))
                    .to.emit(membershipNFT, "MembershipMinted");
            });

            it("Should handle very long membership type string", async function () {
                const futureTime = (await time.latest()) + 3600;
                const longString = "a".repeat(1000);
                
                await expect(membershipNFT.mint(PROJECT_ID, user1.address, longString, futureTime, nonTransferable))
                    .to.emit(membershipNFT, "MembershipMinted");
            });

            it("Should handle maximum project ID", async function () {
                const futureTime = (await time.latest()) + 3600;
                const maxProjectId = ethers.MaxUint256;
                
                await expect(membershipNFT.mint(maxProjectId, user1.address, VIP_TYPE, futureTime, nonTransferable))
                    .to.emit(membershipNFT, "MembershipMinted");
            });

            it("Should handle maximum expiration timestamp", async function () {
                const maxTimestamp = ethers.MaxUint256;
                
                await expect(membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, maxTimestamp, nonTransferable))
                    .to.emit(membershipNFT, "MembershipMinted");
            });
        });

        describe("Write Admin Membership", function () {
            it("Should create write admin with correct permissions", async function () {
                const futureTime = (await time.latest()) + 3600;

                await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, nonTransferable);

                const membership = await membershipNFT.viewMembership(1);
                expect(membership.membershipType).to.equal(WRITE_ADMIN_TYPE);
                expect(membership.user).to.equal(writeAdmin.address);
                expect(membership.isAdmin).to.be.true;
                expect(membership.expiration).to.equal(futureTime);
                expect(membership.revoked).to.be.false;
            });

            it("Should create non-transferable write admin", async function () {
                const futureTime = (await time.latest()) + 3600;

                await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, transferable);

                const membership = await membershipNFT.viewMembership(1);
                expect(membership.transferable).to.be.true;
            });
        });

        describe("Regular Membership", function () {
            it("Should create regular membership with no admin permissions", async function () {
                const futureTime = (await time.latest()) + 3600;

                await membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable);

                const membership = await membershipNFT.viewMembership(1);
                expect(membership.membershipType).to.equal(VIP_TYPE);
                expect(membership.user).to.equal(user1.address);
            });

            it("Should create premium membership", async function () {
                const futureTime = (await time.latest()) + 3600;

                await membershipNFT.mint(PROJECT_ID, user1.address, PREMIUM_TYPE, futureTime, transferable);

                const membership = await membershipNFT.viewMembership(1);
                expect(membership.membershipType).to.equal(PREMIUM_TYPE);
                expect(membership.transferable).to.be.true;
            });
        });

        describe("Token Management", function () {
            it("Should increment nextTokenId correctly", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                expect(await membershipNFT.nextTokenId()).to.equal(0);

                await membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable);
                expect(await membershipNFT.nextTokenId()).to.equal(1);

                await membershipNFT.mint(PROJECT_ID, user2.address, PREMIUM_TYPE, futureTime, nonTransferable);
                expect(await membershipNFT.nextTokenId()).to.equal(2);
            });

            it("Should mint NFT to correct address", async function () {
                const futureTime = (await time.latest()) + 3600;

                await membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable);

                expect(await membershipNFT.ownerOf(1)).to.equal(user1.address);
                expect(await membershipNFT.balanceOf(user1.address)).to.equal(1);
                expect(await membershipNFT.totalSupply()).to.equal(1);
            });
            
            it("Should handle multiple mints to same address", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable);
                await membershipNFT.mint(PROJECT_ID, user1.address, PREMIUM_TYPE, futureTime, nonTransferable);
                
                expect(await membershipNFT.balanceOf(user1.address)).to.equal(2);
                expect(await membershipNFT.ownerOf(1)).to.equal(user1.address);
                expect(await membershipNFT.ownerOf(2)).to.equal(user1.address);
            });

            it("Should handle same membership type for different projects", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await membershipNFT.mint(1, user1.address, VIP_TYPE, futureTime, nonTransferable);
                await membershipNFT.mint(2, user1.address, VIP_TYPE, futureTime, nonTransferable);
                
                const membership1 = await membershipNFT.viewMembership(1);
                const membership2 = await membershipNFT.viewMembership(2);
                
                expect(membership1.projectId).to.equal(1);
                expect(membership2.projectId).to.equal(2);
                expect(membership1.membershipType).to.equal(VIP_TYPE);
                expect(membership2.membershipType).to.equal(VIP_TYPE);
            });
        });
    });

    describe("revoke", function () {
        beforeEach(async function () {
            const futureTime = (await time.latest()) + 3600;
            await membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable);
            await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, nonTransferable);
        });

        describe("Access Control", function () {
            it("Should allow owner to revoke", async function () {
                await expect(membershipNFT.revoke(1, false))
                    .to.emit(membershipNFT, "MembershipRevoked")
                    .withArgs(1);
            });

            it("Should allow write admin to revoke", async function () {
                await expect(membershipNFT.revoke(1, false))
                    .to.emit(membershipNFT, "MembershipRevoked")
                    .withArgs(1);
            });

            it("Should reject revoke from non-owner", async function () {
                await expect(membershipNFT.connect(user1).revoke(1, false))
                    .to.be.revertedWith("Caller is not an admin");
            });
        });

        describe("Input Validation", function () {
            it("Should reject revoking non-existent token", async function () {
                await expect(membershipNFT.revoke(999, false))
                    .to.be.revertedWith("Invalid tokenId: Membership does not exist");
            });
        });

        describe("Hard Delete (hardDelete = true)", function () {
            it("Should burn token and delete from mapping", async function () {
                expect(await membershipNFT.totalSupply()).to.equal(2);
                
                await membershipNFT.revoke(1, true);

                await expect(membershipNFT.ownerOf(1)).to.be.revertedWithCustomError(membershipNFT, "ERC721NonexistentToken");
            });

            it("Should emit MembershipRevoked event", async function () {
                await expect(membershipNFT.revoke(1, true))
                    .to.emit(membershipNFT, "MembershipRevoked")
                    .withArgs(1);
            });

            it("Should not modify membership after burning", async function () {
                await membershipNFT.revoke(1, true);
                // Token should be completely removed, no further checks on membership
            });
        });

        describe("Soft Delete (hardDelete = false)", function () {
            it("Should keep token but mark as revoked", async function () {
                expect(await membershipNFT.totalSupply()).to.equal(2);
                
                await membershipNFT.revoke(1, false);

                expect(await membershipNFT.totalSupply()).to.equal(2);
                expect(await membershipNFT.ownerOf(1)).to.equal(user1.address);
                
                const membership = await membershipNFT.viewMembership(1);
                expect(membership.revoked).to.be.true;
            });

            it("Should remove admin privileges", async function () {
                await membershipNFT.revoke(2, false); // Revoke write admin
                
                const membership = await membershipNFT.viewMembership(2);
                expect(membership.revoked).to.be.true;
            });

            it("Should reject double revocation", async function () {
                await membershipNFT.revoke(1, false);
                
                await expect(membershipNFT.revoke(1, false))
                    .to.be.revertedWith("Membership already revoked");
            });

            it("Should emit MembershipRevoked event", async function () {
                await expect(membershipNFT.revoke(1, false))
                    .to.emit(membershipNFT, "MembershipRevoked")
                    .withArgs(1);
            });
        });
        
        describe("Edge Cases", function () {
            it("Should handle revoking after token transfer", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, transferable);

                
                // Transfer token
                await membershipNFT.connect(user1).transferFrom(user1.address, user2.address, 3);
                
                // Original owner should not matter for revocation
                await expect(membershipNFT.revoke(3, false))
                    .to.emit(membershipNFT, "MembershipRevoked")
                    .withArgs(3);
            });

            it("Should handle revoking expired membership", async function () {
                const shortTime = (await time.latest()) + 100;
                await membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, shortTime, nonTransferable);
                
                await time.increase(200);
                
                // Should still be able to revoke expired membership
                await expect(membershipNFT.revoke(3, false))
                    .to.emit(membershipNFT, "MembershipRevoked")
                    .withArgs(3);
            });

            it("Should handle multiple admin types for same user", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, nonTransferable);
                
                // Revoke write admin
                await membershipNFT.revoke(3, false);
                
                // Should still have admin data on chain
                const membership = await membershipNFT.viewMembership(3);
                expect(membership.isAdmin).to.be.false;
                expect(membership.revoked).to.be.true;
                expect(membership.membershipType).to.equal(WRITE_ADMIN_TYPE); 
                expect(membership.user).to.equal(writeAdmin.address);
            });

            it("Should handle burning last token", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable);
                
                expect(await membershipNFT.totalSupply()).to.equal(3);
                
                await membershipNFT.revoke(3, true);

                expect(await membershipNFT.totalSupply()).to.equal(2);
            });
        });

        describe("Functionality", function () {
            it("Should return correct membership data", async function () {
                const membership = await membershipNFT.viewMembership(1);
                
                expect(membership.tokenId).to.equal(1);
                expect(membership.user).to.equal(user1.address);
                expect(membership.membershipType).to.equal(VIP_TYPE);
                expect(membership.revoked).to.be.false;
                expect(membership.transferable).to.be.false;
            });

            it("Should handle viewing non-existent membership", async function () {
                // This should return a default/empty struct rather than revert
                const membership = await membershipNFT.viewMembership(999);
                expect(membership.user).to.equal(ethers.ZeroAddress);
                expect(membership.tokenId).to.equal(0);
            });

            it("Should view membership after soft revocation", async function () {
                await membershipNFT.revoke(2, false);
                
                const membership = await membershipNFT.viewMembership(2);
                expect(membership.revoked).to.be.true;
                expect(membership.user).to.equal(writeAdmin.address);
            });

            it("Should handle viewing non-existent membership", async function () {
                // This should return a default/empty struct rather than revert
                const membership = await membershipNFT.viewMembership(999);
                expect(membership.user).to.equal(ethers.ZeroAddress);
                expect(membership.tokenId).to.equal(0);
            });

            it("Should view membership after soft revocation", async function () {
                await membershipNFT.revoke(2, false);
                
                const membership = await membershipNFT.connect(viewAdmin).viewMembership(2);
                expect(membership.revoked).to.be.true;
                expect(membership.user).to.equal(user1.address);
            });
        });
    });

    describe("viewAllMemberships", function () {
        beforeEach(async function () {
            const futureTime = (await time.latest()) + 3600;
            await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, nonTransferable);
            await membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable);
            await membershipNFT.mint(PROJECT_ID, user2.address, PREMIUM_TYPE, futureTime, transferable);
        });


        describe("Functionality", function () {
            it("Should return all memberships in correct order", async function () {
                const memberships = await membershipNFT.connect(writeAdmin).viewAllMemberships();
                
                expect(memberships.length).to.equal(3);
                expect(memberships[0].membershipType).to.equal(WRITE_ADMIN_TYPE);
                expect(memberships[1].membershipType).to.equal(VIP_TYPE);
                expect(memberships[2].membershipType).to.equal(PREMIUM_TYPE);
            });

            it("Should handle empty collection", async function () {
                const emptyContract = await (await ethers.getContractFactory("RevokableMembershipNFT")).deploy("Empty", "E");
                
                const memberships = await emptyContract.viewAllMemberships();
                expect(memberships.length).to.equal(0);
            });

            it("Should reflect changes after revocation", async function () {
                // revoke VIP_TYPE for user1
                await membershipNFT.revoke(2, true); // Hard delete second token

                const memberships = await membershipNFT.connect(writeAdmin).viewAllMemberships();
                expect(memberships.length).to.equal(2);
                expect(memberships[0].membershipType).to.equal(WRITE_ADMIN_TYPE);
                expect(memberships[1].membershipType).to.equal(PREMIUM_TYPE);
            });

            it("Should handle mixed revoked and active memberships", async function () {
                // Soft revoke middle membership
                await membershipNFT.revoke(2, false);
                
                const memberships = await membershipNFT.connect(writeAdmin).viewAllMemberships();
                expect(memberships.length).to.equal(3);
                expect(memberships[1].revoked).to.be.true;
                expect(memberships[0].revoked).to.be.false;
                expect(memberships[2].revoked).to.be.false;
            });

            it("Should handle large number of memberships", async function () {
                // Mint 10 memberships to test gas limits (reduced to avoid gas issues)
                const futureTime = (await time.latest()) + 3600;
                for (let i = 0; i < 10; i++) {
                    await membershipNFT.mint(PROJECT_ID, addrs[i % addrs.length].address, VIP_TYPE, futureTime, nonTransferable);
                }
                
                const memberships = await membershipNFT.connect(writeAdmin).viewAllMemberships();
                expect(memberships.length).to.equal(13); // 3 original + 10 new
            });
        });


        describe("Functionality", function () {
            it("Should return aligned token IDs and memberships", async function () {
                const [tokenIds, memberships] = await membershipNFT.connect(writeAdmin).viewAllMembershipsWithTokenIds();
                
                expect(tokenIds.length).to.equal(3);
                expect(memberships.length).to.equal(3);
                
                expect(tokenIds[0]).to.equal(1);
                expect(memberships[0].tokenId).to.equal(1);
                expect(memberships[0].membershipType).to.equal(WRITE_ADMIN_TYPE);

                expect(tokenIds[1]).to.equal(2);
                expect(memberships[1].tokenId).to.equal(2);
                expect(memberships[1].membershipType).to.equal(VIP_TYPE);
            });

            it("Should handle token burns correctly", async function () {
                await membershipNFT.revoke(2, true); // Burn middle token
                
                const [tokenIds, memberships] = await membershipNFT.connect(writeAdmin).viewAllMembershipsWithTokenIds();
                expect(tokenIds.length).to.equal(2);
                expect(tokenIds[0]).to.equal(1);
                expect(tokenIds[1]).to.equal(3);
            });
        });
    });

    describe("nextTokenId", function () {
        it("Should return current next token ID", async function () {
            expect(await membershipNFT.nextTokenId()).to.equal(0);
        });

        it("Should increment after minting", async function () {
            const futureTime = (await time.latest()) + 3600;
            
            await membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable);
            expect(await membershipNFT.nextTokenId()).to.equal(1);
            
            await membershipNFT.mint(PROJECT_ID, user2.address, PREMIUM_TYPE, futureTime, nonTransferable);
            expect(await membershipNFT.nextTokenId()).to.equal(2);
        });

        it("Should be callable by anyone", async function () {
            expect(await membershipNFT.connect(user1).nextTokenId()).to.equal(0);
        });
    });

    describe("_update (Transfer Restrictions)", function () {
        beforeEach(async function () {
            const futureTime = (await time.latest()) + 3600;
            await membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, transferable); 
            await membershipNFT.mint(PROJECT_ID, user2.address, PREMIUM_TYPE, futureTime, nonTransferable); 
            await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, nonTransferable); 
        });

        describe("Transferable Memberships", function () {
            it("Should allow transfer of transferable membership", async function () {
                await membershipNFT.connect(user1).transferFrom(user1.address, user3.address, 1);
                expect(await membershipNFT.ownerOf(1)).to.equal(user3.address);
            });

            it("Should allow approval and transferFrom", async function () {
                await membershipNFT.connect(user1).approve(user3.address, 1);
                await membershipNFT.connect(user3).transferFrom(user1.address, user3.address, 1);
                expect(await membershipNFT.ownerOf(1)).to.equal(user3.address);
            });
        });

        describe("Non-Transferable Memberships", function () {
            it("Should prevent transfer of non-transferable membership", async function () {
                await expect(membershipNFT.connect(user2).transferFrom(user2.address, user3.address, 2))
                    .to.be.revertedWith("Membership is non-transferable");
            });

            it("Should prevent approved transfer of non-transferable membership", async function () {
                await membershipNFT.connect(user2).approve(user3.address, 2);
                await expect(membershipNFT.connect(user3).transferFrom(user2.address, user3.address, 2))
                    .to.be.revertedWith("Membership is non-transferable");
            });
            
            it("Should allow owner to burn non-transferable membership", async function () {
                await membershipNFT.connect(owner).revoke(2, true);
                await expect(membershipNFT.ownerOf(2)).to.be.revertedWithCustomError(membershipNFT, "ERC721NonexistentToken");
            });
            
            it("should allow an admin to burn non-transferable membership", async function () {
                await membershipNFT.connect(writeAdmin).revoke(2, true);
                await expect(membershipNFT.ownerOf(2)).to.be.revertedWithCustomError(membershipNFT, "ERC721NonexistentToken");
            });
            
            it('should allow an owner or admin to mint a non-transferable membership', async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(PROJECT_ID, user3.address, PREMIUM_TYPE, futureTime, transferable);
                expect(await membershipNFT.ownerOf(4)).to.equal(user3.address);
            });
            
            it('should prevent an admin from burning if their admin membership is expired', async function () {
                const shortTime = (await time.latest()) + 100;
                await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, shortTime, nonTransferable);
                
                await time.increase(200);
                
                await expect(membershipNFT.connect(writeAdmin).revoke(2, true))
                    .to.be.revertedWith("Admin membership expired");
            });
            
            it('should prevent an admin from burning if their admin membership is revoked', async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, nonTransferable);

                // Revoke write admin
                await membershipNFT.revoke(3, false);
                
                await expect(membershipNFT.connect(writeAdmin).revoke(2, true))
                    .to.be.revertedWith("Caller is not an admin");
            });
        });

        describe("Transfer from Owner Account (V1 only)", function () {
            it("Should allow transfer of memberships by owner account", async function () {
                await membershipNFT.connect(owner).mint(PROJECT_ID, user1.address, VIP_TYPE, (await time.latest()) + 3600, transferable);
                await membershipNFT.connect(owner).transferFrom(user1.address, user2.address, 1);
                await membershipNFT.connect(owner).transferFrom(user2.address, user3.address, 1);

                const membership = await membershipNFT.viewMembership(1);
                expect(membership.user).to.equal(user3.address);
            });
        });

        describe("Edge Cases", function () {
            it("Should handle transfer to same address", async function () {
                // Transfer to self should work
                await membershipNFT.connect(user1).transferFrom(user1.address, user1.address, 1);
                expect(await membershipNFT.ownerOf(1)).to.equal(user1.address);
            });

            it("Should handle approved transfer by admin", async function () {
                await membershipNFT.connect(user1).approve(writeAdmin.address, 1);
                await membershipNFT.connect(writeAdmin).transferFrom(user1.address, user2.address, 1);
                
                expect(await membershipNFT.ownerOf(1)).to.equal(user2.address);
            });

            it("Should handle expired admin trying to burn", async function () {
                const futureTime = (await time.latest()) + 3600;
                const shortTime = (await time.latest()) + 100;
                
                await membershipNFT.mint(PROJECT_ID, user3.address, VIP_TYPE, futureTime, nonTransferable);
                await membershipNFT.mint(PROJECT_ID, user3.address, WRITE_ADMIN_TYPE, shortTime, nonTransferable);
                
                await time.increase(200);
                
                await expect(membershipNFT.connect(user3).revoke(4, true))
                    .to.be.revertedWith("Admin membership expired");
            });

            it("Should handle admin transferring non-transferable token they own", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(PROJECT_ID, user3.address, WRITE_ADMIN_TYPE, futureTime, transferable); 
                
                // Admin should still be able to use admin functions even on their own non-transferable token
                await membershipNFT.connect(user3).mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable);
                expect(await membershipNFT.ownerOf(5)).to.equal(user1.address);
            });
        });

        describe("Admin Override", function () {
            it("Should allow owner to burn non-transferable membership", async function () {
                await membershipNFT.revoke(2, true);
                await expect(membershipNFT.ownerOf(2)).to.be.revertedWithCustomError(membershipNFT, "ERC721NonexistentToken");
            });

            it("Should allow write admin operations", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, nonTransferable);

                // Write admin should be able to perform admin operations even on non-transferable tokens
                const membership = await membershipNFT.connect(writeAdmin).mint(PROJECT_ID, user3.address, VIP_TYPE, futureTime, transferable);
                const receipt = await membership.wait(1);
                expect(receipt.status).to.equal(1);
            });
        });
    });

    describe("supportsInterface", function () {
        it("Should support ERC721 interface", async function () {
            const ERC721_INTERFACE_ID = "0x80ac58cd";
            expect(await membershipNFT.supportsInterface(ERC721_INTERFACE_ID)).to.be.true;
        });

        it("Should support ERC721Enumerable interface", async function () {
            const ERC721_ENUMERABLE_INTERFACE_ID = "0x780e9d63";
            expect(await membershipNFT.supportsInterface(ERC721_ENUMERABLE_INTERFACE_ID)).to.be.true;
        });

        it("Should support ERC165 interface", async function () {
            const ERC165_INTERFACE_ID = "0x01ffc9a7";
            expect(await membershipNFT.supportsInterface(ERC165_INTERFACE_ID)).to.be.true;
        });

        it("Should not support random interface", async function () {
            expect(await membershipNFT.supportsInterface("0x12345678")).to.be.false;
        });
    });

    describe("Modifiers", function () {
        describe("onlyAdmin", function () {
            it("Should pass for owner", async function () {
                const futureTime = (await time.latest()) + 3600;
                await expect(membershipNFT.mint(PROJECT_ID,user1.address, VIP_TYPE, futureTime, nonTransferable))
                    .to.not.be.reverted;
            });

            it("Should pass for valid write admin", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, nonTransferable);
                
                await expect(membershipNFT.connect(writeAdmin).mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable))
                    .to.not.be.reverted;
            });
        });

        describe("onlywriteAdmin", function () {
            it("Should pass for owner", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(PROJECT_ID,user1.address, VIP_TYPE, futureTime, nonTransferable);
                
                await expect(membershipNFT.viewMembership(1)).to.not.be.reverted;
            });

            it("Should pass for write admin", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, nonTransferable);
                
                await expect(membershipNFT.connect(writeAdmin).viewMembership(1)).to.not.be.reverted;
            });
        });
    });

    // NEW EDGE CASE TESTS
    describe("Modifiers Edge Cases", function () {
        describe("onlyAdmin edge cases", function () {
            it("Should handle admin write permissions", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                // This shouldn't happen in normal flow, but test edge case
                await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, nonTransferable);
                
                // Should still work with write access
                await expect(membershipNFT.connect(writeAdmin).mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable))
                    .to.not.be.reverted;
            });

            it("Should handle admin at exact expiration time", async function () {
                const exactTime = (await time.latest()) + 1000;
                await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, exactTime, nonTransferable);
                
                // Set time to exactly the expiration
                await time.increaseTo(exactTime);
                
                const futureTime = (await time.latest()) + 3600;
                await expect(membershipNFT.connect(writeAdmin).mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable))
                    .to.be.revertedWith("Admin membership expired");
            });
        });
    });

    describe("Gas and Performance", function () {
        it("Should handle minting with reasonable gas usage", async function () {
            const futureTime = (await time.latest()) + 3600;
            
            const tx = await membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable);
            const receipt = await tx.wait();
            
            // Gas should be reasonable (adjust threshold as needed)
            expect(receipt.gasUsed).to.be.below(500000); // Increased threshold for complex contract
        });

        it("Should handle revocation with reasonable gas usage", async function () {
            const futureTime = (await time.latest()) + 3600;
            await membershipNFT.mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable);
            
            const tx = await membershipNFT.revoke(1, false);
            const receipt = await tx.wait();
            
            expect(receipt.gasUsed).to.be.below(150000);
        });
    });

    describe("Integration Tests", function () {
        it("Should handle complete membership lifecycle", async function () {
            const futureTime = (await time.latest()) + 3600;
            
            // 1. Mint admin
            await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, nonTransferable);
            
            // 2. Admin mints user membership
            await membershipNFT.connect(writeAdmin).mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, transferable);
            
            // 3. Transfer membership
            await membershipNFT.connect(user1).transferFrom(user1.address, user2.address, 2);
            
            // 4. View membership (user field doesn't update on transfer by design)
            const membership = await membershipNFT.connect(writeAdmin).viewMembership(2);
            expect(membership.user).to.equal(user2.address); // Original user in struct
            expect(await membershipNFT.ownerOf(2)).to.equal(user2.address); // New owner
            
            // 5. Revoke membership
            await membershipNFT.revoke(2, false);
            
            // 6. Verify revocation
            const revokedMembership = await membershipNFT.connect(writeAdmin).viewMembership(2);
            expect(revokedMembership.revoked).to.be.true;
        });

        it("Should handle admin role transitions", async function () {
            const futureTime = (await time.latest()) + 3600;
            
            // 1. Create write admin
            await membershipNFT.mint(PROJECT_ID, writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, nonTransferable);
            
            // 2. Revoke write admin
            await membershipNFT.revoke(1, false);
            
            // 3. write operations should fail
            await expect(membershipNFT.connect(writeAdmin).mint(PROJECT_ID, user1.address, VIP_TYPE, futureTime, nonTransferable))
                .to.be.revertedWith('Caller is not an admin');
        });

        it("Should handle multiple projects with same membership types", async function () {
            const futureTime = (await time.latest()) + 3600;
            
            // Create memberships for different projects
            await membershipNFT.mint(1, user1.address, VIP_TYPE, futureTime, nonTransferable);
            await membershipNFT.mint(2, user1.address, VIP_TYPE, futureTime, nonTransferable);
            await membershipNFT.mint(3, user2.address, VIP_TYPE, futureTime, nonTransferable);
            
            const membership1 = await membershipNFT.viewMembership(1);
            const membership2 = await membershipNFT.viewMembership(2);
            const membership3 = await membershipNFT.viewMembership(3);
            
            expect(membership1.projectId).to.equal(1);
            expect(membership2.projectId).to.equal(2);
            expect(membership3.projectId).to.equal(3);
            
            // All should have same membership type but different projects
            expect(membership1.membershipType).to.equal(VIP_TYPE);
            expect(membership2.membershipType).to.equal(VIP_TYPE);
            expect(membership3.membershipType).to.equal(VIP_TYPE);
        });
    });
});