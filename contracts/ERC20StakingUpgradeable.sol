// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract ERC20StakingUpgradeable is PausableUpgradeable {
    using SafeERC20 for IERC20;

    struct StakerInfo {
        uint256 balance;
        uint256 index;
        uint256 pendingReward;
    }

    address public updater;
    address public admin;
    address public tokenStaked;
    address public tokenRewards;
    uint256 public totalStaked;
    uint256 public globalIndex;
    uint256 public lastUpdated;
    uint256 public rps;
    uint256 public totalStaker;
    uint256 public timeUnlock;

    uint256 public constant CALCULATE_PRECISION = 1e18;

    mapping(address => StakerInfo) public stakers;
    mapping(address => bool) public newStakers;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event Claimed(address indexed user, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
    }

    modifier onlyUpdater() {
        require(msg.sender == updater, "only updater");
        _;
    }

    modifier passLockingTime() {
        require(block.timestamp >= timeUnlock, "still locking");
        _;
    }

    function initialize(
        address _tokenRewards,
        address _tokenStaked,
        uint256 _rps,
        address _updater,
        uint256 _timeUnlock
    ) public initializer {
        __Pausable_init();
        admin = msg.sender;
        tokenRewards = _tokenRewards;
        tokenStaked = _tokenStaked;
        rps = _rps;
        updater = _updater;
        timeUnlock = _timeUnlock;
    }

    function stake(uint256 amount) public whenNotPaused {
        updateGlobalIndex();
        updateReward(msg.sender);
        _updateTotalStaker(msg.sender);
        _deposit(tokenStaked, amount);
        StakerInfo storage staker = stakers[msg.sender];
        staker.balance += amount;
        totalStaked += amount;
        _updateRps();
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) public passLockingTime {
        claimReward();
        StakerInfo storage stakeData = stakers[msg.sender];
        require(stakeData.balance >= amount, "not enough balance");
        stakeData.balance -= amount;
        _withdraw(tokenStaked, amount);
        totalStaked -= amount;
        _updateRps();
        emit Unstaked(msg.sender, amount);
    }

    function unstakeWithoutClaimReward(uint256 amount) public passLockingTime {
        updateGlobalIndex();
        updateReward(msg.sender);
        StakerInfo storage stakeData = stakers[msg.sender];
        require(stakeData.balance >= amount, "not enough balance");
        stakeData.balance -= amount;
        _withdraw(tokenStaked, amount);
        totalStaked -= amount;
        emit Unstaked(msg.sender, amount);
    }

    function updateGlobalIndex() public {
        uint256 currentTime = block.timestamp;
        uint256 timePassed = currentTime - lastUpdated;

        if (totalStaked > 0 && timePassed > 0) {
            uint256 pendingReward = rps * timePassed;
            globalIndex += (pendingReward * CALCULATE_PRECISION) / totalStaked;
        }

        lastUpdated = currentTime;
    }

    function updateReward(address account) public {
        updateGlobalIndex();
        StakerInfo storage stakeData = stakers[account];
        stakeData.pendingReward +=
            ((globalIndex - stakeData.index) * stakeData.balance) /
            CALCULATE_PRECISION;
        stakeData.index = globalIndex;
    }

    function claimReward() public passLockingTime {
        updateGlobalIndex();
        updateReward(msg.sender);
        StakerInfo storage stakeData = stakers[msg.sender];
        uint256 claimable = stakeData.pendingReward;
        stakeData.pendingReward = 0;
        _withdraw(tokenRewards, claimable);
        emit Claimed(msg.sender, claimable);
    }

    function viewReward(address account) public view returns (uint256) {
        StakerInfo storage stakeData = stakers[account];
        uint256 currentTime = block.timestamp;
        uint256 timePassed = currentTime - lastUpdated;
        uint256 globalIndexNow = globalIndex;
        if (totalStaked > 0 && timePassed > 0) {
            uint256 pendingReward = rps * timePassed;
            globalIndexNow +=
                (pendingReward * CALCULATE_PRECISION) /
                totalStaked;
        }
        uint256 claimable = stakeData.pendingReward +
            ((globalIndexNow - stakeData.index) * stakeData.balance) /
            CALCULATE_PRECISION;
        return claimable;
    }

    // #region Internal functions
    function _updateTotalStaker(address account) internal {
        if (!newStakers[account]) {
            newStakers[account] = true;
            totalStaker += 1;
        }
    }

    function _deposit(address token, uint256 amount) internal {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    function _withdraw(address token, uint256 amount) internal {
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    // #region Admin functions

    function updateRps(uint256 _rps) public onlyUpdater {
        updateGlobalIndex();
        rps = _rps;
    }

    function updateTimeUnlock(uint256 _timeUnlock) public onlyAdmin {
        timeUnlock = _timeUnlock;
    }

    function changeAdmin(address _admin) public onlyAdmin {
        admin = _admin;
    }

    function changeUpdater(address _updater) public onlyAdmin {
        updater = _updater;
    }

    function withdraw(address token, uint256 amount) public onlyAdmin {
        _withdraw(token, amount);
        require(
            IERC20(tokenStaked).balanceOf(address(this)) >= totalStaked,
            "not enough balance staked"
        );
    }

    function pause() public onlyAdmin {
        _pause();
    }

    function unpause() public onlyAdmin {
        _unpause();
    }

    function _updateRps() internal {
        updateGlobalIndex();
        rps = totalStaked / 5 / 365 days;
        if (block.timestamp > timeUnlock) {
            rps = 0;
        }
    }
}
