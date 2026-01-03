// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../script/Fullcar.s.sol";

contract BaseWheelsCarsTest is Test {
    BaseWheelsCars public cars;
    address public owner;
    address public backendAdmin;
    address public user1;
    address public user2;

    event MinterAuthorized(address indexed minter, bool authorized);
    event CarMinted(address indexed to, uint256 indexed tokenId);
    event CarBurned(uint256 indexed tokenId, address indexed burner);
    event BaseURIUpdated(string newBaseURI);

    function setUp() public {
        owner = address(this);
        backendAdmin = makeAddr("backendAdmin");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        cars = new BaseWheelsCars(backendAdmin);
    }

    // Test deployment and initial state
    function testDeploymentSetsOwnerCorrectly() public view {
        assertEq(cars.owner(), owner);
    }

    function testBackendAdminIsAuthorizedOnDeploy() public view {
        assertTrue(cars.authorizedMinters(backendAdmin));
    }

    function testNameAndSymbol() public view {
        assertEq(cars.name(), "BaseWheels RWA");
        assertEq(cars.symbol(), "BWHL");
    }

    function testInitialTotalSupply() public view {
        assertEq(cars.totalSupply(), 0);
    }

    // Test minting functionality
    function testBackendCanMintCar() public {
        vm.expectEmit(true, true, false, false);
        emit CarMinted(user1, 0);

        vm.prank(backendAdmin);
        uint256 tokenId = cars.mintCar(user1);

        assertEq(tokenId, 0);
        assertEq(cars.ownerOf(tokenId), user1);
        assertEq(cars.totalSupply(), 1);
    }

    function testMintMultipleCars() public {
        vm.startPrank(backendAdmin);

        uint256 tokenId1 = cars.mintCar(user1);
        uint256 tokenId2 = cars.mintCar(user1);
        uint256 tokenId3 = cars.mintCar(user2);

        vm.stopPrank();

        assertEq(tokenId1, 0);
        assertEq(tokenId2, 1);
        assertEq(tokenId3, 2);

        assertEq(cars.ownerOf(tokenId1), user1);
        assertEq(cars.ownerOf(tokenId2), user1);
        assertEq(cars.ownerOf(tokenId3), user2);

        assertEq(cars.balanceOf(user1), 2);
        assertEq(cars.balanceOf(user2), 1);
        assertEq(cars.totalSupply(), 3);
    }

    function testTokenIdIncrementsCorrectly() public {
        vm.startPrank(backendAdmin);

        for (uint256 i = 0; i < 10; i++) {
            uint256 tokenId = cars.mintCar(user1);
            assertEq(tokenId, i);
        }

        vm.stopPrank();

        assertEq(cars.totalSupply(), 10);
    }

    function testNonMinterCannotMint() public {
        vm.prank(user1);
        vm.expectRevert("Not authorized minter");
        cars.mintCar(user2);
    }

    // Test token URI functionality (baseURI pattern)
    function testTokenURIUsesBaseURI() public {
        vm.prank(backendAdmin);
        uint256 tokenId = cars.mintCar(user1);

        string memory uri = cars.tokenURI(tokenId);
        assertEq(uri, "https://api.basewheels.com/metadata/cars/0");
    }

    function testTokenURIForMultipleTokens() public {
        vm.startPrank(backendAdmin);

        uint256 tokenId0 = cars.mintCar(user1);
        uint256 tokenId1 = cars.mintCar(user1);
        uint256 tokenId2 = cars.mintCar(user1);

        vm.stopPrank();

        assertEq(cars.tokenURI(tokenId0), "https://api.basewheels.com/metadata/cars/0");
        assertEq(cars.tokenURI(tokenId1), "https://api.basewheels.com/metadata/cars/1");
        assertEq(cars.tokenURI(tokenId2), "https://api.basewheels.com/metadata/cars/2");
    }

    function testTokenURIRevertsForNonexistentToken() public {
        vm.expectRevert();
        cars.tokenURI(999);
    }

    // Test baseURI update
    function testOwnerCanUpdateBaseURI() public {
        string memory newBaseURI = "https://new-metadata.basewheels.com/";

        vm.expectEmit(false, false, false, true);
        emit BaseURIUpdated(newBaseURI);

        cars.setBaseURI(newBaseURI);

        vm.prank(backendAdmin);
        uint256 tokenId = cars.mintCar(user1);

        assertEq(cars.tokenURI(tokenId), "https://new-metadata.basewheels.com/0");
    }

    function testNonOwnerCannotUpdateBaseURI() public {
        vm.prank(user1);
        vm.expectRevert();
        cars.setBaseURI("https://malicious.com/");
    }

    // Test burning functionality
    function testOwnerCanBurnTheirToken() public {
        vm.prank(backendAdmin);
        uint256 tokenId = cars.mintCar(user1);

        vm.expectEmit(true, true, false, false);
        emit CarBurned(tokenId, user1);

        vm.prank(user1);
        cars.burnForRedeem(tokenId);

        vm.expectRevert();
        cars.ownerOf(tokenId);
    }

    function testBackendCanBurnToken() public {
        vm.prank(backendAdmin);
        uint256 tokenId = cars.mintCar(user1);

        vm.expectEmit(true, true, false, false);
        emit CarBurned(tokenId, backendAdmin);

        vm.prank(backendAdmin);
        cars.burnForRedeem(tokenId);

        vm.expectRevert();
        cars.ownerOf(tokenId);
    }

    function testNonOwnerAndNonBackendCannotBurn() public {
        vm.prank(backendAdmin);
        uint256 tokenId = cars.mintCar(user1);

        vm.prank(user2);
        vm.expectRevert("Not authorized");
        cars.burnForRedeem(tokenId);
    }

    function testBurnReducesBalance() public {
        vm.startPrank(backendAdmin);
        uint256 tokenId1 = cars.mintCar(user1);
        uint256 tokenId2 = cars.mintCar(user1);
        vm.stopPrank();

        assertEq(cars.balanceOf(user1), 2);

        vm.prank(user1);
        cars.burnForRedeem(tokenId1);

        assertEq(cars.balanceOf(user1), 1);
    }

    function testCannotQueryBurnedToken() public {
        vm.prank(backendAdmin);
        uint256 tokenId = cars.mintCar(user1);

        vm.prank(user1);
        cars.burnForRedeem(tokenId);

        vm.expectRevert();
        cars.ownerOf(tokenId);

        vm.expectRevert();
        cars.tokenURI(tokenId);
    }

    // Test ERC721 standard functionality
    function testTransferFrom() public {
        vm.prank(backendAdmin);
        uint256 tokenId = cars.mintCar(user1);

        vm.prank(user1);
        cars.transferFrom(user1, user2, tokenId);

        assertEq(cars.ownerOf(tokenId), user2);
        assertEq(cars.balanceOf(user1), 0);
        assertEq(cars.balanceOf(user2), 1);
    }

    function testSafeTransferFrom() public {
        vm.prank(backendAdmin);
        uint256 tokenId = cars.mintCar(user1);

        vm.prank(user1);
        cars.safeTransferFrom(user1, user2, tokenId);

        assertEq(cars.ownerOf(tokenId), user2);
    }

    function testApproveAndTransferFrom() public {
        vm.prank(backendAdmin);
        uint256 tokenId = cars.mintCar(user1);

        vm.prank(user1);
        cars.approve(user2, tokenId);

        assertEq(cars.getApproved(tokenId), user2);

        vm.prank(user2);
        cars.transferFrom(user1, user2, tokenId);

        assertEq(cars.ownerOf(tokenId), user2);
    }

    function testSetApprovalForAll() public {
        vm.prank(backendAdmin);
        uint256 tokenId = cars.mintCar(user1);

        vm.prank(user1);
        cars.setApprovalForAll(user2, true);

        assertTrue(cars.isApprovedForAll(user1, user2));

        vm.prank(user2);
        cars.transferFrom(user1, user2, tokenId);

        assertEq(cars.ownerOf(tokenId), user2);
    }

    // Test minter management
    function testOwnerCanAuthorizeMinter() public {
        address newMinter = makeAddr("newMinter");

        vm.expectEmit(true, false, false, true);
        emit MinterAuthorized(newMinter, true);

        cars.setMinter(newMinter, true);

        assertTrue(cars.authorizedMinters(newMinter));
    }

    function testNonOwnerCannotAuthorizeMinter() public {
        address newMinter = makeAddr("newMinter");

        vm.prank(user1);
        vm.expectRevert();
        cars.setMinter(newMinter, true);
    }

    function testOwnerCanRevokeMinter() public {
        vm.expectEmit(true, false, false, true);
        emit MinterAuthorized(backendAdmin, false);

        cars.setMinter(backendAdmin, false);

        assertFalse(cars.authorizedMinters(backendAdmin));
    }

    function testNewMinterCanMint() public {
        address newMinter = makeAddr("newMinter");

        cars.setMinter(newMinter, true);

        vm.prank(newMinter);
        uint256 tokenId = cars.mintCar(user1);

        assertEq(cars.ownerOf(tokenId), user1);
    }

    // Integration test: Mint, Transfer, Burn
    function testMintTransferBurnFlow() public {
        // Mint
        vm.prank(backendAdmin);
        uint256 tokenId = cars.mintCar(user1);

        assertEq(cars.ownerOf(tokenId), user1);
        assertEq(cars.tokenURI(tokenId), "https://api.basewheels.com/metadata/cars/0");

        // Transfer
        vm.prank(user1);
        cars.transferFrom(user1, user2, tokenId);

        assertEq(cars.ownerOf(tokenId), user2);

        // Burn
        vm.prank(user2);
        cars.burnForRedeem(tokenId);

        vm.expectRevert();
        cars.ownerOf(tokenId);
    }

    // Test edge cases
    function testCannotBurnTwice() public {
        vm.prank(backendAdmin);
        uint256 tokenId = cars.mintCar(user1);

        vm.prank(user1);
        cars.burnForRedeem(tokenId);

        vm.prank(backendAdmin);
        vm.expectRevert();
        cars.burnForRedeem(tokenId);
    }

    function testBalanceOfZeroAddress() public {
        vm.expectRevert();
        cars.balanceOf(address(0));
    }

    // Fuzz testing
    function testFuzzMintCar(address to) public {
        vm.assume(to != address(0));

        vm.prank(backendAdmin);
        uint256 tokenId = cars.mintCar(to);

        assertEq(cars.ownerOf(tokenId), to);
        assertEq(cars.balanceOf(to), 1);
    }

    function testFuzzMultipleMints(uint8 count) public {
        vm.assume(count > 0 && count < 100);

        vm.startPrank(backendAdmin);
        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = cars.mintCar(user1);
            assertEq(tokenId, i);
        }
        vm.stopPrank();

        assertEq(cars.balanceOf(user1), count);
        assertEq(cars.totalSupply(), count);
    }

    function testFuzzTokenURI(uint8 tokenCount) public {
        vm.assume(tokenCount > 0 && tokenCount <= 50);

        vm.startPrank(backendAdmin);
        for (uint256 i = 0; i < tokenCount; i++) {
            cars.mintCar(user1);
        }
        vm.stopPrank();

        // Verify each token URI is correct
        for (uint256 i = 0; i < tokenCount; i++) {
            string memory expectedURI = string(
                abi.encodePacked("https://api.basewheels.com/metadata/cars/", vm.toString(i))
            );
            assertEq(cars.tokenURI(i), expectedURI);
        }
    }
}
