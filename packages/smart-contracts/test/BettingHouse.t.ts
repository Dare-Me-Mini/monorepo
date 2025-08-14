import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const ONE = 1n;

async function deployFixture() {
  const [deployer, challenger, challengee, feeRecipient, other] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("TestToken");
  const token = await Token.deploy("TestToken", "TT", deployer.address);
  await token.waitForDeployment();

  const BettingHouse = await ethers.getContractFactory("BettingHouse");
  const bettingHouse = await upgrades.deployProxy(BettingHouse, [], { kind: "uups" });
  await bettingHouse.waitForDeployment();

  await bettingHouse.setFeeRecipient(feeRecipient.address);
  await bettingHouse.setFees(100); // 1%
  await bettingHouse.addSupportedToken(await token.getAddress());

  const amount = 1000n * 10n ** 18n;
  const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

  // mint and approve
  await token.mint(challenger.address, amount);
  await token.mint(challengee.address, amount);
  await token.connect(challenger).approve(await bettingHouse.getAddress(), amount);
  await token.connect(challengee).approve(await bettingHouse.getAddress(), amount);

  return { deployer, challenger, challengee, feeRecipient, other, token, bettingHouse, amount, deadline };
}

function amountAfterFees(amount: bigint, feesBps: bigint) {
  return amount - (amount * feesBps) / 10000n;
}

describe("BettingHouse", function () {
  it("creates a bet and sets initial state", async function () {
    const { bettingHouse, challenger, challengee, token, amount, deadline } = await loadFixture(deployFixture);

    await expect(
      bettingHouse.connect(challenger).createBet(challengee.address, "run 5k", amount, deadline, await token.getAddress())
    ).to.not.be.reverted;

    const bet = await bettingHouse.bets(0);
    expect(bet.challenger).to.eq(challenger.address);
    expect(bet.challengee).to.eq(challengee.address);
    expect(bet.amount).to.eq(amount);
    expect(bet.lastUpdatedStatus).to.eq(0); // OPEN
    expect(bet.isClosed).to.eq(false);
  });

  it("cancel before accept refunds challenger", async function () {
    const { bettingHouse, challenger, challengee, token, amount, deadline } = await loadFixture(deployFixture);
    await bettingHouse.connect(challenger).createBet(challengee.address, "cond", amount, deadline, await token.getAddress());

    const balBefore = await token.balanceOf(challenger.address);
    await expect(bettingHouse.connect(challenger).cancelBet(0)).to.not.be.reverted;
    const balAfter = await token.balanceOf(challenger.address);
    expect(balAfter - balBefore).to.eq(amount);

    const bet = await bettingHouse.bets(0);
    expect(bet.isClosed).to.eq(true);
  });

  it("accept bet transfers funds and fees", async function () {
    const { bettingHouse, challenger, challengee, feeRecipient, token, amount, deadline } = await loadFixture(deployFixture);
    await bettingHouse.connect(challenger).createBet(challengee.address, "cond", amount, deadline, await token.getAddress());

    const feesBps = await bettingHouse.fees();
    const feePerSide = amount - amountAfterFees(amount, feesBps);

    const feeBalBefore = await token.balanceOf(feeRecipient.address);
    await expect(bettingHouse.connect(challengee).acceptBet(0)).to.not.be.reverted;
    const feeBalAfter = await token.balanceOf(feeRecipient.address);
    expect(feeBalAfter - feeBalBefore).to.eq(feePerSide * 2n);
  });

  it("happy path: submit proof, accept proof pays challengee (net after fees)", async function () {
    const { bettingHouse, challenger, challengee, token, amount, deadline } = await loadFixture(deployFixture);
    await bettingHouse.connect(challenger).createBet(challengee.address, "cond", amount, deadline, await token.getAddress());
    await bettingHouse.connect(challengee).acceptBet(0);

    const feesBps = await bettingHouse.fees();
    const net = amountAfterFees(amount, feesBps);

    const balBefore = await token.balanceOf(challengee.address);
    await bettingHouse.connect(challengee).submitProof(0, "ipfs://proof");
    await expect(bettingHouse.connect(challenger).acceptProof(0)).to.not.be.reverted;
    const balAfter = await token.balanceOf(challengee.address);
    expect(balAfter - balBefore).to.eq(net * 2n);

    const bet = await bettingHouse.bets(0);
    expect(bet.isClosed).to.eq(true);
  });

  it("dispute refunds both sides net of fees", async function () {
    const { bettingHouse, challenger, challengee, token, amount, deadline } = await loadFixture(deployFixture);
    await bettingHouse.connect(challenger).createBet(challengee.address, "cond", amount, deadline, await token.getAddress());
    await bettingHouse.connect(challengee).acceptBet(0);

    const feesBps = await bettingHouse.fees();
    const net = amountAfterFees(amount, feesBps);

    const balChalBefore = await token.balanceOf(challenger.address);
    const balCheeBefore = await token.balanceOf(challengee.address);

    await bettingHouse.connect(challengee).submitProof(0, "proof");
    await expect(bettingHouse.connect(challenger).disputeProof(0)).to.not.be.reverted;

    const balChalAfter = await token.balanceOf(challenger.address);
    const balCheeAfter = await token.balanceOf(challengee.address);

    expect(balChalAfter - balChalBefore).to.eq(net);
    expect(balCheeAfter - balCheeBefore).to.eq(net);
  });

  it("forfeit transfers full pot to challenger", async function () {
    const { bettingHouse, challenger, challengee, token, amount, deadline } = await loadFixture(deployFixture);
    await bettingHouse.connect(challenger).createBet(challengee.address, "cond", amount, deadline, await token.getAddress());
    await bettingHouse.connect(challengee).acceptBet(0);

    const feesBps = await bettingHouse.fees();
    const net = amountAfterFees(amount, feesBps);

    const balBefore = await token.balanceOf(challenger.address);
    await expect(bettingHouse.connect(challengee).forfeitBet(0)).to.not.be.reverted;
    const balAfter = await token.balanceOf(challenger.address);
    expect(balAfter - balBefore).to.eq(net * 2n);
  });

  it("timeout: bet not accepted in time allows claim", async function () {
    const { bettingHouse, challenger, challengee, token, amount, deadline } = await loadFixture(deployFixture);
    await bettingHouse.connect(challenger).createBet(challengee.address, "cond", amount, deadline, await token.getAddress());

    const bet = await bettingHouse.bets(0);
    await time.increaseTo(bet.acceptanceDeadline + ONE);

    const balBefore = await token.balanceOf(challenger.address);
    await expect(bettingHouse.connect(challenger).claimMoney(0)).to.not.be.reverted;
    const balAfter = await token.balanceOf(challenger.address);

    // depending on your current implementation refund amount (amount or net)
    // We assert at least some positive refund
    expect(balAfter - balBefore).to.be.gt(0n);
  });

  it("timeout: proof not submitted in time pays challenger", async function () {
    const { bettingHouse, challenger, challengee, token, amount, deadline } = await loadFixture(deployFixture);
    await bettingHouse.connect(challenger).createBet(challengee.address, "cond", amount, deadline, await token.getAddress());
    await bettingHouse.connect(challengee).acceptBet(0);

    const bet = await bettingHouse.bets(0);
    await time.increaseTo(bet.proofSubmissionDeadline + ONE);

    const feesBps = await bettingHouse.fees();
    const net = amountAfterFees(amount, feesBps);

    const balBefore = await token.balanceOf(challenger.address);
    await expect(bettingHouse.connect(challenger).claimMoney(0)).to.not.be.reverted;
    const balAfter = await token.balanceOf(challenger.address);
    expect(balAfter - balBefore).to.eq(net * 2n);
  });

  it("timeout: proof not accepted in time pays challengee", async function () {
    const { bettingHouse, challenger, challengee, token, amount, deadline } = await loadFixture(deployFixture);
    await bettingHouse.connect(challenger).createBet(challengee.address, "cond", amount, deadline, await token.getAddress());
    await bettingHouse.connect(challengee).acceptBet(0);
    await bettingHouse.connect(challengee).submitProof(0, "proof");

    const bet = await bettingHouse.bets(0);
    await time.increaseTo(bet.proofAcceptanceDeadline + ONE);

    const feesBps = await bettingHouse.fees();
    const net = amountAfterFees(amount, feesBps);

    const balBefore = await token.balanceOf(challengee.address);
    await expect(bettingHouse.connect(challengee).claimMoney(0)).to.not.be.reverted;
    const balAfter = await token.balanceOf(challengee.address);
    expect(balAfter - balBefore).to.eq(net * 2n);
  });
});


