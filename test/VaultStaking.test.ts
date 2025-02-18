import { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { deployments, ethers } from "hardhat";
import { ERC20Mintable, ERC20Mintable__factory, VaultStaking, VaultStaking__factory } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { skipTime } from "./case/skipTime";
import { expect } from "chai";

describe("Vault staking", function () {
    let snapshot: any;
    let vault: VaultStaking;
    let owner: HardhatEthersSigner, bob: HardhatEthersSigner, alice: HardhatEthersSigner;
    let athenai: ERC20Mintable;

    before(async () => {
        await deployments.fixture();
        snapshot = await takeSnapshot();
    });

    beforeEach(async () => {
        await snapshot.restore();
        [owner, bob, alice] = await ethers.getSigners();
        vault = VaultStaking__factory.connect((await deployments.get("VaultStaking")).address, ethers.provider);
        athenai = ERC20Mintable__factory.connect((await deployments.get("ATI")).address, ethers.provider);
        // Mint & Approve tokens
        await athenai.connect(owner).mint(bob.address, ethers.parseEther("100"));
        await athenai.connect(owner).mint(alice.address, ethers.parseEther("100"));
        await athenai.connect(owner).approve(await vault.getAddress(), ethers.parseEther("1000"));
        await athenai.connect(bob).approve(await vault.getAddress(), ethers.MaxUint256);
        await athenai.connect(alice).approve(await vault.getAddress(), ethers.MaxUint256);
        await skipTime(20);
    });

    it("should allow user to stake", async () => {
        await expect(vault.connect(bob).stake(ethers.parseEther("100")))
            .to.be.emit(vault, "Staked")
            .withArgs(bob.address, ethers.parseEther("100"));
        const totalStaked = await vault.totalStaked();
        expect(totalStaked).to.be.eq(ethers.parseEther("100"));
        await skipTime(50);
        await vault.connect(bob).updateReward(bob.address);
        const stakerInfo = await vault.stakers(bob.address);
        expect(stakerInfo.balance).to.be.eq(ethers.parseEther("100"));
        expect(stakerInfo.pendingReward).to.be.eq(ethers.parseEther("50"));
    });

    it("should allow user to stake", async () => {
        await expect(vault.connect(bob).stake(ethers.parseEther("100")))
            .to.be.emit(vault, "Staked")
            .withArgs(bob.address, ethers.parseEther("100"));
        const totalStaked = await vault.totalStaked();
        expect(totalStaked).to.be.eq(ethers.parseEther("100"));
        await skipTime(2534);
        const estimatedReward = await vault.viewReward(bob.address);
        await vault.connect(bob).updateReward(bob.address);
        const stakerInfo = await vault.stakers(bob.address);
        expect(stakerInfo.pendingReward).to.be.approximately(estimatedReward, ethers.parseEther("1"));
        // expect(stakerInfo.pendingReward).to.be.eq(ethers.parseEther("50"));
    });

    it("should allow user to claim reward", async () => {
        await vault.connect(bob).stake(ethers.parseEther("100"));
        await skipTime(40);
        await vault.connect(owner).updateGlobalIndex();
        await vault.connect(bob).claimReward();
        const stakerInfo = await vault.stakers(bob.address);
        expect(stakerInfo.pendingReward).to.be.eq(0);
    });

    it("should allow user to unstake", async () => {
        await vault.connect(bob).stake(ethers.parseEther("100"));
        await skipTime(50);
        await vault.connect(bob).unstake(ethers.parseEther("50"));

        const stakerInfo = await vault.stakers(bob.address);
        expect(stakerInfo.balance).to.be.eq(ethers.parseEther("50"));
    });

    it("should revert unstake if balance is insufficient", async () => {
        await vault.connect(bob).stake(ethers.parseEther("100"));
        await expect(vault.connect(bob).unstake(ethers.parseEther("200"))).to.be.revertedWith("not enough balance");
    });

    it("should allow owner to pause and unpause staking", async () => {
        await vault.connect(owner).pause();
        await expect(vault.connect(bob).stake(ethers.parseEther("100"))).to.be.revertedWithCustomError;

        await vault.connect(owner).unpause();
        await expect(vault.connect(bob).stake(ethers.parseEther("100"))).to.not.be.reverted;
    });

    it("should distribute rewards correctly when multiple users stake", async () => {
        await vault.connect(bob).stake(ethers.parseEther("100"));
        await skipTime(50);
        await vault.connect(alice).stake(ethers.parseEther("100"));
        await skipTime(50);
        await vault.connect(bob).updateReward(bob.address);
        await vault.connect(alice).updateReward(alice.address);
        const bobInfo = await vault.stakers(bob.address);
        const aliceInfo = await vault.stakers(alice.address);
        expect(bobInfo.pendingReward).to.be.eq(ethers.parseEther("75"));
        expect(aliceInfo.pendingReward).to.be.approximately(ethers.parseEther("25"), ethers.parseEther("1"));
    });

    it("should update RPS correctly", async () => {
        await vault.connect(owner).updateConfig(ethers.parseEther("2"));
        await vault.connect(bob).stake(ethers.parseEther("100"));
        await skipTime(50);
        await vault.connect(bob).updateReward(bob.address);

        const bobInfo = await vault.stakers(bob.address);
        expect(bobInfo.pendingReward).to.be.eq(ethers.parseEther("100"));
    });
});
