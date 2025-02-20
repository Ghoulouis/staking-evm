// // SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.24;

// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/utils/Pausable.sol";
// import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";

// contract UniswapV3LPStaking is Ownable, Pausable {
//     struct StakerInfo {
//         uint256 id;
//         uint256 balance;
//         uint256 index;
//         uint256 pendingReward;
//     }

//     INonfungiblePositionManager public positionManager;

//     address public immutable token0;
//     address public immutable token1;
//     uint24 public feePool;

//     address public rewardToken;
//     uint256 public totalLiquidity;
//     uint256 public rps;

//     mapping(uint256 => StakerInfo) public stakers;

//     event Staked(address indexed user, uint256 tokenId, uint256 liquidity);
//     event Unstaked(address indexed user, uint256 tokenId);
//     event Claimed(address indexed user, uint256 amount);

//     constructor(
//         address _positionManager,
//         address _token0,
//         address _token1,
//         uint24 _feePool,
//         address _rewardToken,
//         uint256 _rps
//     ) Ownable(msg.sender) Pausable() {
//         positionManager = INonfungiblePositionManager(_positionManager);
//         rewardToken = _rewardToken;
//         token0 = _token0;
//         token1 = _token1;
//         feePool = _feePool;
//         rps = _rps;
//     }

//     function stake(uint256 tokenId) external whenNotPaused {
//         (
//             ,
//             ,
//             address token0Data,
//             address token1Data,
//             uint24 feePoolData,
//             ,
//             ,
//             ,
//             uint128 liquidity,
//             ,
//             ,
//             ,

//         ) = positionManager.positions(tokenId);

//         require(liquidity > 0, "Invalid LP token");
//         require(token0Data == token0, "Invalid token0");
//         require(token1Data == token1, "Invalid token1");
//         require(feePoolData == feePool, "Invalid feePool");

//         positionManager.safeTransferFrom(msg.sender, address(this), tokenId);

//         StakerInfo storage staker = stakers[msg.sender];

//         staker.id = tokenId;
//         staker.balance +
//             x = liquidity;

//         totalLiquidity += liquidity;

//         emit Staked(msg.sender, tokenId, liquidity);
//     }

//     function unstake(uint256 tokenId) external {
//         StakedNFT storage nft = stakedNFTs[tokenId];
//         require(nft.owner == msg.sender, "Not NFT owner");

//         positionManager.safeTransferFrom(address(this), msg.sender, tokenId);
//         totalLiquidity -= nft.liquidity;
//         delete stakedNFTs[tokenId];

//         emit Unstaked(msg.sender, tokenId);
//     }

//     function claimReward(uint256 tokenId) public {
//         StakedNFT storage nft = stakedNFTs[tokenId];
//         require(nft.owner == msg.sender, "Not NFT owner");

//         uint256 pending = (nft.liquidity * rewardPerLiquidity) /
//             1e18 -
//             nft.rewardDebt;
//         nft.rewardDebt = (nft.liquidity * rewardPerLiquidity) / 1e18;

//         IERC20(rewardToken).transfer(msg.sender, pending);

//         emit Claimed(msg.sender, pending);
//     }

//     function distributeRewards(uint256 amount) external onlyOwner {
//         require(totalLiquidity > 0, "No liquidity staked");
//         rewardPerLiquidity += (amount * 1e18) / totalLiquidity;
//     }
// }
