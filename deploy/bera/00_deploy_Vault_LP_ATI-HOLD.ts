import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, get } = deployments;
    const { deployer } = await getNamedAccounts();

    const ati = (await get("ATI")).address;
    const rps = ethers.parseUnits("0", 18);
    await deploy("VaultStaking", {
        contract: "VaultStaking",
        from: deployer,
        args: [ati, ati, rps, deployer],
        skipIfAlreadyDeployed: true,
        log: true,
    });
};

export default deploy;
deploy.tags = ["ATI"];
