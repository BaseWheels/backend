// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../script/Fragment.s.sol";

contract BaseWheelsFragmentsTest is Test {
    BaseWheelsFragments public fragments;
    address public owner;
    address public backendAdmin;
    address public user1;
    address public user2;

    // Fragment IDs
    uint256 constant CHASSIS = 0;
    uint256 constant WHEELS = 1;
    uint256 constant ENGINE = 2;
    uint256 constant BODY = 3;
    uint256 constant INTERIOR = 4;

    event MinterAuthorized(address indexed minter, bool authorized);
    event FragmentMinted(address indexed to, uint256 indexed id, uint256 amount);
    event FragmentsBurned(address indexed from, uint256[] ids, uint256[] amounts);

    function setUp() public {
        owner = address(this);
        backendAdmin = makeAddr("backendAdmin");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        fragments = new BaseWheelsFragments(backendAdmin);
    }

    // Test deployment and initial state
    function testDeploymentSetsOwnerCorrectly() public view {
        assertEq(fragments.owner(), owner);
    }

    function testBackendAdminIsAuthorizedOnDeploy() public view {
        assertTrue(fragments.authorizedMinters(backendAdmin));
    }

    function testFragmentConstantsAreCorrect() public view {
        assertEq(fragments.CHASSIS(), 0);
        assertEq(fragments.WHEELS(), 1);
        assertEq(fragments.ENGINE(), 2);
        assertEq(fragments.BODY(), 3);
        assertEq(fragments.INTERIOR(), 4);
    }

    // Test minting functionality
    function testBackendCanMintFragments() public {
        vm.prank(backendAdmin);
        fragments.mintFragment(user1, CHASSIS, 5);

        assertEq(fragments.balanceOf(user1, CHASSIS), 5);
    }

    function testMintEmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit FragmentMinted(user1, CHASSIS, 5);

        vm.prank(backendAdmin);
        fragments.mintFragment(user1, CHASSIS, 5);
    }

    function testMintMultipleFragmentTypes() public {
        vm.startPrank(backendAdmin);

        fragments.mintFragment(user1, CHASSIS, 2);
        fragments.mintFragment(user1, WHEELS, 3);
        fragments.mintFragment(user1, ENGINE, 1);

        vm.stopPrank();

        assertEq(fragments.balanceOf(user1, CHASSIS), 2);
        assertEq(fragments.balanceOf(user1, WHEELS), 3);
        assertEq(fragments.balanceOf(user1, ENGINE), 1);
    }

    function testMintToMultipleUsers() public {
        vm.startPrank(backendAdmin);

        fragments.mintFragment(user1, CHASSIS, 5);
        fragments.mintFragment(user2, WHEELS, 10);

        vm.stopPrank();

        assertEq(fragments.balanceOf(user1, CHASSIS), 5);
        assertEq(fragments.balanceOf(user2, WHEELS), 10);
    }

    function testMintRevertsOnInvalidFragmentId() public {
        vm.prank(backendAdmin);
        vm.expectRevert("Invalid fragment ID");
        fragments.mintFragment(user1, 999, 5);
    }

    function testNonMinterCannotMint() public {
        vm.prank(user1);
        vm.expectRevert("Not authorized minter");
        fragments.mintFragment(user2, CHASSIS, 5);
    }

    // Test batch minting
    function testMintBatch() public {
        uint256[] memory ids = new uint256[](3);
        ids[0] = CHASSIS;
        ids[1] = WHEELS;
        ids[2] = ENGINE;

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1;
        amounts[1] = 2;
        amounts[2] = 3;

        vm.prank(backendAdmin);
        fragments.mintBatch(user1, ids, amounts);

        assertEq(fragments.balanceOf(user1, CHASSIS), 1);
        assertEq(fragments.balanceOf(user1, WHEELS), 2);
        assertEq(fragments.balanceOf(user1, ENGINE), 3);
    }

    // Test burning functionality
    function testBurnForAssembly() public {
        // Mint fragments first
        vm.startPrank(backendAdmin);
        fragments.mintFragment(user1, CHASSIS, 5);
        fragments.mintFragment(user1, WHEELS, 5);
        fragments.mintFragment(user1, ENGINE, 5);

        // Prepare burn batch
        uint256[] memory ids = new uint256[](3);
        ids[0] = CHASSIS;
        ids[1] = WHEELS;
        ids[2] = ENGINE;

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1;
        amounts[1] = 1;
        amounts[2] = 1;

        fragments.burnForAssembly(user1, ids, amounts);

        vm.stopPrank();

        assertEq(fragments.balanceOf(user1, CHASSIS), 4);
        assertEq(fragments.balanceOf(user1, WHEELS), 4);
        assertEq(fragments.balanceOf(user1, ENGINE), 4);
    }

    function testBurnEmitsEvent() public {
        vm.startPrank(backendAdmin);
        fragments.mintFragment(user1, CHASSIS, 5);

        uint256[] memory ids = new uint256[](1);
        ids[0] = CHASSIS;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1;

        vm.expectEmit(true, false, false, true);
        emit FragmentsBurned(user1, ids, amounts);

        fragments.burnForAssembly(user1, ids, amounts);
        vm.stopPrank();
    }

    function testBurnAllFragments() public {
        vm.startPrank(backendAdmin);

        fragments.mintFragment(user1, CHASSIS, 5);
        fragments.mintFragment(user1, WHEELS, 4);
        fragments.mintFragment(user1, ENGINE, 3);
        fragments.mintFragment(user1, BODY, 2);
        fragments.mintFragment(user1, INTERIOR, 1);

        uint256[] memory ids = new uint256[](5);
        ids[0] = CHASSIS;
        ids[1] = WHEELS;
        ids[2] = ENGINE;
        ids[3] = BODY;
        ids[4] = INTERIOR;

        uint256[] memory amounts = new uint256[](5);
        amounts[0] = 5;
        amounts[1] = 4;
        amounts[2] = 3;
        amounts[3] = 2;
        amounts[4] = 1;

        fragments.burnForAssembly(user1, ids, amounts);

        vm.stopPrank();

        assertEq(fragments.balanceOf(user1, CHASSIS), 0);
        assertEq(fragments.balanceOf(user1, WHEELS), 0);
        assertEq(fragments.balanceOf(user1, ENGINE), 0);
        assertEq(fragments.balanceOf(user1, BODY), 0);
        assertEq(fragments.balanceOf(user1, INTERIOR), 0);
    }

    function testNonMinterCannotBurn() public {
        vm.prank(backendAdmin);
        fragments.mintFragment(user1, CHASSIS, 5);

        uint256[] memory ids = new uint256[](1);
        ids[0] = CHASSIS;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1;

        vm.prank(user1);
        vm.expectRevert("Not authorized minter");
        fragments.burnForAssembly(user1, ids, amounts);
    }

    // Test checkAllParts functionality
    function testCheckAllPartsReturnsCorrectBalances() public {
        vm.startPrank(backendAdmin);

        fragments.mintFragment(user1, CHASSIS, 5);
        fragments.mintFragment(user1, WHEELS, 4);
        fragments.mintFragment(user1, ENGINE, 3);
        fragments.mintFragment(user1, BODY, 2);
        fragments.mintFragment(user1, INTERIOR, 1);

        vm.stopPrank();

        uint256[] memory balances = fragments.checkAllParts(user1);

        assertEq(balances.length, 5);
        assertEq(balances[0], 5); // CHASSIS
        assertEq(balances[1], 4); // WHEELS
        assertEq(balances[2], 3); // ENGINE
        assertEq(balances[3], 2); // BODY
        assertEq(balances[4], 1); // INTERIOR
    }

    function testCheckAllPartsForUserWithNoFragments() public view {
        uint256[] memory balances = fragments.checkAllParts(user1);

        assertEq(balances.length, 5);
        assertEq(balances[0], 0);
        assertEq(balances[1], 0);
        assertEq(balances[2], 0);
        assertEq(balances[3], 0);
        assertEq(balances[4], 0);
    }

    // Test ERC1155 standard functionality
    function testSafeTransferFrom() public {
        vm.prank(backendAdmin);
        fragments.mintFragment(user1, CHASSIS, 10);

        vm.prank(user1);
        fragments.safeTransferFrom(user1, user2, CHASSIS, 3, "");

        assertEq(fragments.balanceOf(user1, CHASSIS), 7);
        assertEq(fragments.balanceOf(user2, CHASSIS), 3);
    }

    function testSafeBatchTransferFrom() public {
        vm.startPrank(backendAdmin);
        fragments.mintFragment(user1, CHASSIS, 10);
        fragments.mintFragment(user1, WHEELS, 20);
        vm.stopPrank();

        uint256[] memory ids = new uint256[](2);
        ids[0] = CHASSIS;
        ids[1] = WHEELS;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 3;
        amounts[1] = 5;

        vm.prank(user1);
        fragments.safeBatchTransferFrom(user1, user2, ids, amounts, "");

        assertEq(fragments.balanceOf(user1, CHASSIS), 7);
        assertEq(fragments.balanceOf(user1, WHEELS), 15);
        assertEq(fragments.balanceOf(user2, CHASSIS), 3);
        assertEq(fragments.balanceOf(user2, WHEELS), 5);
    }

    // Test minter management
    function testOwnerCanAuthorizeMinter() public {
        address newMinter = makeAddr("newMinter");

        vm.expectEmit(true, false, false, true);
        emit MinterAuthorized(newMinter, true);

        fragments.setMinter(newMinter, true);

        assertTrue(fragments.authorizedMinters(newMinter));
    }

    function testOwnerCanRevokeMinter() public {
        vm.expectEmit(true, false, false, true);
        emit MinterAuthorized(backendAdmin, false);

        fragments.setMinter(backendAdmin, false);

        assertFalse(fragments.authorizedMinters(backendAdmin));
    }

    function testNonOwnerCannotSetMinter() public {
        address newMinter = makeAddr("newMinter");

        vm.prank(user1);
        vm.expectRevert();
        fragments.setMinter(newMinter, true);
    }

    function testNewMinterCanMint() public {
        address newMinter = makeAddr("newMinter");

        fragments.setMinter(newMinter, true);

        vm.prank(newMinter);
        fragments.mintFragment(user1, CHASSIS, 5);

        assertEq(fragments.balanceOf(user1, CHASSIS), 5);
    }

    // Test URI management
    function testOwnerCanSetURI() public {
        string memory newURI = "https://new-api.basewheels.com/{id}";
        fragments.setURI(newURI);

        // URI is internal, but we can verify it doesn't revert
        assertTrue(true);
    }

    function testNonOwnerCannotSetURI() public {
        vm.prank(user1);
        vm.expectRevert();
        fragments.setURI("https://malicious.com/{id}");
    }

    // Fuzz testing
    function testFuzzMintFragment(address to, uint8 fragmentId, uint96 amount) public {
        vm.assume(to != address(0));
        vm.assume(fragmentId <= 4);
        vm.assume(amount > 0);
        // Ensure 'to' is an EOA (not a contract) to avoid ERC1155Receiver issues
        vm.assume(to.code.length == 0);

        vm.prank(backendAdmin);
        fragments.mintFragment(to, fragmentId, amount);

        assertEq(fragments.balanceOf(to, fragmentId), amount);
    }
}
