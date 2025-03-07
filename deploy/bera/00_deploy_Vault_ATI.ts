import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, get } = deployments;
    const { deployer } = await getNamedAccounts();

    const ati = "0x3262336B903F8DeCB1d9c9259138065d6c6E2e6F";
    const tokenReward = ati;
    const tokenStaked = ati;
    const rps = ethers.parseUnits("0", 18);
    const updater = deployer;
    const timeUnlock = Math.round(new Date("2025-08-20T03:00:00Z").getTime() / 1000);

    await deploy("Vault_ATI", {
        contract: "ERC20StakingUpgradeable",
        from: deployer,
        log: true,
        proxy: {
            owner: deployer,
            execute: {
                init: {
                    methodName: "initialize",
                    args: [tokenReward, tokenStaked, rps, updater, timeUnlock],
                },
            },
        },
    });
};

export default deploy;
deploy.tags = ["ATI", "folked-bera"];
