import hre, { ethers } from "hardhat";
import { IUniswapV3Pool__factory, UniswapV3LPStaking__factory } from "../typechain-types";
import BigNumber from "bignumber.js";

// Hàm tính sqrtPrice từ tick
function getSqrtRatioAtTick(tick: number): BigNumber {
    return new BigNumber(Math.floor(Math.sqrt(1.0001 ** tick) * 2 ** 96));
}
// Hàm tính số lượng token0 và token1
function getAmountsForLiquidity(
    liquidity: BigNumber,
    sqrtPriceX96: BigNumber,
    sqrtPriceLowerX96: BigNumber,
    sqrtPriceUpperX96: BigNumber
) {
    let amount0 = new BigNumber(0);
    let amount1 = new BigNumber(0);

    if (sqrtPriceX96.lt(sqrtPriceLowerX96)) {
        // Toàn bộ giá trị ở token0
        amount0 = liquidity
            .times(sqrtPriceUpperX96.minus(sqrtPriceLowerX96))
            .div(sqrtPriceLowerX96)
            .div(sqrtPriceUpperX96);
    } else if (sqrtPriceX96.lt(sqrtPriceUpperX96)) {
        // LP chứa cả token0 và token1
        amount0 = liquidity.times(sqrtPriceUpperX96.minus(sqrtPriceX96)).div(sqrtPriceX96).div(sqrtPriceUpperX96);
        amount1 = liquidity.times(sqrtPriceX96.minus(sqrtPriceLowerX96)).div(new BigNumber(2).pow(96));
    } else {
        // Toàn bộ giá trị ở token1
        amount1 = liquidity.times(sqrtPriceUpperX96.minus(sqrtPriceLowerX96)).div(new BigNumber(2).pow(96));
    }
    return { amount0, amount1 };
}

async function data() {
    const { deployments, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();

    const vault = UniswapV3LPStaking__factory.connect(
        (await deployments.get("Vault_LP_ATI-HOLD")).address,
        hre.ethers.provider
    );

    console.log("Vault Address:", await vault.getAddress());

    // Lấy thông tin về tick và liquidity
    let tickLower = await vault.tickLower();
    let tickUpper = await vault.tickUpper();
    let liquidity = new BigNumber((await vault.totalStaked()).toString());

    // Kết nối Uniswap V3 Pool
    const pool = IUniswapV3Pool__factory.connect("0x719f061FcC15eBEa2f045Def463594cFb7d8f69a", hre.ethers.provider);

    let slot0 = await pool.slot0();
    let sqrtPriceX96 = new BigNumber(slot0.sqrtPriceX96.toString());

    // Chuyển đổi tick thành sqrtPriceX96
    let sqrtPriceLowerX96 = getSqrtRatioAtTick(Number(tickLower));
    let sqrtPriceUpperX96 = getSqrtRatioAtTick(Number(tickUpper));

    // Tính số lượng token0 và token1
    let { amount0, amount1 } = getAmountsForLiquidity(liquidity, sqrtPriceX96, sqrtPriceLowerX96, sqrtPriceUpperX96);

    console.log(`Token0 Amount: ${amount0.toString()}`);
    console.log(`Token1 Amount: ${amount1.toString()}`);
}

data();
