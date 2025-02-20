import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, get } = deployments;
    const { deployer } = await getNamedAccounts();

    const rewards = ethers.parseEther("40000000"); // 40,000,000 ATI

    const factory = "0xCaca5910586473646F294d8FA5530cA9E8E3fc38";

    const nftPositonManager = "0x7346aF84D25c318a5D233cA43f42673Dc99EaB17";

    const pool = "0x9aef6241c191fed841ca45120cefd582ca8fd0d9";

    const ati = "0x3262336B903F8DeCB1d9c9259138065d6c6E2e6F";

    const dayStart = Math.round(new Date("2025-02-20T03:00:00Z").getTime() / 1000);

    const dayEnd = Math.round(new Date("2025-08-20T03:00:00Z").getTime() / 1000);

    await deploy("Vault_LP_ATI-HOLD", {
        contract: "UniswapV3Staker",
        from: deployer,
        args: [factory, nftPositonManager, ati, pool, dayStart, dayEnd, rewards],
        skipIfAlreadyDeployed: true,
        log: true,
    });
};

export default deploy;
deploy.tags = ["ATIPool"];
