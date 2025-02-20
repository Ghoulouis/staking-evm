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
    uint256 totalRewandClaim;
    uint160 totalSecondsClaimedX128;

    uint256 public startTime;
    uint256 public endTime;
    // Error
    error WrongReceiver();

    // Events

    constructor(
        address _factory,
        address _nonfungiblePositionManager,
        address _tokenReward,
        address _pool,
        uint256 _timeStart,
        uint256 _timeEnd,
        uint256 _totalReward
    ) {
        factory = IUniswapV3Factory(_factory);
        nonfungiblePositionManager = INonfungiblePositionManager(
            _nonfungiblePositionManager
        );
        tokenReward = IERC20(_tokenReward);
        pool = IUniswapV3Pool(_pool);
        startTime = _timeStart;
        endTime = _timeEnd;
        totalRewardUnclaimed = _totalReward;
    }

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

        // update reward
        (uint256 reward, uint160 secondsInsideX128) = _computeRewardAmount(
            totalRewardUnclaimed,
            totalSecondsClaimedX128,
            startTime,
            endTime,
            positionInfo.liquidity,
            positionInfo.indexTimeInsideX128,
            indexTimeInsideNowX128,
            block.timestamp
        );

        totalSecondsClaimedX128 += secondsInsideX128;
        totalRewardUnclaimed -= reward;
        rewards[positionInfo.owner] += reward;
        delete positionInfos[_tokenId];
        // transfer position
        nonfungiblePositionManager.safeTransferFrom(
            address(this),
            msg.sender,
            _tokenId
        );
    }

    function _computeRewardAmount(
        uint256 _totalRewardUnclaimed,
        uint160 _totalSecondsClaimedX128,
        uint256 _startTime,
        uint256 _endTime,
        uint128 _liquidity,
        uint160 _secondsPerLiquidityInsideInitialX128,
        uint160 _secondsPerLiquidityInsideX128,
        uint256 _currentTime
    ) internal pure returns (uint256 _reward, uint160 _secondsInsideX128) {
        assert(_currentTime >= _startTime);

        _secondsInsideX128 =
            (_secondsPerLiquidityInsideX128 -
                _secondsPerLiquidityInsideInitialX128) *
            _liquidity;

        uint256 _totalSecondsUnclaimedX128 = ((Math.min(
            _endTime,
            _currentTime
        ) - _startTime) << 128) - _totalSecondsClaimedX128;

        _reward = Math.mulDiv(
            _totalRewardUnclaimed,
            _secondsInsideX128,
            _totalSecondsUnclaimedX128
        );
    }
}
