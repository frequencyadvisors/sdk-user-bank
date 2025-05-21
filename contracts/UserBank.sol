// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title UserBank - Upgradeable contract for mapping project addresses to GUIDs
/// @notice Only the contract owner can set mappings; anyone can read them
contract UserBank is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    // Mapping from project address (as string) to project GUID (as string)
    mapping(string => string) private projectGuidToAddress;

    /// @notice Disables initializers on the logic contract to prevent misuse
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // Prevents logic contract from being initialized
    }

    /// @notice Initializes the contract, setting the owner and enabling upgrades
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    /// @notice Authorizes contract upgrades; only callable by the owner
    /// @param newImplementation The address of the new contract implementation
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @notice Sets the mapping from a project address to a GUID
    /// @dev Only callable by the contract owner
    /// @param guid The project GUID to associate
    /// @param addr The project address to map
    function setProjectGuidToAddress(string calldata guid, string calldata addr) external onlyOwner {
        projectGuidToAddress[addr] = guid;
    }

    /// @notice Retrieves the GUID associated with a given project address
    /// @param addr The project address to look up
    /// @return The associated project GUID
    function getProjectGuid(string calldata addr) external view returns (string memory) {
        return projectGuidToAddress[addr];
    }

}