const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("UserBank", function () {
    let UserBank, userBank, owner, addr1;

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();
        UserBank = await ethers.getContractFactory("UserBank");
        userBank = await upgrades.deployProxy(UserBank, [], { initializer: "initialize" });
    });

    it("should allow owner to set and get projectGuidToAddress", async function () {
        await userBank.setProjectGuidToAddress("guid123", "address123");
        expect(await userBank.getProjectGuidToAddress("address123")).to.equal("guid123");
    });

    it("should not allow non-owner to set projectGuidToAddress", async function () {
        await expect(
            userBank.connect(addr1).setProjectGuidToAddress("guid456", "address456")
        ).to.be.reverted;
    });
});