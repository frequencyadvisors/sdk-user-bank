const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe.only("NFT Membership", function () {
  const name = "RevocableNFT";
  const symbol = "RNFT";
  let nftMembership, owner, admin, nonAdmin, vvip;
  this.beforeEach(async function () {
    [owner, admin, nonAdmin, vvip] = await ethers.getSigners();
    const NFTDeployer = await ethers.getContractFactory(
      "RevokableMembershipNFT"
    );
    nftMembership = await NFTDeployer.deploy(name, symbol);

    await nftMembership.waitForDeployment();
  });
  it("should mint a non-admin NFT", async function () {
    const tx = await nftMembership
      .connect(owner)
      .mint(await vvip.getAddress(), "vvip", 1816960943);
    const token = await nftMembership.connect(owner).viewMembership(1);
    expect(token[0]).to.equal(BigInt(1));
    expect(token[1]).to.equal(await vvip.getAddress());
    expect(token[2]).to.equal("vvip");
    expect(token[3]).to.equal(false);
    expect(token[4]).to.equal(false); //no write access
    expect(token[5]).to.equal(false); //no read access
    expect(token[6]).to.equal(1816960943);
    expect(token[7]).to.equal(false); //revoked == true
  });
  it("should mint an admin NFT", async function () {
    const tx = await nftMembership
      .connect(owner)
      .mint(await admin.getAddress(), "write:admin", 1816960943);
    const token = await nftMembership.connect(owner).viewMembership(1);
    // console.log({ token });
    expect(token[0]).to.equal(BigInt(1));
    expect(token[1]).to.equal(await admin.getAddress());
    expect(token[2]).to.equal("write:admin");
    expect(token[3]).to.equal(true);
    expect(token[4]).to.equal(true); // write access == true
    expect(token[5]).to.equal(true); // read access == true
    expect(token[6]).to.equal(1816960943);
    expect(token[7]).to.equal(false); //revoked == true
  });
  it("should test a Non Admin", async function () {
    const tx = await nftMembership
      .connect(owner)
      .mint(await admin.getAddress(), "read:admin", 1816960943);
    await expect(nftMembership.connect(nonAdmin).viewMembership(1)).to.be.revertedWith("Caller is not an admin");
    // console.log({ token });
    // expect(token[0]).to.equal(BigInt(1));
    // expect(token[1]).to.equal(await admin.getAddress());
    // expect(token[2]).to.equal("write:admin");
    // expect(token[3]).to.equal(true); // write access == true
    // expect(token[4]).to.equal(true); // read access == true
    // expect(token[5]).to.equal(1816960943);
    // expect(token[6]).to.equal(false); //revoked == true
  });
  it("should block a non-admin from minting", async function () {
    await expect(
      nftMembership
        .connect(nonAdmin)
        .mint(await admin.getAddress(), "write:admin", 1816960943)
    ).to.be.revertedWith("Caller is not an admin");
  });
  it("should update an NFT's admin privileges", async function () {
    const tx1 = await nftMembership
      .connect(owner)
      .mint(await admin.getAddress(), "read:admin", 1816960943);
    let token = await nftMembership.connect(owner).viewMembership(1);
    // console.log({ token });
    expect(token[0]).to.equal(BigInt(1));
    expect(token[1]).to.equal(await admin.getAddress());
    expect(token[2]).to.equal("read:admin");
    expect(token[3]).to.equal(true);
    expect(token[4]).to.equal(false); // write access == false
    expect(token[5]).to.equal(true); // read access == true
    expect(token[6]).to.equal(1816960943);
    expect(token[7]).to.equal(false); //revoked == true

    const tx2 = await nftMembership
      .connect(owner)
      .updateAdmin(await admin.getAddress(), true, false, 0, "read:admin"); //what happens when true, false
    token = await nftMembership.connect(owner).viewMembership(1);
    // console.log({ token });
    expect(token[0]).to.equal(BigInt(1));
    expect(token[1]).to.equal(await admin.getAddress());
    expect(token[2]).to.equal("read:admin");
    expect(token[3]).to.equal(true);
    expect(token[4]).to.equal(true); // write access == true | covers read access too
    expect(token[5]).to.equal(false); // read access == false
    expect(token[6]).to.equal(0n);
    expect(token[7]).to.equal(false); //revoked == true
    // POTENTIAL EDGE CASE: Membership type "read:admin" can have write access due to the above
    // Setting the read:admin to FALSE can end up in a scenario where if "read:admin" becomes false while "write:admin" is TRUE.
    // Still granting read:access
  });
  it("should update an NFT's admin privileges, downgrading Admin privileges", async function () {
    const tx1 = await nftMembership
      .connect(owner)
      .mint(await admin.getAddress(), "read:admin", 1816960943);
    let token = await nftMembership.connect(owner).viewMembership(1);
    // console.log({ token });
    expect(token[0]).to.equal(BigInt(1));
    expect(token[1]).to.equal(await admin.getAddress());
    expect(token[2]).to.equal("read:admin");
    expect(token[3]).to.equal(true);
    expect(token[4]).to.equal(false); // write access == false
    expect(token[5]).to.equal(true); // read access == true
    expect(token[6]).to.equal(1816960943);
    expect(token[7]).to.equal(false); //revoked == true

    const tx2 = await nftMembership
      .connect(owner)
      .updateAdmin(await admin.getAddress(), false, false, 0, "read:admin"); //what happens when true, false
    token = await nftMembership.connect(owner).viewMembership(1);
    // console.log({ token });
    expect(token[0]).to.equal(BigInt(1));
    expect(token[1]).to.equal(await admin.getAddress());
    expect(token[2]).to.equal("read:admin");
    expect(token[3]).to.equal(false);
    expect(token[4]).to.equal(false); // write access == true | covers read access too
    expect(token[5]).to.equal(false); // read access == false
    expect(token[6]).to.equal(0n);
    expect(token[7]).to.equal(false); //revoked == true
    // POTENTIAL EDGE CASE: Membership type "read:admin" can have write access due to the above
    // Setting the read:admin to FALSE can end up in a scenario where if "read:admin" becomes false while "write:admin" is TRUE.
    // Still granting read:access
  });
  it("should revoke an admin's privileges - NO HARD DELETE", async function () {
    const tx = await nftMembership
      .connect(owner)
      .mint(await admin.getAddress(), "write:admin", 1816960943);
    let token = await nftMembership.connect(owner).viewMembership(1);
    // console.log({ token });
    expect(token[0]).to.equal(BigInt(1));
    expect(token[1]).to.equal(await admin.getAddress());
    expect(token[2]).to.equal("write:admin");
    expect(token[3]).to.equal(true); 
    expect(token[4]).to.equal(true); // write access == true
    expect(token[5]).to.equal(true); // read access == true
    expect(token[6]).to.equal(1816960943);
    expect(token[7]).to.equal(false); //revoked == true

    await nftMembership.connect(owner).revoke(1, false);
    token = await nftMembership.connect(owner).viewMembership(1);
    // console.log({ token });
    expect(token[0]).to.equal(BigInt(1));
    expect(token[1]).to.equal(await admin.getAddress());
    expect(token[2]).to.equal("write:admin");
    expect(token[3]).to.equal(false); 
    expect(token[4]).to.equal(false); // write access == false
    expect(token[5]).to.equal(false); // read access == false
    expect(token[6]).to.equal(1816960943);
    expect(token[7]).to.equal(true); //revoked == true
  });
  it("should revoke an admin's privileges - HARD DELETE", async function () {
    const tx = await nftMembership
      .connect(owner)
      .mint(await admin.getAddress(), "write:admin", 1816960943);
    let token = await nftMembership.connect(owner).viewMembership(1);
    // console.log({ token });
    expect(token[0]).to.equal(BigInt(1));
    expect(token[1]).to.equal(await admin.getAddress());
    expect(token[2]).to.equal("write:admin");
    expect(token[3]).to.equal(true); 
    expect(token[4]).to.equal(true); // write access == true
    expect(token[5]).to.equal(true); // read access == true
    expect(token[6]).to.equal(1816960943);
    expect(token[7]).to.equal(false); //revoked == true

    await nftMembership.connect(owner).revoke(1, true);
    token = await nftMembership.connect(owner).viewMembership(1);
    // console.log({ token });
    expect(token[0]).to.equal(BigInt(0));
    expect(token[1]).to.equal("0x0000000000000000000000000000000000000000");
    expect(token[2]).to.equal("");
    expect(token[3]).to.equal(false); 
    expect(token[4]).to.equal(false); // write access == false
    expect(token[5]).to.equal(false); // read access == false
    expect(token[6]).to.equal(0n);
    expect(token[7]).to.equal(false); //revoked == true

    // await nftMembership
    //   .connect(owner)
    //   .mint(await admin.getAddress(), "write:admin", 1816960943);
    // token = await nftMembership.connect(owner).viewMembership(2);
    // console.log({ token });
  });
  it("should test expiry on admin privileges", async function () {
    const tx = await nftMembership
      .connect(owner)
      .mint(await admin.getAddress(), "write:admin", 1816960943);
      let token = await nftMembership.connect(admin).viewMembership(1);
    // console.log({ token });
    await time.increaseTo(1816960944);
    const currentTime = await time.latest();
    console.log("Current time:", currentTime);
    await expect(nftMembership.connect(admin).viewMembership(1)).to.be.revertedWith("Write admin membership expired");
    // console.log({ token });
  });
  describe("Test View Privileges", function () {
    this.beforeEach(async function () {
        const tx = await nftMembership
      .connect(owner)
      .mint(await admin.getAddress(), "write:admin", 1916960943);
    });
    it("should test that view privileges can view a Membership", async function(){
        expect(await nftMembership.connect(admin).viewMembership(1)).to.not.be.reverted
    });
    it("should test that only view privileges can view ALL memberships", async function(){
        const tx = await nftMembership
      .connect(owner)
      .mint(await vvip.getAddress(), "write:admin", 0);
      expect(await nftMembership.connect(vvip).viewAllMemberships()).to.not.be.reverted;
 
    });
    it(
      "should test that only view privileges can view ALL tokenIds and memberships", async function(){
        const tx = await nftMembership
      .connect(owner)
      .mint(await vvip.getAddress(), "write:admin", 0);
      expect(await nftMembership.connect(vvip).viewAllMembershipsWithTokenIds()).to.not.be.reverted;
      }
    );
  });
});
