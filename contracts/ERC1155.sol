// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
/**
 * @title SimpleERC1155
 * @dev A simple implementation of ERC1155 with metadata and transfer restrictions.
 */
/** * @dev This contract extends the OpenZeppelin ERC1155 implementation to include metadata management
 * and transfer restrictions. It allows the owner to mint tokens with specific metadata, including expiration and transferability
 * settings. The contract also overrides the `_update` function to handle transfer restrictions based on the `nonTransferable` flag in the metadata.
 */
contract SimpleERC1155 is ERC1155, Ownable {
    
    mapping(uint256 id => mapping(address user => Metadata)) private _tokenMetadata;

    struct Metadata {
        uint256 id;
        address user;
        uint256 amount;
        uint256 expiration;
        bool nonTransferable; 
    }

    event ERC1155Minted(address indexed to, uint256 indexed id, uint256 amount, uint256 expiration, bool nonTransferable, string uri, bytes data);

    constructor(string memory uri) ERC1155(uri) Ownable(msg.sender) {
        _setURI(uri);
    }



    function mint(address to, uint256 id, uint256 amount, uint256 expiration, bool nonTransferable, bytes memory data) public onlyOwner {
        require(to != address(0), "Cannot mint to the zero address");
        require(expiration == 0 || expiration > block.timestamp, "Expiration must be in the future or 0 if no expiration");
        require(id > 0, "Token ID must be greater than zero");
        _setTokenMetadata(to, id, amount, expiration, nonTransferable);
        _mint(to, id, amount, data);
        emit ERC1155Minted(to, id, amount, expiration, nonTransferable, uri(id), data);
    }

    function getMetatadata(uint256 id, address user) public view returns (Metadata memory) {
        return _tokenMetadata[id][user];
    }

    function _setTokenMetadata(address to, uint256 id, uint256 amount, uint256 expiration, bool nonTransferable) internal {
        Metadata memory metadata = Metadata({
            id: id,
            user: to,
            amount: amount,
            expiration: expiration,
            nonTransferable: nonTransferable
        });
        _tokenMetadata[id][to] = metadata;
    }
    
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override(ERC1155) {
        require(ids.length > 0, "ERC1155: ids is empty");
        require(values.length > 0, "ERC1155: amount is empty");
        require(ids.length == values.length, "ERC1155: ids and values length mismatch");
        if (msg.sender == owner() &&  (from == address(0) || to == address(0))) {
            super._update(from, to, ids, values);
        } else {
            for (uint256 i = 0; i < ids.length; ++i) {
                require(!_tokenMetadata[ids[i]][from].nonTransferable, "ERC1155 is non-transferable");
                super._update(from, to, ids, values);

                // update metadata for the token being transferred
                _tokenMetadata[ids[i]][to].user = to;
                _tokenMetadata[ids[i]][to].amount += values[i];
                _tokenMetadata[ids[i]][to].id = ids[i];
                _tokenMetadata[ids[i]][to].expiration = _tokenMetadata[ids[i]][from].expiration;
                _tokenMetadata[ids[i]][to].nonTransferable = _tokenMetadata[ids[i]][from].nonTransferable;
                // Update the amount in the sender's metadata
                _tokenMetadata[ids[i]][from].amount -= values[i];
            }

        }

    }
}