// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/INonfungiblePositionManager.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract UniswapV3LPStakingUpgradeable is
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    enum statusNFT {
        NOT_ENTERED,
        STAKING,
        UNSTAKED
    }

    struct StakedNFT {
        address owner;
        uint256 liquidity;
        statusNFT status;
    }
    struct StakerInfo {
        uint256 balance;
        uint256 index;
        uint256 pendingReward;
    }

    struct PositionCache {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
    }

    address public admin;
    address public updater;

    INonfungiblePositionManager public positionManager;
    // NFT full range info
    address public token0;
    address public token1;
    uint24 public feePool;
    int24 public tickLower;
    int24 public tickUpper;
    uint256 public totalStaked;
    address public tokenRewards;
    // reward
    uint256 public rps;
    uint256 public globalIndex;
    uint256 public lastUpdated;
    uint256 public totalStaker;
    uint256 public timeUnlock;

    uint256 public constant CALCULATE_PRECISION = 1e18;

    mapping(address => StakerInfo) public stakers;
    mapping(uint256 => StakedNFT) public stakedNFTs;
    mapping(address => bool) public newStakers;
    mapping(address => uint256) public stakerToNumberStakeNFT;
    mapping(address => mapping(uint256 => uint256)) public stakerToIndexToNFTID;

    event Staked(address indexed user, uint256 tokenId, uint256 liquidity);
    event Unstaked(address indexed user, uint256 tokenId);
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
        address _updater,
        address _positionManager,
        address _token0,
        address _token1,
        uint24 _feePool,
        int24 _tickLower,
        int24 _tickUpper,
        address _tokenRewards,
        uint256 _rps,
        uint256 _timeUnlock
    ) public initializer {
        __Pausable_init();
        admin = msg.sender;
        updater = _updater;
        positionManager = INonfungiblePositionManager(_positionManager);
        token0 = _token0;
        token1 = _token1;
        feePool = _feePool;
        tickLower = _tickLower;
        tickUpper = _tickUpper;
        tokenRewards = _tokenRewards;
        rps = _rps;
        timeUnlock = _timeUnlock;
    }

    function onERC721Received(
        address,
        address _from,
        uint256 _tokenId,
        bytes calldata
    ) external nonReentrant whenNotPaused returns (bytes4) {
        updateGlobalIndex();
        updateReward(_from);
        require(_from != address(this), "Invalid sender");
        require(
            msg.sender == address(positionManager),
            "Invalid Position Manager"
        );
        PositionCache memory cache;
        (
            ,
            ,
            cache.token0,
            cache.token1,
            cache.fee,
            cache.tickLower,
            cache.tickUpper,
            cache.liquidity,
            ,
            ,
            ,

        ) = positionManager.positions(_tokenId);
        require(
            cache.token0 == token0 && cache.token1 == token1,
            "Invalid token"
        );
        require(cache.fee == feePool, "Invalid fee");
        require(cache.liquidity > 0, "Invalid liquidity");
        require(
            cache.tickLower == tickLower && cache.tickUpper == tickUpper,
            "Invalid tick"
        );
        StakedNFT storage nft = stakedNFTs[_tokenId];
        nft.owner = _from;
        nft.liquidity = cache.liquidity;
        nft.status = statusNFT.STAKING;
        StakerInfo storage staker = stakers[_from];
        staker.balance += cache.liquidity;
        totalStaked += cache.liquidity;
        _updateTotalStaker(_from, _tokenId);
        emit Staked(_from, _tokenId, cache.liquidity);
        return this.onERC721Received.selector;
    }

    function unstake(uint256 tokenId) external passLockingTime {
        StakedNFT storage nft = stakedNFTs[tokenId];
        StakerInfo storage staker = stakers[msg.sender];
        require(nft.status == statusNFT.STAKING, "NFT not staking");
        require(nft.owner == msg.sender, "Not NFT owner");
        updateGlobalIndex();
        updateReward(msg.sender);
        positionManager.safeTransferFrom(address(this), msg.sender, tokenId);
        staker.balance -= nft.liquidity;
        totalStaked -= nft.liquidity;
        emit Unstaked(msg.sender, tokenId);
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

    function updateReward(address account) public {
        updateGlobalIndex();
        StakerInfo storage stakeData = stakers[account];
        stakeData.pendingReward +=
            ((globalIndex - stakeData.index) * stakeData.balance) /
            CALCULATE_PRECISION;
        stakeData.index = globalIndex;
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

    function _withdraw(address token, uint256 amount) internal {
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    function _updateTotalStaker(address account, uint256 indexID) internal {
        if (!newStakers[account]) {
            newStakers[account] = true;
            totalStaker += 1;
        }

        stakerToIndexToNFTID[account][
            stakerToNumberStakeNFT[account]
        ] = indexID;

        stakerToNumberStakeNFT[account] += 1;
    }

    function updateTick(int24 _tickLower, int24 _tickUpper) public onlyAdmin {
        tickLower = _tickLower;
        tickUpper = _tickUpper;
    }

    function updateRps(uint256 _rps) public onlyUpdater {
        updateGlobalIndex();
        rps = _rps;
    }

    function updateUpdater(address _updater) public onlyAdmin {
        admin = _updater;
    }

    function updateAdmin(address _admin) public onlyAdmin {
        admin = _admin;
    }

    function withdraw(address token, uint256 amount) public onlyAdmin {
        _withdraw(token, amount);
    }

    function updateTimeUnlock(uint256 _timeUnlock) public onlyAdmin {
        timeUnlock = _timeUnlock;
    }

    function pause() public onlyAdmin {
        _pause();
    }

    function unpause() public onlyAdmin {
        _unpause();
    }
}
