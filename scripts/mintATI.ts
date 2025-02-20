import hre from "hardhat";
import { ERC20Mintable__factory } from "../typechain-types";

async function mintATI() {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const address = "0x9E190c2186e2C9d3c165908062ae292aAa285c4E";

    const ati = ERC20Mintable__factory.connect((await deployments.get("ATI")).address, hre.ethers.provider);

    const caller = await hre.ethers.getSigner(deployer);

    const TxResponse = await ati.connect(caller).mint(address, hre.ethers.parseEther("100000"));
    await TxResponse.wait();
}
mintATI();
