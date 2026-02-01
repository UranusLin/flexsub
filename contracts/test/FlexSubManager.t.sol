// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/FlexSubManager.sol";

contract FlexSubManagerTest is Test {
    FlexSubManager public flexsub;

    address public merchant = address(0x1);
    address public subscriber = address(0x2);
    address public mockUsdc =
        address(0x1234567890123456789012345678901234567890);

    function setUp() public {
        flexsub = new FlexSubManager(mockUsdc);
    }

    // ============ Plan Tests ============

    function testCreatePlan() public {
        vm.prank(merchant);
        uint256 planId = flexsub.createPlan(
            10 * 10 ** 6, // 10 USDC
            30 days,
            "Premium Plan"
        );

        assertEq(planId, 1);

        FlexSubManager.Plan memory plan = flexsub.getPlan(planId);
        assertEq(plan.merchant, merchant);
        assertEq(plan.pricePerPeriod, 10 * 10 ** 6);
        assertEq(plan.periodDuration, 30 days);
        assertEq(plan.name, "Premium Plan");
        assertTrue(plan.isActive);
        assertEq(plan.totalSubscribers, 0);
    }

    function testCreateMultiplePlans() public {
        vm.startPrank(merchant);
        uint256 plan1 = flexsub.createPlan(5 * 10 ** 6, 30 days, "Basic");
        uint256 plan2 = flexsub.createPlan(20 * 10 ** 6, 30 days, "Pro");
        vm.stopPrank();

        assertEq(plan1, 1);
        assertEq(plan2, 2);
    }

    function testDeactivatePlan() public {
        vm.prank(merchant);
        uint256 planId = flexsub.createPlan(10 * 10 ** 6, 30 days, "Test");

        vm.prank(merchant);
        flexsub.deactivatePlan(planId);

        FlexSubManager.Plan memory plan = flexsub.getPlan(planId);
        assertFalse(plan.isActive);
    }

    function testDeactivatePlanNotOwner() public {
        vm.prank(merchant);
        uint256 planId = flexsub.createPlan(10 * 10 ** 6, 30 days, "Test");

        vm.prank(subscriber);
        vm.expectRevert("Not plan owner");
        flexsub.deactivatePlan(planId);
    }

    // ============ Subscription Tests ============

    function testSubscribe() public {
        vm.prank(merchant);
        uint256 planId = flexsub.createPlan(10 * 10 ** 6, 30 days, "Test");

        vm.prank(subscriber);
        uint256 subId = flexsub.subscribe(planId);

        assertEq(subId, 1);

        FlexSubManager.Subscription memory sub = flexsub.getSubscription(subId);
        assertEq(sub.planId, planId);
        assertEq(sub.subscriber, subscriber);
        assertTrue(sub.isActive);
        assertEq(sub.totalCharged, 0);

        // Check plan subscriber count increased
        FlexSubManager.Plan memory plan = flexsub.getPlan(planId);
        assertEq(plan.totalSubscribers, 1);
    }

    function testSubscribeInactivePlan() public {
        vm.prank(merchant);
        uint256 planId = flexsub.createPlan(10 * 10 ** 6, 30 days, "Test");

        vm.prank(merchant);
        flexsub.deactivatePlan(planId);

        vm.prank(subscriber);
        vm.expectRevert("Plan not active");
        flexsub.subscribe(planId);
    }

    function testCancelSubscription() public {
        vm.prank(merchant);
        uint256 planId = flexsub.createPlan(10 * 10 ** 6, 30 days, "Test");

        vm.prank(subscriber);
        uint256 subId = flexsub.subscribe(planId);

        vm.prank(subscriber);
        flexsub.cancelSubscription(subId);

        FlexSubManager.Subscription memory sub = flexsub.getSubscription(subId);
        assertFalse(sub.isActive);

        // Check plan subscriber count decreased
        FlexSubManager.Plan memory plan = flexsub.getPlan(planId);
        assertEq(plan.totalSubscribers, 0);
    }

    // ============ Charge Tests ============

    function testCharge() public {
        vm.prank(merchant);
        uint256 planId = flexsub.createPlan(10 * 10 ** 6, 30 days, "Test");

        vm.prank(subscriber);
        uint256 subId = flexsub.subscribe(planId);

        vm.prank(merchant);
        flexsub.charge(subId, 5 * 10 ** 6); // Partial charge

        FlexSubManager.Subscription memory sub = flexsub.getSubscription(subId);
        assertEq(sub.totalCharged, 5 * 10 ** 6);
    }

    function testChargeExceedsPlanPrice() public {
        vm.prank(merchant);
        uint256 planId = flexsub.createPlan(10 * 10 ** 6, 30 days, "Test");

        vm.prank(subscriber);
        uint256 subId = flexsub.subscribe(planId);

        vm.prank(merchant);
        vm.expectRevert("Exceeds plan price");
        flexsub.charge(subId, 20 * 10 ** 6); // More than plan price
    }

    function testChargeNotMerchant() public {
        vm.prank(merchant);
        uint256 planId = flexsub.createPlan(10 * 10 ** 6, 30 days, "Test");

        vm.prank(subscriber);
        uint256 subId = flexsub.subscribe(planId);

        vm.prank(subscriber);
        vm.expectRevert("Not plan merchant");
        flexsub.charge(subId, 5 * 10 ** 6);
    }

    // ============ View Function Tests ============

    function testGetMerchantPlans() public {
        vm.startPrank(merchant);
        flexsub.createPlan(5 * 10 ** 6, 30 days, "Basic");
        flexsub.createPlan(20 * 10 ** 6, 30 days, "Pro");
        vm.stopPrank();

        uint256[] memory plans = flexsub.getMerchantPlans(merchant);
        assertEq(plans.length, 2);
        assertEq(plans[0], 1);
        assertEq(plans[1], 2);
    }

    function testGetSubscriberSubscriptions() public {
        vm.prank(merchant);
        uint256 planId = flexsub.createPlan(10 * 10 ** 6, 30 days, "Test");

        vm.prank(subscriber);
        flexsub.subscribe(planId);

        uint256[] memory subs = flexsub.getSubscriberSubscriptions(subscriber);
        assertEq(subs.length, 1);
        assertEq(subs[0], 1);
    }
}
