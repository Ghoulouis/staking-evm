import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, get } = deployments;
    const { deployer } = await getNamedAccounts();

    const ati = (await get("ATI")).address;
    const rps = ethers.parseUnits("1", 18);
    const timeUnlock = Math.round(Date.now() / 1000) + 60 * 15;

    const factory = "0x0bfbcf9fa4f9c56b0f40a671ad40e0805a091865";

    const nftPositonManager = "0x427bf5b37357632377ecbec9de3626c71a5396c1";

    const pool = "0x719f061FcC15eBEa2f045Def463594cFb7d8f69a";

    const dayStart = Math.round(new Date("2025-02-20T03:00:00Z").getTime() / 1000);
    const dayEnd = Math.round(new Date("2025-08-20T03:00:00Z").getTime() / 1000);
    const rewards = ethers.parseEther("40000000"); // 40,000,000 ATI

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
