import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, get } = deployments;
    const { deployer } = await getNamedAccounts();
    const ati = "0x3262336B903F8DeCB1d9c9259138065d6c6E2e6F";
    const updater = deployer;

    const nftPosition = "0x7346aF84D25c318a5D233cA43f42673Dc99EaB17";

    const token0 = "0x3262336B903F8DeCB1d9c9259138065d6c6E2e6F"; // ait

    const token1 = "0xFF0a636Dfc44Bb0129b631cDd38D21B613290c98"; // hold

    const fee = 3000;
    const tickLower = -887270;
    const tickUpper = 887270;
    const tokenReward = ati;

    const rps = ethers.parseUnits("0", 18);

    const timeUnlock = Math.round(new Date("2025-08-20T03:00:00Z").getTime() / 1000);

    await deploy("Vault_LP_ATI-HOLD", {
        contract: "UniswapV3LPStakingUpgradeable",
        from: deployer,
        log: true,
        proxy: {
            owner: deployer,
            execute: {
                init: {
                    methodName: "initialize",
                    args: [
                        updater,
                        nftPosition,
                        token0,
                        token1,
                        fee,
                        tickLower,
                        tickUpper,
                        tokenReward,
                        rps,
                        timeUnlock,
                    ],
                },
            },
        },
    });
};

export default deploy;
deploy.tags = ["ATI", "folked-bera"];
