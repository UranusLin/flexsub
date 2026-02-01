// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFlexSub
 * @notice Interface for FlexSub subscription protocol
 */
interface IFlexSub {
    // ============ Structs ============

    struct Plan {
        address merchant;
        uint256 pricePerPeriod;
        uint256 periodDuration;
        string name;
        bool isActive;
        uint256 totalSubscribers;
    }

    struct Subscription {
        uint256 planId;
        address subscriber;
        uint256 startTime;
        uint256 lastChargeTime;
        uint256 totalCharged;
        bool isActive;
    }

    // ============ Events ============

    event PlanCreated(
        uint256 indexed planId,
        address indexed merchant,
        uint256 pricePerPeriod,
        uint256 periodDuration,
        string name
    );

    event PlanDeactivated(uint256 indexed planId);

    event Subscribed(
        uint256 indexed subscriptionId,
        uint256 indexed planId,
        address indexed subscriber
    );

    event SubscriptionCancelled(uint256 indexed subscriptionId);

    event Charged(uint256 indexed subscriptionId, uint256 amount);

    // ============ Functions ============

    function createPlan(
        uint256 pricePerPeriod,
        uint256 periodDuration,
        string calldata name
    ) external returns (uint256 planId);

    function deactivatePlan(uint256 planId) external;

    function subscribe(uint256 planId) external returns (uint256 subscriptionId);

    function cancelSubscription(uint256 subscriptionId) external;

    function charge(uint256 subscriptionId, uint256 amount) external;

    function getPlan(uint256 planId) external view returns (Plan memory);

    function getSubscription(uint256 subscriptionId) external view returns (Subscription memory);
}
