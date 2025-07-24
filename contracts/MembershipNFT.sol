// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RevokableMembershipNFT is ERC721Enumerable, ERC721Burnable, Ownable {
    struct Membership {
        address user;
        uint256 expirationDate;
        string membershipType;
        bool isActive;
    }

    event MembershipMinted(uint256 indexed tokenId, address indexed to, string membershipType, uint256 expirationDate);
    event MembershipRevoked(uint256 indexed tokenId);

    uint256 private _nextTokenId;
    mapping(uint256 => Membership) private _memberships;
    mapping (address => bool) public isAdmin;
    mapping (address => bool) public isViewAdmin;

    modifier onlyAdmin() {
        require(isAdmin[msg.sender], "Caller is not an admin");
        _;
    }

    modifier onlyViewAdmin() {
        require(isViewAdmin[msg.sender] || isAdmin[msg.sender], "Caller is not an admin or view-only admin");
        _;
    }

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        ERC721Enumerable()
        ERC721Burnable()
        Ownable(msg.sender)
    {
        isAdmin[msg.sender] = true; // Assign the deployer as an admin
    }

    function mint(address to, string memory membershipType, uint256 duration) external onlyAdmin() returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        _memberships[tokenId] = Membership({
            user: to,
            expirationDate: duration,
            membershipType: membershipType,
            isActive: true
        });

        emit MembershipMinted(tokenId, to, membershipType, duration);
        return tokenId;
    }

    function revoke(uint256 tokenId, bool hardDelete) external onlyOwner {
        Membership storage membership = _memberships[tokenId];

        if (isAdmin[membership.user]) {
            isAdmin[membership.user] = false; // Remove admin status if the user is an admin
        }

        if (isViewAdmin[membership.user]) {
            isViewAdmin[membership.user] = false; // Remove view admin status if the user is a view admin
        }

        if (!hardDelete) {
            require(membership.isActive, "Membership already revoked");
            membership.isActive = false; // Mark membership as inactive and do not burn the token
            emit MembershipRevoked(tokenId);
            return;
        } 

        _burn(tokenId);
        delete _memberships[tokenId];
        emit MembershipRevoked(tokenId);
    }

    function viewMembership(uint256 tokenId) public view onlyViewAdmin returns (Membership memory) {
        return _memberships[tokenId];
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