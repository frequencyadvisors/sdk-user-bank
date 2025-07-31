// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";


contract RevokableMembershipNFT is ERC721Enumerable, ERC721Burnable, Ownable {

    uint256 private _nextTokenId;
    mapping(uint256 => Membership) private _membership;
    mapping (address => Membership) private _addressToMembership;


    struct Membership {
        uint256 tokenId;
        address user;
        string membershipType; // e.g. "write:admin" = write only access, "read:admin" = read only access, "vip", "premium', "silver" etc.
        bool writeAccess;
        bool viewAccess;
        uint256 expiration; // expiration date in seconds, 0 means no expiration
        bool revoked;
        bool nonTransferable; // if true, the membership cannot be transferred 
    }

    event MembershipMinted(uint256 indexed tokenId, address indexed to, string membershipType, bool writeAccess, bool viewAccess, uint256 expiration, bool nonTransferable);
    event MembershipRevoked(uint256 indexed tokenId);
    event MembershipUpdated(uint256 indexed tokenId, address indexed user, string membershipType, bool writeAccess, bool viewAccess, uint256 expiration, bool nonTransferable);



    // Modifier to check if the caller is an admin or the owner. If admin, the expiration date must be in the future or 0.
    modifier onlyAdmin() {
        if (owner() != msg.sender) {
        Membership memory membership = _addressToMembership[msg.sender];
        require(membership.writeAccess, "Caller is not an admin");
        require(membership.expiration == 0 || membership.expiration > block.timestamp, "Admin membership expired");
        require(!membership.revoked, "Admin membership is revoked");
        }
        _;
    }

    modifier onlyViewAdmin() {
        if (owner() != msg.sender) {
        Membership memory membership = _addressToMembership[msg.sender];
        require(membership.viewAccess || membership.writeAccess, "Caller is not a view admin");
        require(membership.expiration == 0 || membership.expiration > block.timestamp, "Admin membership expired");
        require(!membership.revoked, "Admin membership is revoked");

        }
        _;
    }

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        ERC721Enumerable()
        ERC721Burnable()
        Ownable(msg.sender)
    {}

  
    function mint(address to, string memory membershipType, uint256 expiration, bool nonTransferable) external onlyAdmin() returns (uint256) {
        require(expiration == 0 || expiration > block.timestamp, "Expiration must be in the future or 0 if no expiration");
        _nextTokenId++; 

       if (Strings.equal(membershipType, 'write:admin') || Strings.equal(membershipType, 'read:admin')) {
        Membership memory adminMembership = Membership({
            tokenId: _nextTokenId,
            user: to,
            membershipType: membershipType,
            writeAccess: Strings.equal(membershipType, 'write:admin'),
            viewAccess: Strings.equal(membershipType, 'read:admin') || Strings.equal(membershipType, 'write:admin'),
            expiration: expiration,
            revoked: false,
            nonTransferable: nonTransferable // if true, the membership cannot be transferred
        });
        _addressToMembership[to] = adminMembership;
        _membership[_nextTokenId] = adminMembership;
        emit MembershipMinted(_nextTokenId, to, membershipType, adminMembership.writeAccess, adminMembership.viewAccess, adminMembership.expiration, adminMembership.nonTransferable);
       } else { 
        // user only memberships 
        Membership memory newMembership = Membership({
            tokenId: _nextTokenId,
            user: to,
            membershipType: membershipType, // e.g, "vip", "premium", "silver"
            writeAccess: false,
            viewAccess: false,
            expiration: expiration,
            revoked: false, 
            nonTransferable: nonTransferable 
        });
        _membership[_nextTokenId] = newMembership;
        _addressToMembership[to] = newMembership;
        
        emit MembershipMinted(_nextTokenId, to, membershipType, newMembership.writeAccess, newMembership.viewAccess, newMembership.expiration, newMembership.nonTransferable);
       } 

        _safeMint(to, _nextTokenId);

        return _nextTokenId;
    }

    function updateAdmin(address admin, bool writeAccess, bool viewAccess, uint256 expiration, bool nonTransferable) external onlyAdmin {
        Membership storage membership = _addressToMembership[admin];
        require(membership.user != address(0), "Admin does not exist");
        require(!membership.revoked, "Membership is revoked");
        
        membership.writeAccess = writeAccess;
        membership.viewAccess = viewAccess;
        membership.expiration = expiration;
        membership.nonTransferable = nonTransferable; 

        _membership[membership.tokenId] = membership;
        emit MembershipUpdated(membership.tokenId, admin, membership.membershipType, writeAccess, viewAccess, expiration, nonTransferable);
    }
    /**
     * @dev Handles the deletion of a membership NFT.
     * If `hard delete` is set to true, the token will be permanently burned and removed from the internal mapping.
     * If `hard delete` is set to false, the token will remain, but the membership status will be marked as inactive.
     * This allows for both reversible (soft) and irreversible (hard) deletion of memberships.
     *
     * @param hardDelete Boolean flag indicating whether to perform a hard or soft delete.
     */

    function revoke(uint256 tokenId, bool hardDelete) external onlyAdmin {
    Membership storage membership = _membership[tokenId];
    require(membership.user != address(0), "Invalid tokenId: Membership does not exist");

    if (hardDelete) {
        address memberAddress = membership.user;
        _burn(tokenId);
        delete _membership[tokenId];
        delete _addressToMembership[memberAddress];
        emit MembershipRevoked(tokenId);
    } else {
        require(!membership.revoked, "Membership already revoked");
        membership.revoked = true;
        membership.writeAccess = false;
        membership.viewAccess = false;
        
        // Update address mapping as well
        _addressToMembership[membership.user] = membership;
        emit MembershipRevoked(tokenId);
    }
}


    function viewMembership(uint256 tokenId) public view onlyViewAdmin returns (Membership memory) {
        return _membership[tokenId];
    }

    function viewAllMemberships() public view onlyViewAdmin returns (Membership[] memory) {
        uint256 totalSupply = totalSupply();
        Membership[] memory allMemberships = new Membership[](totalSupply);
        
        for (uint256 i = 0; i < totalSupply; i++) {
            uint256 tokenId = tokenByIndex(i);
            allMemberships[i] = _membership[tokenId];
        }
        
        return allMemberships;
    }

    function viewAllMembershipsWithTokenIds() public view onlyViewAdmin returns (uint256[] memory tokenIds, Membership[] memory memberships) {
        uint256 totalSupply = totalSupply();
        tokenIds = new uint256[](totalSupply);
        memberships = new Membership[](totalSupply);
        
        for (uint256 i = 0; i < totalSupply; i++) {
            uint256 tokenId = tokenByIndex(i);
            tokenIds[i] = tokenId;
            memberships[i] = _membership[tokenId];
        }
        
        return (tokenIds, memberships);
    }

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function ownerOf(uint256 tokenId) public view override(ERC721, IERC721) onlyViewAdmin returns (address) {
    return super.ownerOf(tokenId);
    }

    /**
        * @dev See {ERC721-_update}.
        * This function is overridden to ensure that the transfer logic is compatible with the enumerable extension.
        * It allows for the transfer of tokens while maintaining the enumerable state.
        * Transfer should take place if it is a mint or burn, and the caller should be the owner or admin.
        * If the caller is not an owner or adminer, check if the membership is non-transferable
    */

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        Membership memory membership = _addressToMembership[msg.sender];
        if((msg.sender == owner() || membership.writeAccess) && (to == address(0) || auth == address(0))) {
        require(membership.expiration == 0 || membership.expiration > block.timestamp, "Admin membership expired");
        require(!membership.revoked, "Admin membership is revoked");
            return super._update(to, tokenId, auth);
        } else {
            require(!_membership[tokenId].nonTransferable, "Membership is non-transferable");

        }
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721, ERC721Enumerable)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

}