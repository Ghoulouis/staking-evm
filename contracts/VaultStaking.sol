// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract VaultStaking is Ownable, Pausable {
    using SafeERC20 for IERC20;

    address public tokenStaked;
    address public tokenRewards;
    uint256 public totalStaked;
    uint256 public globalIndex;
    uint256 public lastUpdated;
    uint256 public rps;

    uint256 public constant CACULATE_PRECISION = 1e18;
    struct StakerInfo {
        uint256 balance;
        uint256 index;
        uint256 pendingReward;
    }

    mapping(address => StakerInfo) public stakers;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event Claimed(address indexed user, uint256 amount);

    constructor(
        address _tokenRewards,
        address _tokenStaked,
        uint256 _rps
    ) Ownable(msg.sender) Pausable() {
        tokenRewards = _tokenRewards;
        tokenStaked = _tokenStaked;
        rps = _rps;
    }

    function stake(uint256 amount) public whenNotPaused {
        updateGlobalIndex();
        updateReward(msg.sender);
        _deposit(tokenStaked, amount);
        StakerInfo storage staker = stakers[msg.sender];
        staker.balance += amount;
        totalStaked += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) public {
        claimReward();
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
            globalIndex += (pendingReward * CACULATE_PRECISION) / totalStaked;
        }

        lastUpdated = currentTime;
    }

    function updateReward(address account) public {
        updateGlobalIndex();
        StakerInfo storage stakeData = stakers[account];
        stakeData.pendingReward +=
            ((globalIndex - stakeData.index) * stakeData.balance) /
            CACULATE_PRECISION;
        stakeData.index = globalIndex;
    }

    function claimReward() public {
        updateGlobalIndex();
        updateReward(msg.sender);
        StakerInfo storage stakeData = stakers[msg.sender];
        uint256 claimable = stakeData.pendingReward;
        stakeData.pendingReward = 0;
        _withdraw(tokenRewards, claimable);
        emit Claimed(msg.sender, claimable);
    }

    function _deposit(address token, uint256 amount) internal {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    function _withdraw(address token, uint256 amount) internal {
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    function updateConfig(uint256 _rps) public onlyOwner {
        updateGlobalIndex();
        rps = _rps;
    }

    function withdraw(address token, uint256 amount) public onlyOwner {
        _withdraw(token, amount);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}
