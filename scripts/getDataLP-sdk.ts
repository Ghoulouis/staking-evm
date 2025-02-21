import hre, { ethers } from "hardhat";
import { IUniswapV3Pool__factory, UniswapV3LPStaking__factory } from "../typechain-types";
import BigNumber from "bignumber.js";
import { TickMath } from "@uniswap/v3-sdk";

// Chuyển đổi tick thành sqrtPriceX96
function getSqrtRatioAtTick(tick: number): BigNumber {
    return BigNumber(TickMath.getSqrtRatioAtTick(tick).toString());
}
// Tính số lượng token0 và token1
function getAmountsForLiquidity(
    liquidity: BigNumber,
    sqrtPriceX96: BigNumber,
    sqrtPriceLowerX96: BigNumber,
    sqrtPriceUpperX96: BigNumber
) {
    let amount0 = new BigNumber(0);
    let amount1 = new BigNumber(0);

    if (sqrtPriceX96.lte(sqrtPriceLowerX96)) {
        amount0 = liquidity
            .times(sqrtPriceUpperX96.minus(sqrtPriceLowerX96))
            .div(sqrtPriceLowerX96)
            .div(sqrtPriceUpperX96);
    } else if (sqrtPriceX96.lt(sqrtPriceUpperX96)) {
        amount0 = liquidity.times(sqrtPriceUpperX96.minus(sqrtPriceX96)).div(sqrtPriceX96).div(sqrtPriceUpperX96);
        amount1 = liquidity.times(sqrtPriceX96.minus(sqrtPriceLowerX96)).div(new BigNumber(2).pow(96));
    } else {
        amount1 = liquidity.times(sqrtPriceUpperX96.minus(sqrtPriceLowerX96)).div(new BigNumber(2).pow(96));
    }

    return { amount0, amount1 };
}

async function main() {
    const { deployments, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();

    const vault = UniswapV3LPStaking__factory.connect(
        (await deployments.get("Vault_LP_ATI-HOLD")).address,
        hre.ethers.provider
    );

    console.log("Vault Address:", await vault.getAddress());

    // Giá trị tick và liquidity
    let tickLower = -887272;
    let tickUpper = 887271;
    let liquidity = new BigNumber((await vault.totalStaked()).toString());
    console.log(`liquidity: ${liquidity}`);
    // Kết nối Uniswap V3 Pool
    const pool = IUniswapV3Pool__factory.connect("0x719f061FcC15eBEa2f045Def463594cFb7d8f69a", hre.ethers.provider);

    let slot0 = await pool.slot0();
    let sqrtPriceX96 = new BigNumber(slot0.sqrtPriceX96.toString());
    console.log(`sqrtPriceX96: ${sqrtPriceX96.toFixed()}`);
    // Chuyển đổi tick thành sqrtPriceX96
    let sqrtPriceLowerX96 = getSqrtRatioAtTick(tickLower);
    let sqrtPriceUpperX96 = getSqrtRatioAtTick(tickUpper);

    console.log(`sqrtPriceLowerX96: ${sqrtPriceLowerX96.toFixed()}`);
    console.log(`sqrtPriceUpperX96: ${sqrtPriceUpperX96.toFixed()}`);
    // Tính amount0 và amount1
    let { amount0, amount1 } = getAmountsForLiquidity(liquidity, sqrtPriceX96, sqrtPriceLowerX96, sqrtPriceUpperX96);
    console.log(`Token1 Amount: ${ethers.formatEther(amount1.toFixed(0))}`);
    console.log(`Token0 Amount: ${ethers.formatEther(amount0.toFixed(0))}`);
}

main();
