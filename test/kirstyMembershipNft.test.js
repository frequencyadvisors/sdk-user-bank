const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("RevokableMembershipNFT", function () {
    let membershipNFT;
    let owner;
    let writeAdmin;
    let viewAdmin;
    let user1;
    let user2;
    let user3;
    let addrs;

    const MEMBERSHIP_NAME = "Test Membership";
    const MEMBERSHIP_SYMBOL = "TM";
    const WRITE_ADMIN_TYPE = "write:admin";
    const READ_ADMIN_TYPE = "read:admin";
    const VIP_TYPE = "vip";
    const PREMIUM_TYPE = "premium";

    beforeEach(async function () {
        [owner, writeAdmin, viewAdmin, user1, user2, user3, ...addrs] = await ethers.getSigners();

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
                
                await expect(membershipNFT.mint(user1.address, VIP_TYPE, futureTime, false))
                    .to.emit(membershipNFT, "MembershipMinted")
                    .withArgs(1, user1.address, VIP_TYPE, false, false, futureTime);
            });

            it("Should allow write admin to mint", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                // First mint write admin
                await membershipNFT.mint(writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, false);
                
                // Write admin mints for user
                await expect(membershipNFT.connect(writeAdmin).mint(user1.address, VIP_TYPE, futureTime, false))
                    .to.emit(membershipNFT, "MembershipMinted")
                    .withArgs(2, user1.address, VIP_TYPE, false, false, futureTime);
            });

            it("Should reject minting from non-admin", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await expect(membershipNFT.connect(user1).mint(user2.address, VIP_TYPE, futureTime, false))
                    .to.be.revertedWith("Caller is not an admin");
            });

            it("Should reject minting from expired admin", async function () {
                const shortTime = (await time.latest()) + 100;
                await membershipNFT.mint(writeAdmin.address, WRITE_ADMIN_TYPE, shortTime, false);

                await time.increase(200);

                const futureTime = (await time.latest()) + 3600;
                await expect(membershipNFT.connect(writeAdmin).mint(user1.address, VIP_TYPE, futureTime, false))
                    .to.be.revertedWith("Admin membership expired");
            });

            it("Should reject minting from view admin (no write access)", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(viewAdmin.address, READ_ADMIN_TYPE, futureTime, false);

                await expect(membershipNFT.connect(viewAdmin).mint(user1.address, VIP_TYPE, futureTime, false))
                    .to.be.revertedWith("Caller is not an admin");
            });
            it("Should reject minting from revoked admin", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, false);
                
                // Revoke write admin
                await membershipNFT.revoke(1, false);
                
                await expect(membershipNFT.connect(writeAdmin).mint(user1.address, VIP_TYPE, futureTime, false))
                    .to.be.revertedWith("Caller is not an admin");
            });
        });

        describe("Input Validation", function () {
            it("Should reject past expiration dates", async function () {
                const pastTime = (await time.latest()) - 3600;
                
                await expect(membershipNFT.mint(user1.address, VIP_TYPE, pastTime, false))
                    .to.be.revertedWith("Expiration must be in the future or 0 if no expiration");
            });

            it("Should accept zero expiration (no expiry)", async function () {
                await expect(membershipNFT.mint(user1.address, VIP_TYPE, 0, false))
                    .to.emit(membershipNFT, "MembershipMinted")
                    .withArgs(1, user1.address, VIP_TYPE, false, false, 0);
            });
        });

        describe("Write Admin Membership", function () {
            it("Should create write admin with correct permissions", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await membershipNFT.mint(writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, false);
                
                const membership = await membershipNFT.viewMembership(1);
                expect(membership.writeAccess).to.be.true;
                expect(membership.viewAccess).to.be.true;
                expect(membership.membershipType).to.equal(WRITE_ADMIN_TYPE);
                expect(membership.user).to.equal(writeAdmin.address);
                expect(membership.expiration).to.equal(futureTime);
                expect(membership.revoked).to.be.false;
            });

            it("Should create non-transferable write admin", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await membershipNFT.mint(writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, true);
                
                const membership = await membershipNFT.viewMembership(1);
                expect(membership.nonTransferable).to.be.true;
            });
        });

        describe("Read Admin Membership", function () {
            it("Should create read admin with correct permissions", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await membershipNFT.mint(viewAdmin.address, READ_ADMIN_TYPE, futureTime, false);
                
                const membership = await membershipNFT.connect(viewAdmin).viewMembership(1);
                expect(membership.writeAccess).to.be.false;
                expect(membership.viewAccess).to.be.true;
                expect(membership.membershipType).to.equal(READ_ADMIN_TYPE);
                expect(membership.user).to.equal(viewAdmin.address);
            });
        });

        describe("Regular Membership", function () {
            it("Should create regular membership with no admin permissions", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await membershipNFT.mint(user1.address, VIP_TYPE, futureTime, false);
                
                const membership = await membershipNFT.viewMembership(1);
                expect(membership.writeAccess).to.be.false;
                expect(membership.viewAccess).to.be.false;
                expect(membership.membershipType).to.equal(VIP_TYPE);
                expect(membership.user).to.equal(user1.address);
            });

            it("Should create premium membership", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await membershipNFT.mint(user1.address, PREMIUM_TYPE, futureTime, true);
                
                const membership = await membershipNFT.viewMembership(1);
                expect(membership.membershipType).to.equal(PREMIUM_TYPE);
                expect(membership.nonTransferable).to.be.true;
            });
        });

        describe("Token Management", function () {
            it("Should increment nextTokenId correctly", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                expect(await membershipNFT.nextTokenId()).to.equal(0);
                
                await membershipNFT.mint(user1.address, VIP_TYPE, futureTime, false);
                expect(await membershipNFT.nextTokenId()).to.equal(1);
                
                await membershipNFT.mint(user2.address, PREMIUM_TYPE, futureTime, false);
                expect(await membershipNFT.nextTokenId()).to.equal(2);
            });

            it("Should mint NFT to correct address", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                await membershipNFT.mint(user1.address, VIP_TYPE, futureTime, false);
                
                expect(await membershipNFT.ownerOf(1)).to.equal(user1.address);
                expect(await membershipNFT.balanceOf(user1.address)).to.equal(1);
                expect(await membershipNFT.totalSupply()).to.equal(1);
            });

            it("Should return correct tokenId", async function () {
                const futureTime = (await time.latest()) + 3600;
                
                const tokenId = await membershipNFT.mint.staticCall(user1.address, VIP_TYPE, futureTime, false);
                expect(tokenId).to.equal(1);
            });
        });
    });

    describe("updateAdmin", function () {
        beforeEach(async function () {
            const futureTime = (await time.latest()) + 3600;
            await membershipNFT.mint(writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, false);
            await membershipNFT.mint(viewAdmin.address, READ_ADMIN_TYPE, futureTime, false);
        });

        // describe("Access Control", function () {
        //     describe("update admin via mint() function", function () { 
        //         it("Should allow owner to update admin", async function () { 
        //         const newExpiration = (await time.latest()) + 7200;

        //         await membershipNFT.mint(writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, false);     
        //         });
        //     });
            describe("updateAdmin (currently not being used)", function () {
            it("Should allow owner to update admin", async function () {
                const newExpiration = (await time.latest()) + 7200;
                
                await expect(membershipNFT.updateAdmin(viewAdmin.address, true, true, newExpiration))
                    .to.emit(membershipNFT, "MembershipUpdated")
                    .withArgs(2, viewAdmin.address, READ_ADMIN_TYPE, true, true, newExpiration);
            });

            it("Should allow write admin to update admin", async function () {
                const newExpiration = (await time.latest()) + 7200;
                
                await expect(membershipNFT.connect(writeAdmin).updateAdmin(viewAdmin.address, true, false, newExpiration))
                    .to.emit(membershipNFT, "MembershipUpdated")
                    .withArgs(2, viewAdmin.address, READ_ADMIN_TYPE, true, false, newExpiration);
            });

            it("Should reject update from non-admin", async function () {
                const newExpiration = (await time.latest()) + 7200;
                
                await expect(membershipNFT.connect(user1).updateAdmin(viewAdmin.address, true, true, newExpiration))
                    .to.be.revertedWith("Caller is not an admin");
            });

            it("Should reject update from view admin", async function () {
                const newExpiration = (await time.latest()) + 7200;
                
                await expect(membershipNFT.connect(viewAdmin).updateAdmin(writeAdmin.address, false, true, newExpiration))
                    .to.be.revertedWith("Caller is not an admin");
            });
        });
    //});

        describe("Functionality", function () {
            it("Should update admin permissions correctly", async function () {
                const newExpiration = (await time.latest()) + 7200;
                
                await membershipNFT.updateAdmin(viewAdmin.address, true, true, newExpiration);
                
                const membership = await membershipNFT.viewMembership(2);
                expect(membership.writeAccess).to.be.true;
                expect(membership.viewAccess).to.be.true;
                expect(membership.expiration).to.equal(newExpiration);
            });

            it("Should reject updating revoked admin", async function () {
                await membershipNFT.revoke(2, false); // Revoke view admin
                
                const newExpiration = (await time.latest()) + 7200;
                await expect(membershipNFT.updateAdmin(viewAdmin.address, true, false, newExpiration))
                    .to.be.revertedWith("Membership is revoked");
            });

            it("Should update both mappings", async function () {
                const newExpiration = (await time.latest()) + 7200;
                
                await membershipNFT.updateAdmin(viewAdmin.address, false, true, newExpiration);
                
                // Check both mappings are updated
                const membership1 = await membershipNFT.viewMembership(2);
                expect(membership1.writeAccess).to.be.false;
                expect(membership1.viewAccess).to.be.true;
            });
        });
    });

    describe("revoke", function () {
        beforeEach(async function () {
            const futureTime = (await time.latest()) + 3600;
            await membershipNFT.mint(user1.address, VIP_TYPE, futureTime, false);
            await membershipNFT.mint(writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, false);
            await membershipNFT.mint(viewAdmin.address, READ_ADMIN_TYPE, futureTime, false);
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

            it("Should reject revoke from view admin", async function () {
                await expect(membershipNFT.connect(viewAdmin).revoke(1, false))
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
                expect(await membershipNFT.totalSupply()).to.equal(3);
                
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
                expect(await membershipNFT.totalSupply()).to.equal(3);
                
                await membershipNFT.revoke(1, false);

                expect(await membershipNFT.totalSupply()).to.equal(3);
                expect(await membershipNFT.ownerOf(1)).to.equal(user1.address);
                
                const membership = await membershipNFT.viewMembership(1);
                expect(membership.revoked).to.be.true;
            });

            it("Should remove admin privileges", async function () {
                await membershipNFT.revoke(2, false); // Revoke write admin
                
                const membership = await membershipNFT.viewMembership(2);
                expect(membership.writeAccess).to.be.false;
                expect(membership.viewAccess).to.be.false;
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
    });

    describe("viewMembership", function () {
        beforeEach(async function () {
            const futureTime = (await time.latest()) + 3600;
            await membershipNFT.mint(viewAdmin.address, READ_ADMIN_TYPE, futureTime, false);
            await membershipNFT.mint(user1.address, VIP_TYPE, futureTime, false);
        });

        describe("Access Control", function () {
            it("Should allow owner to view", async function () {
                const membership = await membershipNFT.viewMembership(1);
                expect(membership.membershipType).to.equal(READ_ADMIN_TYPE);
            });

            it("Should allow view admin to view", async function () {
                const membership = await membershipNFT.connect(viewAdmin).viewMembership(2);
                expect(membership.membershipType).to.equal(VIP_TYPE);
            });

            it("Should allow write admin to view", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, false);
                
                const membership = await membershipNFT.connect(writeAdmin).viewMembership(1);
                expect(membership.membershipType).to.equal(READ_ADMIN_TYPE);
            });

            it("Should reject view from non-admin", async function () {
                await expect(membershipNFT.connect(user1).viewMembership(1))
                    .to.be.revertedWith("Caller is not a view admin");
            });

            it("Should reject view from expired admin", async function () {
                const shortTime = (await time.latest()) + 100;
                await membershipNFT.mint(user2.address, READ_ADMIN_TYPE, shortTime, false);
                
                await time.increase(200);
                
                await expect(membershipNFT.connect(user2).viewMembership(1))
                    .to.be.revertedWith("Admin membership expired");
            });
            it("Should reject view from revoked admin", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, false);
                
                // Revoke write admin
                await membershipNFT.revoke(3, false);
                
                await expect(membershipNFT.connect(writeAdmin).viewMembership(3))
                    .to.be.revertedWith("Caller is not a view admin");
            });
        });

        describe("Functionality", function () {
            it("Should return correct membership data", async function () {
                const membership = await membershipNFT.viewMembership(1);
                
                expect(membership.tokenId).to.equal(1);
                expect(membership.user).to.equal(viewAdmin.address);
                expect(membership.membershipType).to.equal(READ_ADMIN_TYPE);
                expect(membership.writeAccess).to.be.false;
                expect(membership.viewAccess).to.be.true;
                expect(membership.revoked).to.be.false;
                expect(membership.nonTransferable).to.be.false;
            });
        });
    });

    describe("viewAllMemberships", function () {
        beforeEach(async function () {
            const futureTime = (await time.latest()) + 3600;
            await membershipNFT.mint(viewAdmin.address, READ_ADMIN_TYPE, futureTime, false);
            await membershipNFT.mint(user1.address, VIP_TYPE, futureTime, false);
            await membershipNFT.mint(user2.address, PREMIUM_TYPE, futureTime, true);
        });

        describe("Access Control", function () {
            it("Should allow view admin to view all", async function () {
                const memberships = await membershipNFT.connect(viewAdmin).viewAllMemberships();
                expect(memberships.length).to.equal(3);
            });

            it("Should reject from non-admin", async function () {
                await expect(membershipNFT.connect(user1).viewAllMemberships())
                    .to.be.revertedWith("Caller is not a view admin");
            });
        });

        describe("Functionality", function () {
            it("Should return all memberships in correct order", async function () {
                const memberships = await membershipNFT.connect(viewAdmin).viewAllMemberships();
                
                expect(memberships.length).to.equal(3);
                expect(memberships[0].membershipType).to.equal(READ_ADMIN_TYPE);
                expect(memberships[1].membershipType).to.equal(VIP_TYPE);
                expect(memberships[2].membershipType).to.equal(PREMIUM_TYPE);
            });

            it("Should handle empty collection", async function () {
                const emptyContract = await (await ethers.getContractFactory("RevokableMembershipNFT")).deploy("Empty", "E");
                
                const memberships = await emptyContract.viewAllMemberships();
                expect(memberships.length).to.equal(0);
            });

            it("Should reflect changes after revocation", async function () {
                // revoke PREMIUM_TYPE for user2
                await membershipNFT.revoke(2, true); // Hard delete second token

                const memberships = await membershipNFT.connect(viewAdmin).viewAllMemberships();
                expect(memberships.length).to.equal(2);
                expect(memberships[0].membershipType).to.equal(READ_ADMIN_TYPE);
                expect(memberships[1].membershipType).to.equal(PREMIUM_TYPE);
            });
        });
    });

    describe("viewAllMembershipsWithTokenIds", function () {
        beforeEach(async function () {
            const futureTime = (await time.latest()) + 3600;
            await membershipNFT.mint(viewAdmin.address, READ_ADMIN_TYPE, futureTime, false);
            await membershipNFT.mint(user1.address, VIP_TYPE, futureTime, false);
            await membershipNFT.mint(user2.address, PREMIUM_TYPE, futureTime, true);
        });

        describe("Access Control", function () {
            it("Should allow view admin to view all with token IDs", async function () {
                const [tokenIds, memberships] = await membershipNFT.connect(viewAdmin).viewAllMembershipsWithTokenIds();
                expect(tokenIds.length).to.equal(3);
                expect(memberships.length).to.equal(3);
            });

            it("Should reject from non-admin", async function () {
                await expect(membershipNFT.connect(user1).viewAllMembershipsWithTokenIds())
                    .to.be.revertedWith("Caller is not a view admin");
            });
        });

        describe("Functionality", function () {
            it("Should return aligned token IDs and memberships", async function () {
                const [tokenIds, memberships] = await membershipNFT.connect(viewAdmin).viewAllMembershipsWithTokenIds();
                
                expect(tokenIds.length).to.equal(3);
                expect(memberships.length).to.equal(3);
                
                expect(tokenIds[0]).to.equal(1);
                expect(memberships[0].tokenId).to.equal(1);
                expect(memberships[0].membershipType).to.equal(READ_ADMIN_TYPE);
                
                expect(tokenIds[1]).to.equal(2);
                expect(memberships[1].tokenId).to.equal(2);
                expect(memberships[1].membershipType).to.equal(VIP_TYPE);
            });

            it("Should handle token burns correctly", async function () {
                await membershipNFT.revoke(2, true); // Burn middle token
                
                const [tokenIds, memberships] = await membershipNFT.connect(viewAdmin).viewAllMembershipsWithTokenIds();
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
            
            await membershipNFT.mint(user1.address, VIP_TYPE, futureTime, false);
            expect(await membershipNFT.nextTokenId()).to.equal(1);
            
            await membershipNFT.mint(user2.address, PREMIUM_TYPE, futureTime, false);
            expect(await membershipNFT.nextTokenId()).to.equal(2);
        });

        it("Should be callable by anyone", async function () {
            expect(await membershipNFT.connect(user1).nextTokenId()).to.equal(0);
        });
    });

    describe("_update (Transfer Restrictions)", function () {
        beforeEach(async function () {
            const futureTime = (await time.latest()) + 3600;
            await membershipNFT.mint(user1.address, VIP_TYPE, futureTime, false); // transferable
            await membershipNFT.mint(user2.address, PREMIUM_TYPE, futureTime, true); // non-transferable
            await membershipNFT.mint(writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, false); // transferable
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
                await membershipNFT.connect(writeAdmin).revoke(2, true);
                await expect(membershipNFT.ownerOf(2)).to.be.revertedWithCustomError(membershipNFT, "ERC721NonexistentToken");
            });
            it("should allow an admin to burn non-transferable membership", async function () {
                await membershipNFT.revoke(2, true);
                await expect(membershipNFT.ownerOf(2)).to.be.revertedWithCustomError(membershipNFT, "ERC721NonexistentToken");
            });
            it('should allow an owner or admin to mint a non-transferable membership', async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(user3.address, PREMIUM_TYPE, futureTime, true);
                expect(await membershipNFT.ownerOf(4)).to.equal(user3.address);
            });
            it('should prevent an admin from burning if their admin membership is expired', async function () {
                const shortTime = (await time.latest()) + 100;
                await membershipNFT.mint(writeAdmin.address, WRITE_ADMIN_TYPE, shortTime, false);
                
                await time.increase(200);
                
                await expect(membershipNFT.connect(writeAdmin).revoke(2, true))
                    .to.be.revertedWith("Admin membership expired");
            });
            it('should prevent an admin from burning if their admin membership is revoked', async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, false);
                
                // Revoke write admin
                await membershipNFT.revoke(3, false);
                
                await expect(membershipNFT.connect(writeAdmin).revoke(2, true))
                    .to.be.revertedWith("Caller is not an admin");
            });
        });

        describe("Admin Override", function () {
            it("Should allow owner to burn non-transferable membership", async function () {
                await membershipNFT.revoke(2, true);
                await expect(membershipNFT.ownerOf(2)).to.be.revertedWithCustomError(membershipNFT, "ERC721NonexistentToken");
            });

            it("Should allow write admin operations", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, false);
                
                // Write admin should be able to perform admin operations even on non-transferable tokens
                const membership = await membershipNFT.connect(writeAdmin).mint(user3.address, VIP_TYPE, futureTime, true);
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
                await expect(membershipNFT.mint(user1.address, VIP_TYPE, futureTime, false))
                    .to.not.be.reverted;
            });

            it("Should pass for valid write admin", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, false);
                
                await expect(membershipNFT.connect(writeAdmin).mint(user1.address, VIP_TYPE, futureTime, false))
                    .to.not.be.reverted;
            });

            it("Should fail for view admin", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(viewAdmin.address, READ_ADMIN_TYPE, futureTime, false);
                
                await expect(membershipNFT.connect(viewAdmin).mint(user1.address, VIP_TYPE, futureTime, false))
                    .to.be.revertedWith("Caller is not an admin");
            });
        });

        describe("onlyViewAdmin", function () {
            it("Should pass for owner", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(user1.address, VIP_TYPE, futureTime, false);
                
                await expect(membershipNFT.viewMembership(1)).to.not.be.reverted;
            });

            it("Should pass for view admin", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(viewAdmin.address, READ_ADMIN_TYPE, futureTime, false);
                
                await expect(membershipNFT.connect(viewAdmin).viewMembership(1)).to.not.be.reverted;
            });

            it("Should pass for write admin", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(writeAdmin.address, WRITE_ADMIN_TYPE, futureTime, false);
                
                await expect(membershipNFT.connect(writeAdmin).viewMembership(1)).to.not.be.reverted;
            });

            it("Should fail for regular user", async function () {
                const futureTime = (await time.latest()) + 3600;
                await membershipNFT.mint(user1.address, VIP_TYPE, futureTime, false);
                
                await expect(membershipNFT.connect(user2).viewMembership(1))
                    .to.be.revertedWith("Caller is not a view admin");
            });
        });
    });
});