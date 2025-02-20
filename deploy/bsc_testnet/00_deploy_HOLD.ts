import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy("HOLD", {
        contract: "ERC20Mintable",
        from: deployer,
        args: ["Holdstation", "HOLD", 18],
        skipIfAlreadyDeployed: true,
        log: true,
    });
};

export default deploy;
deploy.tags = ["HOLD"];
