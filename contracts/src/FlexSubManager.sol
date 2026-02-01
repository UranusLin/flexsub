// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IFlexSub.sol";

/**
 * @title FlexSubManager
 * @notice Main contract for managing subscription plans and payments
 * @dev Integrates with Yellow (state channels) and Arc (USDC settlement)
 */
contract FlexSubManager is IFlexSub {
    // ============ State Variables ============

    /// @notice USDC token address (Circle)
    address public immutable usdc;

    /// @notice Counter for plan IDs
    uint256 public nextPlanId;

    /// @notice Counter for subscription IDs
    uint256 public nextSubscriptionId;

    /// @notice Mapping of plan ID to Plan struct
    mapping(uint256 => Plan) public plans;

    /// @notice Mapping of subscription ID to Subscription struct
    mapping(uint256 => Subscription) public subscriptions;

    /// @notice Mapping of merchant address to their plan IDs
    mapping(address => uint256[]) public merchantPlans;

    /// @notice Mapping of subscriber address to their subscription IDs
    mapping(address => uint256[]) public subscriberSubscriptions;

    // ============ Constructor ============

    constructor(address _usdc) {
        usdc = _usdc;
        nextPlanId = 1;
        nextSubscriptionId = 1;
    }

    // ============ Merchant Functions ============

    /**
     * @notice Create a new subscription plan
     * @param pricePerPeriod Price in USDC (6 decimals) per period
     * @param periodDuration Duration of each period in seconds
     * @param name Human-readable name for the plan
     * @return planId The ID of the created plan
     */
    function createPlan(
        uint256 pricePerPeriod,
        uint256 periodDuration,
        string calldata name
    ) external returns (uint256 planId) {
        require(pricePerPeriod > 0, "Price must be > 0");
        require(periodDuration > 0, "Duration must be > 0");

        planId = nextPlanId++;

        plans[planId] = Plan({
            merchant: msg.sender,
            pricePerPeriod: pricePerPeriod,
            periodDuration: periodDuration,
            name: name,
            isActive: true,
            totalSubscribers: 0
        });

        merchantPlans[msg.sender].push(planId);

        emit PlanCreated(planId, msg.sender, pricePerPeriod, periodDuration, name);
    }

    /**
     * @notice Deactivate a subscription plan
     * @param planId The ID of the plan to deactivate
     */
    function deactivatePlan(uint256 planId) external {
        require(plans[planId].merchant == msg.sender, "Not plan owner");
        plans[planId].isActive = false;
        emit PlanDeactivated(planId);
    }

    // ============ Subscriber Functions ============

    /**
     * @notice Subscribe to a plan
     * @dev Requires prior USDC approval for at least one period
     * @param planId The ID of the plan to subscribe to
     * @return subscriptionId The ID of the created subscription
     */
    function subscribe(uint256 planId) external returns (uint256 subscriptionId) {
        Plan storage plan = plans[planId];
        require(plan.isActive, "Plan not active");
        require(plan.merchant != address(0), "Plan does not exist");

        subscriptionId = nextSubscriptionId++;

        subscriptions[subscriptionId] = Subscription({
            planId: planId,
            subscriber: msg.sender,
            startTime: block.timestamp,
            lastChargeTime: block.timestamp,
            totalCharged: 0,
            isActive: true
        });

        subscriberSubscriptions[msg.sender].push(subscriptionId);
        plan.totalSubscribers++;

        // TODO: Integrate with Yellow state channel for buffer deposit
        // TODO: Integrate with LI.FI for cross-chain deposits

        emit Subscribed(subscriptionId, planId, msg.sender);
    }

    /**
     * @notice Cancel a subscription
     * @param subscriptionId The ID of the subscription to cancel
     */
    function cancelSubscription(uint256 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        require(sub.subscriber == msg.sender, "Not subscription owner");
        require(sub.isActive, "Already cancelled");

        sub.isActive = false;
        plans[sub.planId].totalSubscribers--;

        emit SubscriptionCancelled(subscriptionId);
    }

    // ============ Charge Functions ============

    /**
     * @notice Charge a subscription (called by merchant or via Yellow state channel)
     * @param subscriptionId The ID of the subscription to charge
     * @param amount Amount to charge in USDC
     */
    function charge(uint256 subscriptionId, uint256 amount) external {
        Subscription storage sub = subscriptions[subscriptionId];
        Plan storage plan = plans[sub.planId];

        require(sub.isActive, "Subscription not active");
        require(plan.merchant == msg.sender, "Not plan merchant");
        require(amount <= plan.pricePerPeriod, "Exceeds plan price");

        // TODO: Implement actual USDC transfer via Circle/Arc
        // TODO: Integrate with Yellow for off-chain verification

        sub.lastChargeTime = block.timestamp;
        sub.totalCharged += amount;

        emit Charged(subscriptionId, amount);
    }

    // ============ View Functions ============

    function getPlan(uint256 planId) external view returns (Plan memory) {
        return plans[planId];
    }

    function getSubscription(uint256 subscriptionId) external view returns (Subscription memory) {
        return subscriptions[subscriptionId];
    }

    function getMerchantPlans(address merchant) external view returns (uint256[] memory) {
        return merchantPlans[merchant];
    }

    function getSubscriberSubscriptions(address subscriber) external view returns (uint256[] memory) {
        return subscriberSubscriptions[subscriber];
    }
}
