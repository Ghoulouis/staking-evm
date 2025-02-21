import hre, { ethers } from "hardhat";
import { ERC20Staking__factory, IUniswapV3Pool__factory, UniswapV3LPStaking__factory } from "../typechain-types";
import BigNumber from "bignumber.js";

async function data() {
    const { deployments, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();
    const vault = ERC20Staking__factory.connect((await deployments.get("Vault_ATI")).address, hre.ethers.provider);

    const total_staked = await vault.totalStaked();
    console.log(`Total staked: ${ethers.formatEther(total_staked)}`);
    let numberATI = BigNumber(ethers.formatEther(total_staked));
    let priceATI = BigNumber(0.000126);

    let totalValue = numberATI.times(priceATI);
    let apy = BigNumber(0.2);
    let rewardPerDay = totalValue.times(apy).div(365);
    let rps = rewardPerDay.div(24).div(60).div(60);
    let atiPs = rps.div(priceATI).toFixed(17);

    console.log(`Reward per second: ${atiPs} ATI`);
    const rpsOffChain = ethers.parseEther(atiPs);
    const rpsOnChain = await vault.rps();
    console.log(`Reward per second on chain: ${ethers.formatUnits(rpsOnChain)}`);

    const caller = await hre.ethers.getSigner(deployer);
    let txRespone, txReceipt;
    if (
        Math.abs(Number(ethers.formatEther(rpsOffChain)) - Number(ethers.formatEther(rpsOnChain))) >
        Number(ethers.formatEther(rpsOffChain)) / 100
    ) {
        console.log(`Update RPS from ${ethers.formatUnits(rpsOnChain)} to ${ethers.formatUnits(rpsOffChain)}`);
        txRespone = await vault.connect(caller).updateRps(ethers.parseEther(atiPs));
        txReceipt = await txRespone.wait();
    }

    const timeUnlock = Math.round(new Date("2025-06-22T03:00:00Z").getTime() / 1000);
    txRespone = await vault.connect(caller).updateTimeUnlock(timeUnlock);
    txReceipt = await txRespone.wait();

    const reward = await vault.viewReward(deployer);
    console.log(`Reward: ${ethers.formatUnits(reward)}`);
}

data();
