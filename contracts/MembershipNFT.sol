// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RevokableMembershipNFT is ERC721Enumerable, ERC721Burnable, Ownable {
    struct Membership {
        uint256 expirationDate;
        string membershipType;
        bool isActive;
    }

    event MembershipMinted(uint256 indexed tokenId, address indexed to, string membershipType, uint256 expirationDate);
    event MembershipRevoked(uint256 indexed tokenId);

    uint256 private _nextTokenId;
    mapping(uint256 => Membership) private _memberships;

    constructor(string memory name_, string memory symbol_)
    ERC721(name_, symbol_)
    {}

    function mint(address to, string memory membershipType, uint256 duration) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        _memberships[tokenId] = Membership({
            expirationDate: duration,
            membershipType: membershipType,
            isActive: true
        });

        emit MembershipMinted(tokenId, to, membershipType, duration);
        return tokenId;
    }

    function revoke(uint256 tokenId, bool hardDelete) external onlyOwner {
        emit MembershipRevoked(tokenId);
        if (!hardDelete) {
            Membership storage membership = _memberships[tokenId];
            require(membership.isActive, "Membership already revoked");
            membership.isActive = false;
            emit MembershipRevoked(tokenId);
            return;
        }

        _burn(tokenId);
        delete _memberships[tokenId];
        emit MembershipRevoked(tokenId);
    }

    function membership(uint256 tokenId) public view returns (Membership memory) {
        return _memberships[tokenId];
    }

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    // Properly override required OpenZeppelin hooks

    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721, ERC721Enumerable)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
}