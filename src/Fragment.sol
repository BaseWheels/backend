// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BaseWheelsFragments
 * @notice ERC1155 token representing car part fragments
 * @dev Simplified from AccessControl to Ownable with authorized minters mapping
 *
 * CHANGES FROM ORIGINAL:
 * - Replaced AccessControl with Ownable + mapping(address => bool) for minters
 * - Simpler gas-efficient authorization pattern
 * - Added events for minting and burning
 * - Removed unnecessary supportsInterface override (ERC1155 handles it)
 * - Added batch mint helper for efficiency
 */
contract BaseWheelsFragments is ERC1155, Ownable {
    // Authorized minters (typically backend services)
    mapping(address => bool) public authorizedMinters;

    // Fragment type constants
    uint256 public constant CHASSIS = 0;
    uint256 public constant WHEELS = 1;
    uint256 public constant ENGINE = 2;
    uint256 public constant BODY = 3;
    uint256 public constant INTERIOR = 4;

    // Events
    event MinterAuthorized(address indexed minter, bool authorized);
    event FragmentMinted(address indexed to, uint256 indexed id, uint256 amount);
    event FragmentsBurned(address indexed from, uint256[] ids, uint256[] amounts);

    constructor(address backendAdmin) ERC1155("https://api.basewheels.com/metadata/fragments/{id}") Ownable(msg.sender) {
        // Owner can grant/revoke minter status
        authorizedMinters[backendAdmin] = true;
        emit MinterAuthorized(backendAdmin, true);
    }

    modifier onlyMinter() {
        require(authorizedMinters[msg.sender], "Not authorized minter");
        _;
    }

    /**
     * @notice Set minter authorization status
     * @param minter Address to authorize/deauthorize
     * @param authorized True to authorize, false to revoke
     */
    function setMinter(address minter, bool authorized) external onlyOwner {
        authorizedMinters[minter] = authorized;
        emit MinterAuthorized(minter, authorized);
    }

    /**
     * @notice Mint fragment to user (called by authorized backend)
     * @dev Used for daily check-in rewards and gacha
     * @param to Recipient address
     * @param id Fragment type ID (0-4)
     * @param amount Quantity to mint
     */
    function mintFragment(address to, uint256 id, uint256 amount) external onlyMinter {
        require(id <= INTERIOR, "Invalid fragment ID");
        _mint(to, id, amount, "");
        emit FragmentMinted(to, id, amount);
    }

    /**
     * @notice Mint multiple fragment types at once (gas optimization)
     * @param to Recipient address
     * @param ids Array of fragment type IDs
     * @param amounts Array of quantities (must match ids length)
     */
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) external onlyMinter {
        _mintBatch(to, ids, amounts, "");
    }

    /**
     * @notice Burn fragments for car assembly
     * @dev Only callable by authorized minter (backend validates assembly requirements)
     * @param user Address whose fragments to burn
     * @param ids Array of fragment type IDs to burn
     * @param amounts Array of quantities to burn
     */
    function burnForAssembly(address user, uint256[] memory ids, uint256[] memory amounts) external onlyMinter {
        _burnBatch(user, ids, amounts);
        emit FragmentsBurned(user, ids, amounts);
    }

    /**
     * @notice Check user's balance of all 5 fragment types
     * @param user Address to check
     * @return Array of balances [CHASSIS, WHEELS, ENGINE, BODY, INTERIOR]
     */
    function checkAllParts(address user) external view returns (uint256[] memory) {
        uint256[] memory balances = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            balances[i] = balanceOf(user, i);
        }
        return balances;
    }

    /**
     * @notice Update metadata URI
     * @param newuri New base URI for metadata
     */
    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }
}
