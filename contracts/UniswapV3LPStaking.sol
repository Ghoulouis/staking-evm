// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";

contract UniswapV3LPStaking is Ownable, Pausable {
    using SafeERC20 for IERC20;

    enum statusNFT {
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

    INonfungiblePositionManager public positionManager;

    address public immutable token0;
    address public immutable token1;
    uint24 public feePool;
    address public rewardToken;
    uint256 public totalStaked;

    address public tokenRewards;
    uint256 public rps;
    uint256 public globalIndex;
    uint256 public lastUpdated;
    uint256 public totalStaker;
    uint256 public timeUnlock;

    uint256 public constant CALCULATE_PRECISION = 1e18;

    mapping(address => StakerInfo) public stakers;
    mapping(uint256 => StakedNFT) public stakedNFTs;

    event Staked(address indexed user, uint256 tokenId, uint256 liquidity);
    event Unstaked(address indexed user, uint256 tokenId);
    event Claimed(address indexed user, uint256 amount);

    constructor(
        address _positionManager,
        address _token0,
        address _token1,
        uint24 _feePool,
        address _rewardToken,
        uint256 _rps
    ) Ownable(msg.sender) Pausable() {
        positionManager = INonfungiblePositionManager(_positionManager);
        rewardToken = _rewardToken;
        token0 = _token0;
        token1 = _token1;
        feePool = _feePool;
        rps = _rps;
    }

    function stake(uint256 tokenId) external whenNotPaused {
        (
            ,
            ,
            address token0Data,
            address token1Data,
            uint24 feePoolData,
            ,
            ,
            uint128 liquidity,
            ,
            ,
            ,

        ) = positionManager.positions(tokenId);
        require(liquidity > 0, "Invalid LP token");
        require(token0Data == token0, "Invalid token0");
        require(token1Data == token1, "Invalid token1");
        require(feePoolData == feePool, "Invalid feePool");

        positionManager.safeTransferFrom(msg.sender, address(this), tokenId);
        StakedNFT storage nft = stakedNFTs[tokenId];
        StakerInfo storage staker = stakers[msg.sender];
        nft.owner = msg.sender;
        nft.liquidity = liquidity;
        nft.status = statusNFT.STAKING;
        staker.balance += liquidity;
        totalStaked += liquidity;
        emit Staked(msg.sender, tokenId, liquidity);
    }

    function unstake(uint256 tokenId) external {
        StakedNFT storage nft = stakedNFTs[tokenId];
        StakerInfo storage staker = stakers[msg.sender];
        require(nft.status == statusNFT.STAKING, "NFT not staking");
        require(nft.owner == msg.sender, "Not NFT owner");
        positionManager.safeTransferFrom(address(this), msg.sender, tokenId);
        staker.balance -= nft.liquidity;
        totalStaked -= nft.liquidity;
        emit Unstaked(msg.sender, tokenId);
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

    function withdraw(address token, uint256 amount) public onlyOwner {
        _withdraw(token, amount);
    }

    function _withdraw(address token, uint256 amount) internal {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
