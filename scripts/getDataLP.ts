import hre, { ethers } from "hardhat";
import { UniswapV3Staker__factory } from "../typechain-types";
async function data() {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const vault = UniswapV3Staker__factory.connect(
        (await deployments.get("Vault_LP_ATI-HOLD")).address,
        hre.ethers.provider
    );

    console.log(" address", await vault.getAddress());

    const startTime = await vault.startTime();

    const endTime = await vault.endTime();
}
data();
