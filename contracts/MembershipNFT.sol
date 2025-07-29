// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";


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
    }

    event MembershipMinted(uint256 indexed tokenId, address indexed to, string membershipType, bool writeAccess, bool viewAccess, uint256 expiration);
    event MembershipRevoked(uint256 indexed tokenId);
    event MembershipUpdated(uint256 indexed tokenId, address indexed user, string membershipType, bool writeAccess, bool viewAccess, uint256 expiration);



    // Modifier to check if the caller is an admin or the owner. If admin, the expiration date must be in the future or 0.
    modifier onlyAdmin() {
        if (owner() != msg.sender) {
        Membership memory membership = _addressToMembership[msg.sender];
        require(membership.writeAccess, "Caller is not an admin");
        require(membership.expiration == 0 || membership.expiration > block.timestamp, "Admin membership expired");
        }
        _;
    }

    modifier onlyViewAdmin() {
        if (owner() != msg.sender) {
        Membership memory membership = _addressToMembership[msg.sender];
        require(membership.viewAccess || membership.writeAccess, "Caller is not a view admin");
        require(membership.expiration == 0 || membership.expiration > block.timestamp, "Admin membership expired");
        }
        _;
    }

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        ERC721Enumerable()
        ERC721Burnable()
        Ownable(msg.sender)
    {}

  
    function mint(address to, string memory membershipType, uint256 expiration) external onlyAdmin() returns (uint256) {
        require(expiration == 0 || expiration > block.timestamp, "Expiration must be in the future or 0 if no expiration");
        _nextTokenId++; 

       if (Strings.equal(membershipType, 'write:admin') || Strings.equal(membershipType, 'read:admin')) {
        Membership memory adminMembership = Membership({
            tokenId: _nextTokenId,
            user: to,
            membershipType: membershipType,
            writeAccess: Strings.equal(membershipType, 'write:admin') ? true : false,
            viewAccess: Strings.equal(membershipType, 'read:admin') ? true : false,
            expiration: expiration,
            revoked: false
        });
        _addressToMembership[to] = adminMembership;
        _membership[_nextTokenId] = adminMembership;

        emit MembershipMinted(_nextTokenId, to, membershipType, adminMembership.writeAccess, adminMembership.viewAccess, adminMembership.expiration);
       } else { 
        // user only memberships 
        Membership memory newMembership = Membership({
            tokenId: _nextTokenId,
            user: to,
            membershipType: membershipType, // e.g, "vip", "premium", "silver"
            writeAccess: false,
            viewAccess: false,
            expiration: expiration,
            revoked: false
        });
        _membership[_nextTokenId] = newMembership;
        _addressToMembership[to] = newMembership;
        
        emit MembershipMinted(_nextTokenId, to, membershipType, newMembership.writeAccess, newMembership.viewAccess, newMembership.expiration);
       } 

        _safeMint(to, _nextTokenId);

        return _nextTokenId;
    }

    function updateAdmin(address admin, bool writeAccess, bool viewAccess, uint256 expiration) external onlyAdmin {
        Membership memory membership = _addressToMembership[admin];
        require(!membership.revoked, "Membership is revoked");
        membership.writeAccess = writeAccess;
        membership.viewAccess = viewAccess;
        membership.expiration = expiration;

        _addressToMembership[admin] = membership;
        _membership[membership.tokenId] = membership;
        emit MembershipUpdated(membership.tokenId, admin, membership.membershipType, writeAccess, viewAccess, expiration);
    }

    // if hard delete is true, the token will be burned and removed from the mapping
    // if hard delete is false, the token will not be burned but the membership will be
    // marked as inactive
    function revoke(uint256 tokenId, bool hardDelete) external onlyOwner {
        Membership storage membership = _membership[tokenId];
        require(_membership[tokenId].user != address(0), "Invalid tokenId: Membership does not exist");

        if(hardDelete) {
        _burn(tokenId);
        delete _membership[tokenId];
        emit MembershipRevoked(tokenId);
        } else {}

        if (membership.writeAccess) {
            membership.writeAccess = false; // Remove admin status if the user is an admin
        }

        if (membership.viewAccess) {
            membership.viewAccess = false; // Remove view admin status if the user is a view admin
        }

        if (!hardDelete) {
            require(!membership.revoked, "Membership already revoked");
            membership.revoked = true; // Mark membership as revoked and do not burn the token

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

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
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