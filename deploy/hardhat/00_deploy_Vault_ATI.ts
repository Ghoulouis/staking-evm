import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, get } = deployments;
    const { deployer } = await getNamedAccounts();

    const ati = (await get("ATI")).address;
    const rps = ethers.parseUnits("1", 18); // 1 token reward per second
    const timeUnlock = Math.round(Date.now() / 1000);
    await deploy("Vault_ATI", {
        contract: "ERC20Staking",
        from: deployer,
        args: [ati, ati, rps, deployer, timeUnlock],
        skipIfAlreadyDeployed: true,
        log: true,
    });
};

export default deploy;
deploy.tags = ["ATI"];
