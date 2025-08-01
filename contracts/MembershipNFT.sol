// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";


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

    /// @dev Maps user address to their membership struct based on the projectId
    /// @dev for Admins, projectId is always 0
    mapping(uint256 projectId => mapping(address user => mapping(string membership => Membership)))
        private _projectToMembership;

    /**
     * @notice Represents a membership with various access levels and properties
     * @param projectId The ID of the project to which the membership belongs. 0 if the user is an admin
     * @param tokenId The unique identifier for the membership NFT
     * @param user The address of the membership holder
     * @param membershipType The type/category of membership (e.g., "write:admin", "read:admin", "vip", "premium', "silver" etc.)
     * @param writeAccess Whether the member is an admin and has write/admin privileges. For admins, this is true if membershipType is "write:admin"
     * @param viewAccess Whether the member has view/read privileges. For admins, this is true if membershipType is "read:admin" or "write:admin"
     * @param expiration Expiration timestamp in seconds (0 means no expiration)
     * @param revoked Whether the membership has been revoked
     * @param nonTransferable If true, the membership cannot be transferred
     */
    struct Membership {
        uint256 projectId; 
        uint256 tokenId;
        address user;
        string membershipType;
        bool isAdmin; 
        bool writeAccess;
        bool viewAccess;
        uint256 expiration; 
        bool revoked;
        bool nonTransferable; 
    }

    event MembershipMinted(uint256 projectId, uint256 indexed tokenId, address indexed to, string membershipType, bool writeAccess, bool viewAccess, uint256 expiration, bool nonTransferable);
    event MembershipRevoked(uint256 indexed tokenId);

    /**
     * @notice Ensures only admins with write access or the owner can call the function
     * @dev Checks if caller is owner or has valid admin membership with write access
     */
    modifier onlyAdmin() {
        if (owner() != msg.sender) {
                Membership memory membership = _projectToMembership[0][msg.sender][
                    "write:admin"
                ];
            require(membership.isAdmin, "Caller is not an admin");
            require(
                membership.writeAccess,
                "Caller does not have write access"
            );
            require(
                membership.expiration == 0 ||
                    membership.expiration > block.timestamp,
                "Admin membership expired"
            );
            require(
                membership.revoked == false,
                "Admin privileges have been revoked"
            );

        }
        _;
    }

    /**
     * @notice Ensures only admins with view access (or higher) or the owner can call the function
     * @dev Checks if caller is owner or has valid admin membership with view or write access
     * @dev if the only is a write:admin or view:admin, then the caller must be the owner
     */
    modifier onlyViewAdmin() {
        if (owner() != msg.sender) {
            Membership memory membershipWrite = _projectToMembership[0][
                msg.sender
            ]["write:admin"];
            Membership memory membershipReadOnly = _projectToMembership[0][
                msg.sender
            ]["read:admin"];
            require(
                membershipWrite.isAdmin || membershipReadOnly.isAdmin,
                "Caller is not a view admin"
            );

            require(
                (membershipWrite.expiration == 0 ||
                    membershipWrite.expiration > block.timestamp) || membershipReadOnly.expiration == 0 ||
                    membershipReadOnly.expiration > block.timestamp,
                "Admin membership expired"
            );
            require(
                membershipWrite.revoked == false ||
                    membershipReadOnly.revoked == false,
                "Admin privileges have been revoked"
            );
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

  
    function mint(uint projectId, address to, string memory membershipType, uint256 expiration, bool nonTransferable) external onlyAdmin() returns (uint256) {
        require(expiration == 0 || expiration > block.timestamp, "Expiration must be in the future or 0 if no expiration");
        _nextTokenId++; 

       if (Strings.equal(membershipType, 'write:admin') || Strings.equal(membershipType, 'read:admin')) {
        Membership memory adminMembership = Membership({
            projectId: 0,
            tokenId: _nextTokenId,
            user: to,
            isAdmin: true,
            membershipType: membershipType,
            writeAccess: Strings.equal(membershipType, 'write:admin'),
            viewAccess: Strings.equal(membershipType, 'read:admin') || Strings.equal(membershipType, 'write:admin'),
            expiration: expiration,
            revoked: false,
            nonTransferable: nonTransferable // if true, the membership cannot be transferred
        });
        _membership[_nextTokenId] = adminMembership;
        _projectToMembership[0][to][membershipType] = adminMembership;
        emit MembershipMinted(0, _nextTokenId, to, membershipType, adminMembership.writeAccess, adminMembership.viewAccess, adminMembership.expiration, adminMembership.nonTransferable);
       } else { 
        // user only memberships 
        Membership memory newMembership = Membership({
            projectId: projectId,
            tokenId: _nextTokenId,
            user: to,
            isAdmin: false,
            membershipType: membershipType, // e.g, "vip", "premium", "silver"
            writeAccess: false,
            viewAccess: false,
            expiration: expiration,
            revoked: false, 
            nonTransferable: nonTransferable 
        });
        _membership[_nextTokenId] = newMembership;
        _projectToMembership[projectId][to][membershipType] = newMembership;
                
        emit MembershipMinted(projectId, _nextTokenId, to, membershipType, newMembership.writeAccess, newMembership.viewAccess, newMembership.expiration, newMembership.nonTransferable);
       } 

        _safeMint(to, _nextTokenId);

        return _nextTokenId;
    }



    /**
     * @notice Revokes a membership either by burning the token or marking it inactive. The revoked Id gets nullified, but nextTokenId is unaffected.
     * @dev Only callable by the contract owner
     * @param tokenId The ID of the membership token to revoke
     * @param hardDelete If true, burns the token; if false, marks as inactive
     * @dev If hardDelete is true, the token is burned and removed from the contract. If false, the membership is marked as revoked but the token remains.
     * @dev Reverts if the tokenId does not exist or if the membership has already been revoked
     * @dev If the membership is an admin, it will revoke the write and view access, and set the isAdmin to false.
     * @dev If the membership is not an admin, it will simply mark the membership as revoked without burning the token.
     * @dev both mappings are updated to reflect the revocation
     * @dev Emits a MembershipRevoked event
     */
    function revoke(uint256 tokenId, bool hardDelete) external onlyAdmin() {
        Membership storage membership= _membership[tokenId];
        require(
            _membership[tokenId].user != address(0),
            "Invalid tokenId: Membership does not exist"
        );
        require(!membership.revoked, "Membership already revoked");

        if (hardDelete) {

            _burn(tokenId);
            delete _membership[tokenId];
            delete _projectToMembership[membership.projectId][membership.user][membership.membershipType];
        } else if(!hardDelete) {
            if (membership.isAdmin) {
                membership.isAdmin = false; 

                if(membership.writeAccess) {
                membership.writeAccess = false;
                membership.viewAccess = false;
                membership.revoked = true;

                Membership storage adminMembership = _projectToMembership[0][membership.user]["write:admin"];
                adminMembership.isAdmin = false;
                adminMembership.writeAccess = false;
                adminMembership.viewAccess = false;
                adminMembership.revoked = true;
                }

            if (membership.viewAccess) {
                membership.viewAccess = false; 
                membership.revoked = true;

                Membership storage readAdminMembership = _projectToMembership[0][membership.user]["read:admin"];
                readAdminMembership.viewAccess = false;
                readAdminMembership.isAdmin = false;
                readAdminMembership.revoked = true;
                }
            } else if(!membership.isAdmin) {
                membership.revoked = true; // Mark membership as revoked and do not burn the token
                _projectToMembership[membership.projectId][membership.user][membership.membershipType].revoked = true;
                }
            }
            emit MembershipRevoked(tokenId);
    }
    


    /**
     * @notice Retrieves membership information for a specific token ID
     * @dev Only callable by view admins or owner
     * @param tokenId The ID of the membership token to query
     * @return The membership struct containing all membership details
     */
    function viewMembership(
        uint256 tokenId
    ) public view onlyViewAdmin returns (Membership memory) {
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
        onlyViewAdmin
        returns (Membership[] memory)
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
        onlyViewAdmin
        returns (uint256[] memory tokenIds, Membership[] memory memberships)
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


    function ownerOf(uint256 tokenId) public view override(ERC721, IERC721) onlyViewAdmin returns (address) {
        return super.ownerOf(tokenId);
    }

    /**
        * @dev See {ERC721-_update}.
        * This function is overridden to handle the membership logic when updating ownership.
        * It ensures that the transfer logic is compatible with the enumerable extension.
        * Transfer should take place if it is a mint or burn, and the caller should be the owner or admin.
        * If the caller is not an owner or admin, check if the membership is non-transferable
        * If the membership is non-transferable, revert the transaction.
        * Both mappings are updated to reflect the transfer.
    */

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        if (msg.sender == owner()) {
            return super._update(to, tokenId, auth);
        }
        Membership storage membership = _membership[tokenId];
        string memory membershipType = membership.membershipType;
        Membership memory adminMembership = _projectToMembership[0][msg.sender]["write:admin"];
        if (adminMembership.isAdmin && (to == address(0) || auth == address(0))) {
            require(adminMembership.writeAccess, "Admin does not have write access");
            require(adminMembership.expiration == 0 || adminMembership.expiration > block.timestamp, "Admin membership expired");
            require(!adminMembership.revoked, "Admin membership is revoked");
            return super._update(to, tokenId, auth);
        } else {
            require(!_membership[tokenId].nonTransferable, "Membership is non-transferable");
            membership.user = to; 
            _projectToMembership[membership.projectId][to][membershipType].user = to; 
            return super._update(to, tokenId, auth);
        }
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
