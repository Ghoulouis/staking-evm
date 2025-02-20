// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/math/Math.sol";

import "./libraries/NFTPositionInfo.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract UniswapV3Staker is ReentrancyGuard {
    using SafeERC20 for IERC20;
    struct PositionInfo {
        address owner;
        uint256 index;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
        uint160 indexTimeInsideX128;
    }
    struct DepositCache {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
    }
    IUniswapV3Factory public immutable factory;
    INonfungiblePositionManager public immutable nonfungiblePositionManager;
    IUniswapV3Pool public immutable pool;
    IERC20 public immutable tokenReward;
    mapping(uint256 => PositionInfo) public positionInfos;
    mapping(address => uint256) public rewards;
    // Incentive
    uint256 totalRewardUnclaimed;
    uint160 totalSecondsClaimedX128;
    uint256 public startTime;
    uint256 public endTime;
    // Error
    error WrongReceiver();

    // Events
    function onERC721Received(
        address,
        address _from,
        uint256 _tokenId,
        bytes calldata
    ) external nonReentrant returns (bytes4) {
        require(
            msg.sender == address(nonfungiblePositionManager),
            "Invalid Position Manager"
        );
        DepositCache memory cache;
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

        ) = nonfungiblePositionManager.positions(_tokenId);

        (, uint160 indexTimeInsideNowX128, ) = pool.snapshotCumulativesInside(
            cache.tickLower,
            cache.tickUpper
        );

        PositionInfo storage positionInfo = positionInfos[_tokenId];
        positionInfo.tickLower = cache.tickLower;
        positionInfo.tickUpper = cache.tickUpper;
        positionInfo.owner = _from;
        positionInfo.liquidity = cache.liquidity;
        positionInfo.indexTimeInsideX128 = indexTimeInsideNowX128;
        return this.onERC721Received.selector;
    }

    function unstake(uint256 _tokenId) external nonReentrant {
        PositionInfo storage positionInfo = positionInfos[_tokenId];
        // check
        require(positionInfo.owner != address(0), "Position does not exist");

        require(positionInfo.owner == msg.sender, "Not owner");
        // calulate reward
        (, uint160 indexTimeInsideNowX128, ) = pool.snapshotCumulativesInside(
            positionInfo.tickLower,
            positionInfo.tickUpper
        );
        uint160 secondsInsideX128 = (indexTimeInsideNowX128 -
            positionInfo.indexTimeInsideX128);
        // update reward
        uint256 tickRange = uint256(
            int256(positionInfo.tickUpper - positionInfo.tickLower)
        );
        uint256 reward = (secondsInsideX128 * positionInfo.liquidity) /
            (tickRange + 1);
        rewards[positionInfo.owner] += reward;
        // transfer position
        nonfungiblePositionManager.safeTransferFrom(
            address(this),
            msg.sender,
            _tokenId
        );
        delete positionInfos[_tokenId];
    }
}
