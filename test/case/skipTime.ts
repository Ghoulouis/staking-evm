import { ethers } from "hardhat";

export async function skipTime(second: number) {
    await ethers.provider.send("evm_increaseTime", [second - 1]);
    await ethers.provider.send("evm_mine", []);
}
