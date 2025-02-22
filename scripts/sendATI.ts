import hre from "hardhat";
import { ERC20Mintable__factory } from "../typechain-types";

async function mintATI() {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const address = "0x68723776Deac7eE13cdf6814B8F382B0C946C103";

    const ati = ERC20Mintable__factory.connect("0x3262336B903F8DeCB1d9c9259138065d6c6E2e6F", hre.ethers.provider);

    const caller = await hre.ethers.getSigner(deployer);

    const TxResponse = await ati.connect(caller).transfer(address, hre.ethers.parseEther("500"));
    await TxResponse.wait();
}
mintATI();
