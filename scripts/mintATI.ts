import hre from "hardhat";
import { ERC20Mintable__factory } from "../typechain-types";

async function mintATI() {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const address = "0x43EDA4AE74889f89eeca06CF89177d1746Ac65A6";

    const ati = ERC20Mintable__factory.connect((await deployments.get("ATI")).address, hre.ethers.provider);

    const caller = await hre.ethers.getSigner(deployer);

    const TxResponse = await ati.connect(caller).mint(address, hre.ethers.parseEther("10000"));
    await TxResponse.wait();
}
mintATI();
