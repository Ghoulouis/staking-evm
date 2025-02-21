import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, get } = deployments;
    const { deployer } = await getNamedAccounts();

    const admin = deployer;
    const nftPositonManager = "0x427bf5b37357632377ecbec9de3626c71a5396c1";
    const token0 = "0x098edCf5dA9a4a5E7585EB855C43Cde835487342";
    const token1 = "0xFD4bdaBA49D9FA683407d492A81aBb24C7cE0015";
    const fee = 100;
    const tickLower = -887272;
    const tickUpper = 887271;
    const tokenRewards = "0xFD4bdaBA49D9FA683407d492A81aBb24C7cE0015";
    const rps = ethers.parseUnits("1", 18);

    const timeUnlock = Math.round(Date.now() / 1000) + 60 * 15;
    await deploy("Vault_LP_ATI-HOLD", {
        contract: "UniswapV3LPStaking",
        from: deployer,
        skipIfAlreadyDeployed: true,
        log: true,
        args: [admin, nftPositonManager, token0, token1, fee, tickLower, tickUpper, tokenRewards, rps, timeUnlock],
    });
};

export default deploy;
deploy.tags = ["ATIPool"];
