import hre, { ethers } from "hardhat";
import { VaultStaking__factory } from "../typechain-types";
async function data() {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const vault = VaultStaking__factory.connect((await deployments.get("VaultStaking")).address, hre.ethers.provider);

    console.log(" address", await vault.getAddress());

    const totalStaked = await vault.totalStaked();

    console.log(ethers.formatEther(totalStaked));
}
data();
