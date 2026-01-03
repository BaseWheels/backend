// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BaseWheelsCars
 * @notice ERC721 NFT representing full assembled cars (RWA - Real World Asset)
 * @dev Simplified from complex multi-inheritance to clean ERC721 + Ownable
 *
 * MAJOR CHANGES FROM ORIGINAL:
 * - Removed ERC721URIStorage (unnecessary complexity and gas overhead)
 * - Replaced with baseURI + tokenId pattern (standard, gas-efficient)
 * - Removed AccessControl, using Ownable + authorized minters mapping instead
 * - No more override conflicts (tokenURI, supportsInterface)
 * - Added events for transparency
 * - Cleaner, more maintainable code for hackathon velocity
 *
 * METADATA PATTERN:
 * - baseURI: "https://api.basewheels.com/metadata/cars/"
 * - Token 0 → https://api.basewheels.com/metadata/cars/0
 * - Token 1 → https://api.basewheels.com/metadata/cars/1
 * - Backend serves JSON metadata at these endpoints
 */
contract BaseWheelsCars is ERC721, Ownable {
    // Authorized minters (typically backend services)
    mapping(address => bool) public authorizedMinters;

    // Token ID counter
    uint256 private _nextTokenId;

    // Base URI for metadata (can be updated by owner)
    string private _baseTokenURI;

    // Events
    event MinterAuthorized(address indexed minter, bool authorized);
    event CarMinted(address indexed to, uint256 indexed tokenId);
    event CarBurned(uint256 indexed tokenId, address indexed burner);
    event BaseURIUpdated(string newBaseURI);

    constructor(address backendAdmin) ERC721("BaseWheels RWA", "BWHL") Ownable(msg.sender) {
        // Set initial base URI
        _baseTokenURI = "https://api.basewheels.com/metadata/cars/";

        // Authorize backend admin as minter
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
     * @notice Mint a new car NFT
     * @dev Called by backend after successful fragment assembly or lucky gacha
     * @param to Recipient address
     * @return tokenId The newly minted token ID
     */
    function mintCar(address to) external onlyMinter returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        emit CarMinted(to, tokenId);
        return tokenId;
    }

    /**
     * @notice Burn NFT to claim physical car (redemption)
     * @dev Can be called by token owner or authorized minter (backend)
     * @param tokenId Token to burn
     */
    function burnForRedeem(uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        require(
            msg.sender == owner || authorizedMinters[msg.sender],
            "Not authorized"
        );
        _burn(tokenId);
        emit CarBurned(tokenId, msg.sender);
    }

    /**
     * @notice Update base URI for metadata
     * @dev Only owner can update. Useful for migrating metadata servers
     * @param newBaseURI New base URI (should end with /)
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /**
     * @notice Get the total number of cars minted
     * @return Total supply count
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @notice Override to return baseURI + tokenId
     * @dev Standard ERC721 metadata pattern
     * @param tokenId Token ID to get URI for
     * @return Full metadata URI
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireOwned(tokenId); // Revert if token doesn't exist

        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0
            ? string(abi.encodePacked(baseURI, _toString(tokenId)))
            : "";
    }

    /**
     * @notice Internal function to get base URI
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @notice Helper to convert uint256 to string
     * @dev Copied from OpenZeppelin Strings library to avoid extra import
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
