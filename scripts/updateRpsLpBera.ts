import hre, { ethers, network } from "hardhat";
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

    let sqrtPriceUpper = sqrtPriceUpperX96.div(new BigNumber(2).pow(96));
    let sqrtPrice = sqrtPriceX96.div(new BigNumber(2).pow(96));
    amount0 = liquidity.times(sqrtPriceUpper.minus(sqrtPrice)).div(sqrtPriceUpper.times(sqrtPrice));
    amount1 = liquidity.times(sqrtPriceX96.minus(sqrtPriceLowerX96)).div(new BigNumber(2).pow(96));
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
    let tickLower = -887220;
    let tickUpper = 887220;
    let liquidity = new BigNumber((await vault.totalStaked()).toString());
    // Kết nối Uniswap V3 Pool
    let pool = IUniswapV3Pool__factory.connect("0x9aef6241c191fed841ca45120cefd582ca8fd0d9", hre.ethers.provider);

    let slot0 = await pool.slot0();
    let sqrtPriceX96 = new BigNumber(slot0.sqrtPriceX96.toString());
    // Chuyển đổi tick thành sqrtPriceX96
    let sqrtPriceLowerX96 = getSqrtRatioAtTick(Number(tickLower));
    let sqrtPriceUpperX96 = getSqrtRatioAtTick(Number(tickUpper));
    // Tính số lượng token0 và token1
    let { amount0, amount1 } = getAmountsForLiquidity(liquidity, sqrtPriceX96, sqrtPriceLowerX96, sqrtPriceUpperX96);
    console.log(`Token0 Amount: ${ethers.formatEther(amount0.toFixed(0))}`);
    console.log(`Token1 Amount: ${ethers.formatEther(amount1.toFixed(0))}`);
    let numberATI = BigNumber(ethers.formatEther(amount0.toFixed(0)));
    let numberHOLD = BigNumber(ethers.formatEther(amount1.toFixed(0)));
    // let priceATI = BigNumber(0.000126);
    // let priceHOLD = BigNumber(1.43083);
    // let totalValue = numberATI.times(priceATI).plus(numberHOLD.times(priceHOLD));

    // let rewardPerDay = totalValue.times(apy).div(365);
    // let rps = rewardPerDay.div(24).div(60).div(60);
    // let atiPs = rps.div(priceATI).toFixed(17);

    let priceRatio = sqrtPriceX96.div(new BigNumber(2).pow(96)).pow(2);
    let apy = BigNumber(0.5);
    console.log(`Price Ratio: ${priceRatio}`);
    let totalValueInToken0 = numberATI.plus(numberHOLD.div(priceRatio));
    let rewardPerDay2 = totalValueInToken0.times(apy).div(365);
    let rps2 = rewardPerDay2.div(24).div(60).div(60);
    let atiPs2 = rps2.toFixed(17);

    console.log(`Reward per second: ${atiPs2} ATI`);
    const rpsOffChain = ethers.parseEther(atiPs2);
    const rpsOnChain = await vault.rps();
    console.log(`Reward per second on chain: ${ethers.formatUnits(rpsOnChain)}`);
    console.log(`Update RPS from ${ethers.formatUnits(rpsOnChain)} to ${ethers.formatUnits(rpsOffChain)}`);
    const caller = await hre.ethers.getSigner(deployer);
    let txRespone, txReceipt;
    if (
        Math.abs(Number(ethers.formatEther(rpsOffChain)) - Number(ethers.formatEther(rpsOnChain))) >
        Number(ethers.formatEther(rpsOffChain)) / 50
    ) {
        console.log(`Updateeee RPS from ${ethers.formatUnits(rpsOnChain)} to ${ethers.formatUnits(rpsOffChain)}`);
        txRespone = await vault.connect(caller).updateRps(ethers.parseEther(atiPs2));
        txReceipt = await txRespone.wait();
    }

    const reward = await vault.viewReward("0x690DC38a26ab11A6CA1D0B8c27070AD9828B6D69");
    console.log(`Reward: ${ethers.formatUnits(reward)}`);
}

data();
