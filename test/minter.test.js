const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFT Membership", function () {
  const name = "RevocableNFT";
  const symbol = "RNFT";
  const nonTransferable = true;
  const projectId = 1; // Assuming a project ID for testing
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
      .mint(projectId, await vvip.getAddress(), "vvip", 1816960943, nonTransferable);
    const token = await nftMembership.connect(owner).viewMembership(1);
    expect(token[0]).to.equal(projectId);
    expect(token[1]).to.equal(token.tokenId);
    expect(token[2]).to.equal(await vvip.getAddress());  
    expect(token[3]).to.equal("vvip");
    expect(token[4]).to.equal(false);
    expect(token[5]).to.equal(1816960943);
    expect(token[6]).to.equal(false);
    expect(token[7]).to.equal(nonTransferable);
  });
  it("should mint an admin NFT", async function () {
    const tx = await nftMembership
      .connect(owner)
      .mint(projectId, await admin.getAddress(), "write:admin", 1816960943, nonTransferable);
    const token = await nftMembership.connect(owner).viewMembership(1);
    expect(token[0]).to.equal(0);
    expect(token[1]).to.equal(token.tokenId);
    expect(token[2]).to.equal(await admin.getAddress());
    expect(token[3]).to.equal("write:admin");
    expect(token[4]).to.equal(true);
    expect(token[5]).to.equal(1816960943);
    expect(token[6]).to.equal(false);
    expect(token[7]).to.equal(nonTransferable);
  });
  it("should block a non-admin from minting", async function () {
    await expect(
      nftMembership
        .connect(nonAdmin)
        .mint(projectId,await admin.getAddress(), "write:admin", 1816960943, nonTransferable)
    ).to.be.revertedWith("Caller is not an admin");
  });
  // it("should update an NFT's admin privileges", async function () {
  //   const tx1 = await nftMembership
  //     .connect(owner)
  //     .mint(await admin.getAddress(), "read:admin", 1816960943, nonTransferable);
  //   let token = await nftMembership.connect(owner).viewMembership(1);
  //   // console.log({ token });
  //   expect(token[0]).to.equal(BigInt(1));
  //   expect(token[1]).to.equal(await admin.getAddress());
  //   expect(token[2]).to.equal("read:admin");
  //   expect(token[3]).to.equal(true);
  //   expect(token[4]).to.equal(false); // write access == false
  //   expect(token[5]).to.equal(true); // read access == true
  //   expect(token[6]).to.equal(1816960943);
  //   expect(token[7]).to.equal(false); //revoked == true
  //   expect(token[8]).to.equal(nonTransferable); // non-transferable == true

  //   const tx2 = await nftMembership
  //     .connect(owner)
  //     .updateAdmin(await admin.getAddress(), true, false, 0, "read:admin", nonTransferable); //what happens when true, false
  //   token = await nftMembership.connect(owner).viewMembership(1);
  //   // console.log({ token });
  //   expect(token[0]).to.equal(BigInt(1));
  //   expect(token[1]).to.equal(await admin.getAddress());
  //   expect(token[2]).to.equal("read:admin");
  //   expect(token[3]).to.equal(true);
  //   expect(token[4]).to.equal(true); // write access == true | covers read access too
  //   expect(token[5]).to.equal(false); // read access == false
  //   expect(token[6]).to.equal(0n);
  //   expect(token[7]).to.equal(false); //revoked == true
  //   expect(token[8]).to.equal(nonTransferable); // non-transferable == true
  //   // POTENTIAL EDGE CASE: Membership type "read:admin" can have write access due to the above
  //   // Setting the read:admin to FALSE can end up in a scenario where if "read:admin" becomes false while "write:admin" is TRUE.
  //   // Still granting read:access
  // });
  // it("should update an NFT's admin privileges, downgrading Admin privileges", async function () {
  //   const tx1 = await nftMembership
  //     .connect(owner)
  //     .mint(await admin.getAddress(), "read:admin", 1816960943, nonTransferable);
  //   let token = await nftMembership.connect(owner).viewMembership(1);
  //   // console.log({ token });
  //   expect(token[0]).to.equal(BigInt(1));
  //   expect(token[1]).to.equal(await admin.getAddress());
  //   expect(token[2]).to.equal("read:admin");
  //   expect(token[3]).to.equal(true);
  //   expect(token[4]).to.equal(false); // write access == false
  //   expect(token[5]).to.equal(true); // read access == true
  //   expect(token[6]).to.equal(1816960943);
  //   expect(token[7]).to.equal(false); //revoked == true
  //   expect(token[8]).to.equal(nonTransferable); // non-transferable == true

  //   const tx2 = await nftMembership
  //     .connect(owner)
  //     .updateAdmin(await admin.getAddress(), false, false, 0, "read:admin"); //what happens when true, false
  //   token = await nftMembership.connect(owner).viewMembership(1);
  //   // console.log({ token });
  //   expect(token[0]).to.equal(BigInt(1));
  //   expect(token[1]).to.equal(await admin.getAddress());
  //   expect(token[2]).to.equal("read:admin");
  //   expect(token[3]).to.equal(false);
  //   expect(token[4]).to.equal(false); // write access == true | covers read access too
  //   expect(token[5]).to.equal(false); // read access == false
  //   expect(token[6]).to.equal(0n);
  //   expect(token[7]).to.equal(false); //revoked == true
  //   expect(token[8]).to.equal(nonTransferable); // non-transferable == true
  //   // POTENTIAL EDGE CASE: Membership type "read:admin" can have write access due to the above
  //   // Setting the read:admin to FALSE can end up in a scenario where if "read:admin" becomes false while "write:admin" is TRUE.
  //   // Still granting read:access
  // });
  it("should revoke an admin's privileges - NO HARD DELETE", async function () {
    const tx = await nftMembership
      .connect(owner)
      .mint(projectId, await admin.getAddress(), "write:admin", 1816960943, nonTransferable);
    let token = await nftMembership.connect(owner).viewMembership(1);
    // console.log({ token });
    expect(token[0]).to.equal(0);
    expect(token[1]).to.equal(token.tokenId);
    expect(token[2]).to.equal(await admin.getAddress());
    expect(token[3]).to.equal("write:admin");
    expect(token[4]).to.equal(true);
    expect(token[5]).to.equal(1816960943);
    expect(token[6]).to.equal(false); //revoked == false
    expect(token[7]).to.equal(nonTransferable); // non-transferable == true

    await nftMembership.connect(owner).revoke(1, false);
    token = await nftMembership.connect(owner).viewMembership(1);
    // console.log({ token });
    expect(token[0]).to.equal(0);
    expect(token[1]).to.equal(token.tokenId);
    expect(token[2]).to.equal(await admin.getAddress());
    expect(token[3]).to.equal("write:admin");
    expect(token[4]).to.equal(false); // isAdmin == false
    expect(token[5]).to.equal(1816960943);
    expect(token[6]).to.equal(true); //revoked == true
    expect(token[7]).to.equal(nonTransferable); // non-transferable == true
  });
  it("should revoke an admin's privileges - HARD DELETE", async function () {
    const tx = await nftMembership
      .connect(owner)
      .mint(projectId, await admin.getAddress(), "write:admin", 1816960943, nonTransferable);
    let token = await nftMembership.connect(owner).viewMembership(1);
    // console.log({ token });
    expect(token[0]).to.equal(0);
    expect(token[1]).to.equal(token.tokenId);
    expect(token[2]).to.equal(await admin.getAddress());
    expect(token[3]).to.equal("write:admin");
    expect(token[4]).to.equal(true); 
    expect(token[5]).to.equal(1816960943);
    expect(token[6]).to.equal(false); //revoked == false
    expect(token[7]).to.equal(nonTransferable); // non-transferable == true

    await nftMembership.connect(owner).revoke(1, true);
    token = await nftMembership.connect(owner).viewMembership(1);
    // console.log({ token });
    expect(token[0]).to.equal(BigInt(0));
    expect(token[1]).to.equal(token.tokenId);
    expect(token[2]).to.equal(ethers.ZeroAddress); // address(0) after hard delete
    expect(token[3]).to.equal("");
    expect(token[4]).to.equal(false); // isAdmin == false
    expect(token[5]).to.equal(0n);
    expect(token[6]).to.equal(false); //revoked == false because it's hard deleted
    expect(token[7]).to.equal(false); // non-transferable == false because it's hard deleted

  });
  it.skip("should test expiry on admin privileges", async function () {
    // Mint an admin NFT with an expiry time of 1 hour

    const expirationTime = await time.latest() + 3600; // 1 hour from now
    const tx = await nftMembership
      .connect(owner)
      .mint(projectId, await admin.getAddress(), "write:admin", expirationTime, nonTransferable);

      console.log("expiry: ", expirationTime);
      await time.latestBlock(); // Ensure the block is advanced

      await time.increaseTo(expirationTime + 7200); // Increase time by 2 hours

      const mem = await nftMembership.connect(owner).viewMembership(1);
      console.log("membership: ", Number(mem[7]));

      const currentTime = await time.latest();
      console.log("current time: ", currentTime);
      const dif = currentTime - expirationTime;
      console.log("difference: ", dif);

    await expect(nftMembership.connect(admin).viewMembership(1)).to.be.revertedWith("Write admin membership expired");
  });
  describe("Test View Privileges", function () {
    this.beforeEach(async function () {
        const tx = await nftMembership
      .connect(owner)
      .mint(projectId, await admin.getAddress(), "write:admin", 1916960943, nonTransferable);
    });
    it("should test that view privileges can view a Membership", async function(){
        expect(await nftMembership.connect(admin).viewMembership(1)).to.not.be.reverted
    });
    it("should test that only view privileges can view ALL memberships", async function(){
        const tx = await nftMembership
      .connect(owner)
      .mint(projectId, await vvip.getAddress(), "write:admin", 0, nonTransferable);
      expect(await nftMembership.connect(vvip).viewAllMemberships()).to.not.be.reverted;
 
    });
    it(
      "should test that only view privileges can view ALL tokenIds and memberships", async function(){
        const tx = await nftMembership
      .connect(owner)
      .mint(projectId, await vvip.getAddress(), "write:admin", 0, nonTransferable);
      expect(await nftMembership.connect(vvip).viewAllMembershipsWithTokenIds()).to.not.be.reverted;
      }
    );
  });
});
