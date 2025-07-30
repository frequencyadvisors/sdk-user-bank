// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title RevokableMembershipNFT
 * @author FREEQ
 * @notice A smart contract for managing membership NFTs with different access levels and revocation capabilities
 * @dev Extends ERC721Enumerable, ERC721Burnable, and Ownable to provide a comprehensive membership system
 */
contract RevokableMembershipNFT is ERC721Enumerable, ERC721Burnable, Ownable {
    /// @dev Counter for generating unique token IDs
    uint256 private _nextTokenId;

    /// @dev Maps token ID to membership struct
    mapping(uint256 => Membership) private _membership;

    /// @dev Maps user address to their membership struct
    mapping(address => mapping(string => Membership))
        private _addressToMembership;

    mapping(address => bool) private _onlyViewAdmin;

    /**
     * @notice Represents a membership with various access levels and properties
     * @param tokenId The unique identifier for the membership NFT
     * @param user The address of the membership holder
     * @param membershipType The type/category of membership (e.g., "write:admin", "read:admin")
     * @param writeAccess Whether the member has write/admin privileges
     * @param viewAccess Whether the member has view/read privileges
     * @param duration Expiration timestamp in seconds (0 means no expiration)
     * @param revoked Whether the membership is currently active
     */
    struct Membership {
        uint256 tokenId;
        address user;
        string membershipType;
        bool writeAccess;
        bool viewAccess;
        uint256 duration; // Duration in seconds, 0 means no expiration
        bool revoked;
    }

    /**
     * @notice Emitted when a new membership NFT is minted
     * @param tokenId The ID of the newly minted token
     * @param to The address receiving the membership
     * @param membershipType The type of membership granted
     * @param writeAccess Whether write access was granted
     * @param viewAccess Whether view access was granted
     * @param duration The expiration timestamp of the membership
     */
    event MembershipMinted(
        uint256 indexed tokenId,
        address indexed to,
        string membershipType,
        bool writeAccess,
        bool viewAccess,
        uint256 duration
    );

    /**
     * @notice Emitted when a membership is revoked
     * @param tokenId The ID of the revoked membership token
     */
    event MembershipRevoked(uint256 indexed tokenId);

    /**
     * @notice Emitted when a membership's properties are updated
     * @param tokenId The ID of the updated membership token
     * @param user The address of the membership holder
     * @param membershipType The updated membership type
     * @param writeAccess The updated write access status
     * @param viewAccess The updated view access status
     * @param duration The updated expiration timestamp
     */
    event MembershipUpdated(
        uint256 indexed tokenId,
        address indexed user,
        string membershipType,
        bool writeAccess,
        bool viewAccess,
        uint256 duration
    );

    /**
     * @notice Ensures only admins with write access or the owner can call the function
     * @dev Checks if caller is owner or has valid admin membership with write access
     */
    modifier onlyAdmin(string memory membershipType) {
        if (owner() != msg.sender) {
            Membership memory membership = _addressToMembership[msg.sender][
                membershipType
            ];
            require(membership.writeAccess, "Caller is not an admin");
            require(
                membership.duration == 0 ||
                    membership.duration > block.timestamp,
                "Admin membership expired"
            );
        }
        _;
    }

    /**
     * @notice Ensures only admins with view access (or higher) or the owner can call the function
     * @dev Checks if caller is owner or has valid admin membership with view or write access
     */
    modifier onlyViewAdmin() {
        if (owner() != msg.sender) {
            Membership memory membershipWrite = _addressToMembership[
                msg.sender
            ]["write:admin"];
            Membership memory membershipReadOnly = _addressToMembership[
                msg.sender
            ]["read:admin"];
            bool canView = _onlyViewAdmin[msg.sender];

            require(
                // membershipRead.viewAccess || membershipWrite.viewAccess,
                canView,
                "Caller is not an admin"
            );
            require(
                (membershipWrite.duration == 0 ||
                    membershipWrite.duration > block.timestamp) ||
                    (membershipRead.duration == 0 ||
                        membershipRead.duration > block.timestamp),
                "Admin membership expired"
            );

          // allow if write access revoked is false OR if read access revoked is false;
          require(membershipWrite.revoked == false || membershipReadOnly.revoked == false, "Admin privilges have been revoked");
        }
        _;
    }

    /**
     * @notice Initializes the RevokableMembershipNFT contract
     * @param name_ The name of the NFT collection
     * @param symbol_ The symbol of the NFT collection
     */
    constructor(
        string memory name_,
        string memory symbol_
    )
        ERC721(name_, symbol_)
        ERC721Enumerable()
        ERC721Burnable()
        Ownable(msg.sender)
    {}

    /**
     * @notice Mints a new membership NFT to the specified address
     * @dev Only callable by admins or owner. Automatically sets access levels based on membership type
     * @param to The address to receive the membership NFT
     * @param membershipType The type of membership ("write:admin", "read:admin", or other)
     * @param duration The duration in seconds until the membership expires
     * @return The token ID of the newly minted membership NFT
     */
    function mint(
        address to,
        string memory membershipType,
        uint256 duration
    ) external onlyAdmin(membershipType) returns (uint256) {
        _nextTokenId++;

        if (
            Strings.equal(membershipType, "write:admin") ||
            Strings.equal(membershipType, "read:admin")
        ) {
            Membership memory adminMembership = Membership({
                tokenId: _nextTokenId,
                user: to,
                membershipType: membershipType,
                writeAccess: Strings.equal(membershipType, "write:admin")
                    ? true
                    : false,
                viewAccess: Strings.equal(membershipType, "read:admin") ||
                    Strings.equal(membershipType, "write:admin")
                    ? true
                    : false,
                duration: block.timestamp + duration,
                revoked: true
            });

            _addressToMembership[to][membershipType] = adminMembership;
            _membership[_nextTokenId] = adminMembership;
            _onlyViewAdmin[to] = true;

            emit MembershipMinted(
                _nextTokenId,
                to,
                membershipType,
                adminMembership.writeAccess,
                adminMembership.viewAccess,
                adminMembership.duration
            );
        } else {
            Membership memory newMembership = Membership({
                tokenId: _nextTokenId,
                user: to,
                membershipType: membershipType,
                writeAccess: false,
                viewAccess: false,
                duration: block.timestamp + duration,
                isActive: true
            });
            _membership[_nextTokenId] = newMembership;
            _addressToMembership[to][membershipType] = newMembership;

            emit MembershipMinted(
                _nextTokenId,
                to,
                membershipType,
                newMembership.writeAccess,
                newMembership.viewAccess,
                newMembership.duration
            );
        }

        _nextTokenId++;
        _safeMint(to, _nextTokenId);

        return _nextTokenId;
    }

    /**
     * @notice Updates the access permissions and duration of an existing admin membership
     * @dev Only callable by admins or owner. The target membership must be active
     * @param admin The address of the admin whose membership to update
     * @param writeAccess Whether to grant write access
     * @param viewAccess Whether to grant view access
     * @param duration The new expiration timestamp for the membership
     */
    function updateAdmin(
        address admin,
        bool writeAccess,
        bool viewAccess,
        uint256 duration,
        string memory membershipType
    ) external onlyAdmin(membershipType) {
        Membership memory membership = _addressToMembership[admin][
            membershipType
        ];
        require(membership.isActive, "Membership is not active");
        membership.writeAccess = writeAccess;
        membership.viewAccess = viewAccess;
        membership.duration = duration;

        _addressToMembership[admin][membershipType] = membership;
        _membership[membership.tokenId] = membership;
        emit MembershipUpdated(
            membership.tokenId,
            admin,
            membership.membershipType,
            writeAccess,
            viewAccess,
            duration
        );
    }

    /**
     * @notice Revokes a membership either by burning the token or marking it inactive
     * @dev Only callable by the contract owner
     * @param tokenId The ID of the membership token to revoke
     * @param hardDelete If true, burns the token; if false, marks as inactive
     */
    function revoke(uint256 tokenId, bool hardDelete) external onlyOwner {
        Membership storage membership = _membership[tokenId];

        if (hardDelete) {
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
            require(membership.isActive, "Membership already revoked");
            membership.isActive = false; // Mark membership as inactive and do not burn the token

            emit MembershipRevoked(tokenId);
        }
    }

    /**
     * @notice Retrieves membership information for a specific token ID
     * @dev Only callable by view admins or owner
     * @param tokenId The ID of the membership token to query
     * @return The membership struct containing all membership details
     */
    function viewMembership(
        uint256 tokenId
    )
        public
        view
        returns (
            // onlyViewAdmin
            Membership memory
        )
    {
        return _membership[tokenId];
    }

    /**
     * @notice Retrieves all existing memberships
     * @dev Only callable by view admins or owner. Returns array of all membership structs
     * @return Array of all membership structs
     */
    function viewAllMemberships()
        public
        view
        returns (
            // onlyViewAdmin
            Membership[] memory
        )
    {
        uint256 totalSupply = totalSupply();
        Membership[] memory allMemberships = new Membership[](totalSupply);

        for (uint256 i = 0; i < totalSupply; i++) {
            uint256 tokenId = tokenByIndex(i);
            allMemberships[i] = _membership[tokenId];
        }

        return allMemberships;
    }

    /**
     * @notice Retrieves all memberships along with their corresponding token IDs
     * @dev Only callable by view admins or owner
     * @return tokenIds Array of token IDs
     * @return memberships Array of corresponding membership structs
     */
    function viewAllMembershipsWithTokenIds()
        public
        view
        returns (
            // onlyViewAdmin
            uint256[] memory tokenIds,
            Membership[] memory memberships
        )
    {
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

    /**
     * @notice Returns the next token ID that will be minted
     * @return The next available token ID
     */
    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @dev Internal function to increase balance, required for ERC721Enumerable
     * @param account The account whose balance to increase
     * @param value The amount to increase by
     */
    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    /**
     * @dev Internal function to update token ownership, required for ERC721Enumerable
     * @param to The new owner of the token
     * @param tokenId The ID of the token being transferred
     * @param auth The address authorized to make the transfer
     * @return The previous owner of the token
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Checks if the contract supports a given interface
     * @dev Required for ERC721Enumerable compatibility
     * @param interfaceId The interface identifier to check
     * @return True if the interface is supported
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
