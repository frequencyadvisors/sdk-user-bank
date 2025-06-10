// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MembershipNFT is ERC721Burnable, Ownable {
    struct Membership {
        uint256 expirationDate; // Timestamp when the membership expires
        string membershipType;
    }

    event MembershipMinted(uint256 indexed tokenId, address indexed to, string membershipType, uint256 expirationDate);
    event MembershipRevoked(uint256 indexed tokenId);
    uint256 private _nextTokenId;
    mapping(uint256 => Membership) private _memberships;

    constructor(string memory name_, string memory symbol_)
    ERC721(name_, symbol_) Ownable(msg.sender)
    {}

    /// @notice Mint a new NFT to the specified address
    function mint(address to, string memory membershipType, uint256 duration) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        _memberships[tokenId] = Membership({
            expirationDate: duration,
            membershipType: membershipType
        });

        emit MembershipMinted(tokenId, to, membershipType, duration);
        return tokenId;
    }

    /// @notice Revoke (burn) a specific tokenId from any user
    function revoke(uint256 tokenId) external onlyOwner {
        _burn(tokenId);
        delete _memberships[tokenId];
        emit MembershipRevoked(tokenId);
    }

    /// @notice Returns the metadata URI for a token
    function membership(uint256 tokenId) public view returns (Membership memory) {
        return _memberships[tokenId];
    }

    /// @notice Get the next token ID to be minted
    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}