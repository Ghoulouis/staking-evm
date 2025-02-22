import hre, { ethers } from "hardhat";
import { IUniswapV3Pool__factory, UniswapV3LPStaking__factory } from "../typechain-types";
import BigNumber from "bignumber.js";
import { TickMath } from "@uniswap/v3-sdk";

async function main() {
    const { deployments, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();

    const vault = UniswapV3LPStaking__factory.connect(
        (await deployments.get("Vault_LP_ATI-HOLD")).address,
        hre.ethers.provider
    );

    const caller = await hre.ethers.getSigner(deployer);

    const unlockTime = await vault.timeUnlock();

    const unlockDate = new Date(Number(unlockTime * 1000n));
    console.log("Unlock date: ", unlockDate.toDateString());

    //  await vault.connect(caller).updateTick(-887220, 887220);
    //const timeUnlock = Math.round(new Date("2025-08-21T15:00:00Z").getTime() / 1000);
    //await vault.connect(caller).updateTimeUnlock(timeUnlock);
}

main();
