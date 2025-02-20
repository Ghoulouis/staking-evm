import { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { deployments, ethers } from "hardhat";
import { ERC20Mintable, ERC20Mintable__factory, ERC20Staking, ERC20Staking__factory } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { skipTime } from "./case/skipTime";
import { expect } from "chai";
import { beforeEach } from "mocha";

describe("ERC20 staking", function () {
    let snapshot: any;
    let vault: ERC20Staking;
    let owner: HardhatEthersSigner, bob: HardhatEthersSigner, alice: HardhatEthersSigner;
    let athenai: ERC20Mintable;

    before(async () => {
        await deployments.fixture();
        snapshot = await takeSnapshot();
    });

    beforeEach(async () => {
        await snapshot.restore();
        [owner, bob, alice] = await ethers.getSigners();
        vault = ERC20Staking__factory.connect((await deployments.get("Vault_ATI")).address, ethers.provider);
        athenai = ERC20Mintable__factory.connect((await deployments.get("ATI")).address, ethers.provider);
        // Mint & Approve tokens
        await athenai.connect(owner).mint(bob.address, ethers.parseEther("100"));
        await athenai.connect(owner).mint(alice.address, ethers.parseEther("100"));
        await athenai.connect(owner).approve(await vault.getAddress(), ethers.parseEther("1000"));
        await athenai.connect(bob).approve(await vault.getAddress(), ethers.MaxUint256);
        await athenai.connect(alice).approve(await vault.getAddress(), ethers.MaxUint256);
        await skipTime(20);
    });

    describe("Stake func", () => {
        it("should allow user to stake", async () => {
            let balanceStakedBefore = await athenai.balanceOf(await vault.getAddress());
            await expect(vault.connect(bob).stake(ethers.parseEther("100")))
                .to.be.emit(vault, "Staked")
                .withArgs(bob.address, ethers.parseEther("100"));
            let balanceStakedAfter = await athenai.balanceOf(await vault.getAddress());
            expect(balanceStakedAfter - balanceStakedBefore).to.be.eq(ethers.parseEther("100"));
            await skipTime(50);
            const stakerInfo = await vault.stakers(bob.address);
            expect(stakerInfo.balance).to.be.eq(ethers.parseEther("100"));
            expect(stakerInfo.pendingReward).to.be.eq(ethers.parseEther("0"));
        });
    });

    describe("Claim func", () => {
        beforeEach(async () => {
            await vault.connect(bob).stake(ethers.parseEther("100"));
        });

        it("failds if user call before unlock time", async () => {
            await vault.connect(owner).updateTimeUnlock(Math.round(Date.now() / 1000) + 5 * 24 * 60 * 60);
            await expect(vault.connect(bob).claimReward()).to.be.revertedWith("still locking");
        });

        it("should allow user to claim reward", async () => {
            await skipTime(40);
            await vault.connect(bob).claimReward();
            const stakerInfo = await vault.stakers(bob.address);
            expect(stakerInfo.pendingReward).to.be.eq(0);
        });
    });

    describe("Unstake func", () => {
        beforeEach(async () => {
            await vault.connect(bob).stake(ethers.parseEther("100"));
            await skipTime(50);
        });

        it("should allow user to unstake", async () => {
            await vault.connect(bob).unstake(ethers.parseEther("50"));
            const stakerInfo = await vault.stakers(bob.address);
            expect(stakerInfo.balance).to.be.eq(ethers.parseEther("50"));
        });
        it("should revert unstake if balance is insufficient", async () => {
            await expect(vault.connect(bob).unstake(ethers.parseEther("200"))).to.be.revertedWith("not enough balance");
        });
    });

    describe("Update reward func", () => {
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
    });
    describe("Admin func", () => {
        describe("withdraw func", () => {
            beforeEach(async () => {
                athenai.connect(owner).mint(await vault.getAddress(), ethers.parseEther("100"));
            });

            it("failds if caller not admin", async () => {
                expect(vault.connect(bob).withdraw(await athenai.getAddress(), ethers.parseEther("100"))).to.be
                    .revertedWithCustomError;
            });

            it("failds if admin withdraw to much ", async () => {
                await vault.connect(bob).stake(ethers.parseEther("100"));
                await expect(
                    vault.connect(owner).withdraw(await athenai.getAddress(), ethers.parseEther("110"))
                ).to.be.revertedWith("not enough balance staked");
            });

            it("should allow admin to withdraw", async () => {
                await vault.connect(bob).stake(ethers.parseEther("100"));
                await vault.connect(owner).withdraw(await athenai.getAddress(), ethers.parseEther("100"));
                const balance = await athenai.balanceOf(await vault.getAddress());
                expect(balance).to.be.eq(ethers.parseEther("100"));
            });
        });

        describe("pause and unpause func", () => {
            it("failds if caller not admin", async () => {
                expect(vault.connect(bob).pause()).to.be.revertedWithCustomError;
                expect(vault.connect(bob).unpause()).to.be.revertedWithCustomError;
            });
            it("should allow owner to pause and unpause staking", async () => {
                await vault.connect(owner).pause();
                await expect(vault.connect(bob).stake(ethers.parseEther("100"))).to.be.revertedWithCustomError;
                await vault.connect(owner).unpause();
                await vault.connect(bob).stake(ethers.parseEther("100"));
            });
        });
        describe("update rps func", () => {
            it("failds if caller not admin", async () => {
                expect(vault.connect(bob).updateRps(ethers.parseEther("2"))).to.be.revertedWithCustomError;
            });

            it("should update RPS correctly", async () => {
                await vault.connect(owner).updateRps(ethers.parseEther("2"));
                await vault.connect(bob).stake(ethers.parseEther("100"));
                await skipTime(50);
                await vault.connect(bob).updateReward(bob.address);
                const bobInfo = await vault.stakers(bob.address);
                expect(bobInfo.pendingReward).to.be.eq(ethers.parseEther("100"));
            });
        });

        describe("update timeUnlock func", () => {
            it("failds if caller not admin", async () => {
                expect(vault.connect(bob).updateRps(ethers.parseEther("2"))).to.be.revertedWithCustomError;
            });

            it("should update timeUnlock correctly", async () => {
                let newTime = Math.round(Date.now() / 1000) + 5 * 24 * 60 * 60;

                await vault.connect(owner).updateTimeUnlock(newTime);
                await expect(await vault.timeUnlock()).to.be.eq(newTime);
            });
        });
    });
});
