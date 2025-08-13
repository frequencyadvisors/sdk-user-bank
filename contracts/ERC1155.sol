// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
/**
 * @title SimpleERC1155
 * @dev A simple implementation of ERC1155 with optional expiration and transfer restrictions.
 */
/** * @dev This contract extends the OpenZeppelin ERC1155 implementation to include metadata management
 * and transfer restrictions. It allows the owner to mint tokens with specific metadata, including expiration and transferability
 * settings. The contract also overrides the `_update` function to handle transfer restrictions based on the `transferable` flag in the metadata.
 */
contract SimpleERC1155 is ERC1155, Ownable {

    mapping(uint256 => Metadata) private _tokenMetadata;

    struct Metadata {
        bool exists;
        uint256 expiration;
        bool transferable; 
    }

    event ERC1155Minted(address indexed to, uint256 indexed id, uint256 amount, uint256 expiration, bool transferable, string uri, bytes data);

    constructor(string memory uri) ERC1155(uri) Ownable(msg.sender) {
        _setURI(uri);
    }

    /**
     * @dev Mints a new token with the specified ID, amount, expiration, and transferability.
     * @param to The address to mint the token to.
     * @param id The ID of the token to mint.
     * @param amount The amount of tokens to mint.
     * @param expiration The expiration timestamp of the token (0 if no expiration).
     * @param transferable Whether the token is transferable or not.
     * @param data Additional data to pass with the minting operation.
     * @notice This function can only be called by the owner of the contract.
     * @notice The token ID must be greater than zero, and the amount must be greater than zero.
     * @notice If the token metadata does not exist, the expiration must be in the future or zero if there is no expiration.
     * @notice Emits an `ERC1155Minted` event.
     */

    function mint(address to, uint256 id, uint256 amount, uint256 expiration, bool transferable, bytes memory data) public onlyOwner {
        require(id > 0, "Token ID must be greater than zero");
        require(amount > 0, "Amount must be greater than zero");
        require(to != address(0), "Cannot mint to the zero address");

        if(!_tokenMetadata[id].exists) {
            require(expiration == 0 || expiration > block.timestamp, "Expiration must be in the future or 0 if no expiration");
        _setTokenMetadata(id, expiration, transferable);
        } 
        _mint(to, id, amount, data);
        emit ERC1155Minted(to, id, amount, expiration, transferable, uri(id), data);
    }


    /**
     * @dev Updates the metadata for a given token ID.
     * @param id The ID of the token to update metadata for.
     * @param expiration The expiration timestamp of the token (0 if no expiration).
     * @param transferable Whether the token is transferable or not.
     * @notice This function can only be called by the owner of the contract.
     */

    function updateMetadata(uint256 id, uint256 expiration, bool transferable) public onlyOwner {
        require(_tokenMetadata[id].exists, "Token ID does not exist");
        require(expiration == 0 || expiration > block.timestamp, "Expiration must be in the future or 0 if no expiration");
        _setTokenMetadata(id, expiration, transferable);
    }

    /**
     * @dev Returns the metadata for a given token ID.
     * @param id The ID of the token to retrieve metadata for.
     * @return Metadata struct containing the token's metadata.
     */

    function getMetadata(uint256 id) public view returns (Metadata memory) {
        return _tokenMetadata[id];
    }

    /**
     * @dev Sets the metadata for a given token ID.
     * @param id The ID of the token to set metadata for.
     * @param expiration The expiration timestamp of the token (0 if no expiration).
     * @param transferable Whether the token is transferable or not.
     * @notice This function can only be called by the owner of the contract.
     */

    function _setTokenMetadata(uint256 id, uint256 expiration, bool transferable) internal {
        Metadata memory metadata = Metadata({
            exists: true,
            expiration: expiration,
            transferable: transferable
        });
        _tokenMetadata[id] = metadata;
    }
    
    /**
     * @dev Overrides the OpenZeppelin `_update` function to handle transfer restrictions based on the `transferable` flag in the metadata.
     * @param from The address from which tokens are being transferred.
     * @param to The address to which tokens are being transferred.
     * @param ids An array of token IDs being transferred.
     * @param values An array of amounts corresponding to each token ID being transferred.
     * @notice This function checks if the token is transferable before allowing the transfer.
     */

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override(ERC1155) {
        require(ids.length > 0, "ERC1155: ids is empty");
        require(values.length > 0, "ERC1155: amount is empty");
        require(ids.length == values.length, "ERC1155: ids and values length mismatch");
        if (msg.sender == owner() &&  (from == address(0) || to == address(0))) {
            super._update(from, to, ids, values);
        } else {
            for (uint256 i = 0; i < ids.length; ++i) {
                require(ids[i] > 0, "ERC1155: token id must be greater than zero");
                require(_tokenMetadata[ids[i]].exists, string.concat("token id ", Strings.toString(ids[i]), " does not exist"));
                require(_tokenMetadata[ids[i]].transferable, string.concat("token id ", Strings.toString(ids[i]), " is non-transferable"));
                super._update(from, to, ids, values);
            }

        }

    }
}