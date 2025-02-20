import hre, { ethers } from "hardhat";
import { ERC20Mintable__factory, VaultStaking__factory } from "../typechain-types";

async function mintATI() {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const address = "0x690DC38a26ab11A6CA1D0B8c27070AD9828B6D69";

    const ati = ERC20Mintable__factory.connect((await deployments.get("ATI")).address, hre.ethers.provider);

    const vault = VaultStaking__factory.connect((await deployments.get("VaultStaking")).address, hre.ethers.provider);
    const caller = await hre.ethers.getSigner(deployer);
    let balance = await ati.balanceOf(deployer);
    console.log("Balance before stake", balance.toString());
    const amount = ethers.parseEther("10");
    console.log("approving...");
    let txResponse = await ati.connect(caller).approve(await vault.getAddress(), amount);

    await txResponse.wait();
    console.log("stake...");
    txResponse = await vault.connect(caller).stake(amount);

    await txResponse.wait();
    const staker = await vault.stakers(deployer);
    console.log("Staker", staker);
}
mintATI();
