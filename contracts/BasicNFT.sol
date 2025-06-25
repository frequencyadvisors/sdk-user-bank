// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BasicNFT is ERC721, Ownable {
    uint256 private _nextTokenId;
    string private _baseTokenURI;
    mapping(uint256 => uint256) private _expirations;
    event NftMinted(uint256 indexed tokenId, address indexed to, uint256 expiration);


    constructor(string memory name_, string memory symbol_, string memory baseTokenURI_)
    ERC721(name_, symbol_)
    Ownable(msg.sender)
    {
        _baseTokenURI = baseTokenURI_;
    }

    function mint(address to, uint256 expiration) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _expirations[tokenId] = expiration;
        emit NftMinted(tokenId, to, expiration);

        return tokenId;
    }

    function getexpiration(uint256 tokenId) external view returns (uint256) {
        return _expirations[tokenId];
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}