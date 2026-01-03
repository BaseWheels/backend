// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../script/Staking.s.sol";

contract BaseWheelsVaultTest is Test {
    BaseWheelsVault public vault;
    address public owner;
    address public user1;
    address public user2;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        vault = new BaseWheelsVault();

        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
    }

    // Deposit tests
    function testDeposit() public {
        vm.startPrank(user1);

        vm.expectEmit(true, false, false, true);
        emit Deposited(user1, 10 ether);

        vault.deposit{value: 10 ether}();

        assertEq(vault.deposits(user1), 10 ether);
        assertEq(vault.getBalance(user1), 10 ether);

        vm.stopPrank();
    }

    function testDepositMultipleTimes() public {
        vm.startPrank(user1);

        vault.deposit{value: 5 ether}();
        vault.deposit{value: 3 ether}();
        vault.deposit{value: 2 ether}();

        assertEq(vault.deposits(user1), 10 ether);

        vm.stopPrank();
    }

    function testDepositRevertsWithZeroValue() public {
        vm.prank(user1);
        vm.expectRevert("Must send ETH");
        vault.deposit{value: 0}();
    }

    // Withdraw tests
    function testWithdraw() public {
        vm.startPrank(user1);

        vault.deposit{value: 10 ether}();
        uint256 balanceBefore = user1.balance;

        vm.expectEmit(true, false, false, true);
        emit Withdrawn(user1, 10 ether);

        vault.withdraw();

        assertEq(vault.deposits(user1), 0);
        assertEq(user1.balance, balanceBefore + 10 ether);

        vm.stopPrank();
    }

    function testWithdrawRevertsWhenNoBalance() public {
        vm.prank(user1);
        vm.expectRevert("No balance");
        vault.withdraw();
    }

    function testWithdrawRevertsAfterAlreadyWithdrawn() public {
        vm.startPrank(user1);

        vault.deposit{value: 10 ether}();
        vault.withdraw();

        vm.expectRevert("No balance");
        vault.withdraw();

        vm.stopPrank();
    }

    // Multiple users
    function testMultipleUsersDeposit() public {
        vm.prank(user1);
        vault.deposit{value: 10 ether}();

        vm.prank(user2);
        vault.deposit{value: 20 ether}();

        assertEq(vault.getBalance(user1), 10 ether);
        assertEq(vault.getBalance(user2), 20 ether);
    }

    function testMultipleUsersWithdraw() public {
        vm.prank(user1);
        vault.deposit{value: 10 ether}();

        vm.prank(user2);
        vault.deposit{value: 20 ether}();

        uint256 user1BalanceBefore = user1.balance;
        uint256 user2BalanceBefore = user2.balance;

        vm.prank(user1);
        vault.withdraw();

        vm.prank(user2);
        vault.withdraw();

        assertEq(user1.balance, user1BalanceBefore + 10 ether);
        assertEq(user2.balance, user2BalanceBefore + 20 ether);
        assertEq(vault.getBalance(user1), 0);
        assertEq(vault.getBalance(user2), 0);
    }

    // Ownership
    function testOwnershipIsSetCorrectly() public view {
        assertEq(vault.owner(), owner);
    }

    // Fuzz testing
    function testFuzzDeposit(uint96 amount) public {
        vm.assume(amount > 0);

        vm.deal(user1, amount);
        vm.prank(user1);
        vault.deposit{value: amount}();

        assertEq(vault.getBalance(user1), amount);
    }

    function testFuzzDepositAndWithdraw(uint96 amount) public {
        vm.assume(amount > 0);

        vm.deal(user1, amount);
        vm.startPrank(user1);

        vault.deposit{value: amount}();
        uint256 balanceBefore = user1.balance;
        vault.withdraw();

        assertEq(user1.balance, balanceBefore + amount);
        assertEq(vault.getBalance(user1), 0);

        vm.stopPrank();
    }
}
