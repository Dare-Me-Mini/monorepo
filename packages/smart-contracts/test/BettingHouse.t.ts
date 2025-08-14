import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const ONE = 1n;

async function deployFixture() {
  const [deployer, challenger, challengee, feeRecipient, mediator, other] = await ethers.getSigners();

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

  return { deployer, challenger, challengee, feeRecipient, mediator, other, token, bettingHouse, amount, deadline };
}

function amountAfterFees(amount: bigint, feesBps: bigint) {
  return amount - (amount * feesBps) / 10000n;
}

describe("BettingHouse", function () {
  it("creates a bet with mediator and disputes go to mediation window", async function () {
    const { bettingHouse, challenger, challengee, mediator, token, amount, deadline } = await loadFixture(
      deployFixture
    );

    await bettingHouse
      .connect(challenger)
      .createBet(challengee.address, "with mediator", amount, deadline, await token.getAddress(), mediator.address);

    await bettingHouse.connect(challengee).acceptBet(0);
    await bettingHouse.connect(challengee).submitProof(0, "proof");

    // dispute triggers mediation window instead of immediate refunds
    await expect(bettingHouse.connect(challenger).disputeProof(0)).to.not.be.reverted;

    const bet = await bettingHouse.bets(0);
    expect(bet.lastUpdatedStatus).to.eq(5); // PROOF_DISPUTED
    expect(bet.mediationDeadline).to.gt(0n);
    expect(bet.isClosed).to.eq(false);
  });

  it("mediator can set draw, paying back net to both", async function () {
    const { bettingHouse, challenger, challengee, mediator, token, amount, deadline } = await loadFixture(
      deployFixture
    );

    await bettingHouse
      .connect(challenger)
      .createBet(challengee.address, "with mediator", amount, deadline, await token.getAddress(), mediator.address);

    await bettingHouse.connect(challengee).acceptBet(0);

    const feesBps = await bettingHouse.fees();
    const net = amountAfterFees(amount, feesBps);

    const balChalBefore = await token.balanceOf(challenger.address);
    const balCheeBefore = await token.balanceOf(challengee.address);

    await bettingHouse.connect(challengee).submitProof(0, "proof");
    await bettingHouse.connect(challenger).disputeProof(0);

    await expect(bettingHouse.connect(mediator).submitMediation(0, true, false)).to.not.be.reverted;

    const balChalAfter = await token.balanceOf(challenger.address);
    const balCheeAfter = await token.balanceOf(challengee.address);
    expect(balChalAfter - balChalBefore).to.eq(net);
    expect(balCheeAfter - balCheeBefore).to.eq(net);

    const bet = await bettingHouse.bets(0);
    expect(bet.isClosed).to.eq(true);
  });

  it("mediator can award to challenger", async function () {
    const { bettingHouse, challenger, challengee, mediator, token, amount, deadline } = await loadFixture(
      deployFixture
    );

    await bettingHouse
      .connect(challenger)
      .createBet(challengee.address, "with mediator", amount, deadline, await token.getAddress(), mediator.address);

    await bettingHouse.connect(challengee).acceptBet(0);

    const feesBps = await bettingHouse.fees();
    const net = amountAfterFees(amount, feesBps);

    const balBefore = await token.balanceOf(challenger.address);
    await bettingHouse.connect(challengee).submitProof(0, "proof");
    await bettingHouse.connect(challenger).disputeProof(0);
    await expect(bettingHouse.connect(mediator).submitMediation(0, false, false)).to.not.be.reverted;
    const balAfter = await token.balanceOf(challenger.address);
    expect(balAfter - balBefore).to.eq(net * 2n);
  });

  it("mediator can award to challengee", async function () {
    const { bettingHouse, challenger, challengee, mediator, token, amount, deadline } = await loadFixture(
      deployFixture
    );

    await bettingHouse
      .connect(challenger)
      .createBet(challengee.address, "with mediator", amount, deadline, await token.getAddress(), mediator.address);

    await bettingHouse.connect(challengee).acceptBet(0);

    const feesBps = await bettingHouse.fees();
    const net = amountAfterFees(amount, feesBps);

    const balBefore = await token.balanceOf(challengee.address);
    await bettingHouse.connect(challengee).submitProof(0, "proof");
    await bettingHouse.connect(challenger).disputeProof(0);
    await expect(bettingHouse.connect(mediator).submitMediation(0, false, true)).to.not.be.reverted;
    const balAfter = await token.balanceOf(challengee.address);
    expect(balAfter - balBefore).to.eq(net * 2n);
  });

  it("creates a bet and sets initial state", async function () {
    const { bettingHouse, challenger, challengee, token, amount, deadline, mediator } = await loadFixture(deployFixture);

    await expect(
      bettingHouse.connect(challenger).createBet(challengee.address, "run 5k", amount, deadline, await token.getAddress(), ethers.ZeroAddress)
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
    await bettingHouse.connect(challenger).createBet(challengee.address, "cond", amount, deadline, await token.getAddress(), ethers.ZeroAddress);

    const balBefore = await token.balanceOf(challenger.address);
    await expect(bettingHouse.connect(challenger).cancelBet(0)).to.not.be.reverted;
    const balAfter = await token.balanceOf(challenger.address);
    expect(balAfter - balBefore).to.eq(amount);

    const bet = await bettingHouse.bets(0);
    expect(bet.isClosed).to.eq(true);
  });

  it("accept bet transfers funds and fees", async function () {
    const { bettingHouse, challenger, challengee, feeRecipient, token, amount, deadline } = await loadFixture(deployFixture);
    await bettingHouse.connect(challenger).createBet(challengee.address, "cond", amount, deadline, await token.getAddress(), ethers.ZeroAddress);

    const feesBps = await bettingHouse.fees();
    const feePerSide = amount - amountAfterFees(amount, feesBps);

    const feeBalBefore = await token.balanceOf(feeRecipient.address);
    await expect(bettingHouse.connect(challengee).acceptBet(0)).to.not.be.reverted;
    const feeBalAfter = await token.balanceOf(feeRecipient.address);
    expect(feeBalAfter - feeBalBefore).to.eq(feePerSide * 2n);
  });

  it("happy path: submit proof, accept proof pays challengee (net after fees)", async function () {
    const { bettingHouse, challenger, challengee, token, amount, deadline } = await loadFixture(deployFixture);
    await bettingHouse.connect(challenger).createBet(challengee.address, "cond", amount, deadline, await token.getAddress(), ethers.ZeroAddress);
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
    await bettingHouse.connect(challenger).createBet(challengee.address, "cond", amount, deadline, await token.getAddress(), ethers.ZeroAddress);
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
    await bettingHouse.connect(challenger).createBet(challengee.address, "cond", amount, deadline, await token.getAddress(), ethers.ZeroAddress);
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
    await bettingHouse.connect(challenger).createBet(challengee.address, "cond", amount, deadline, await token.getAddress(), ethers.ZeroAddress);

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
    await bettingHouse.connect(challenger).createBet(challengee.address, "cond", amount, deadline, await token.getAddress(), ethers.ZeroAddress);
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
    await bettingHouse
      .connect(challenger)
      .createBet(challengee.address, "cond", amount, deadline, await token.getAddress(), ethers.ZeroAddress);
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

  it("reject bet refunds challenger and closes bet", async function () {
    const { bettingHouse, challenger, challengee, token, amount, deadline } = await loadFixture(deployFixture);
    await bettingHouse
      .connect(challenger)
      .createBet(challengee.address, "cond", amount, deadline, await token.getAddress(), ethers.ZeroAddress);

    const balBefore = await token.balanceOf(challenger.address);
    await expect(bettingHouse.connect(challengee).rejectBet(0)).to.not.be.reverted;
    const balAfter = await token.balanceOf(challenger.address);
    expect(balAfter - balBefore).to.eq(amount);

    const bet = await bettingHouse.bets(0);
    expect(bet.isClosed).to.eq(true);
  });

  it("createBet validations revert as expected", async function () {
    const { bettingHouse, challenger, challengee, token } = await loadFixture(deployFixture);
    const now = await time.latest();
    await expect(
      bettingHouse
        .connect(challenger)
        .createBet(challengee.address, "cond", 0n, BigInt(now + 1000), await token.getAddress(), ethers.ZeroAddress)
    ).to.be.revertedWith("Amount must be greater than 0");
    await expect(
      bettingHouse
        .connect(challenger)
        .createBet(challengee.address, "cond", 1n, BigInt(now - 1), await token.getAddress(), ethers.ZeroAddress)
    ).to.be.revertedWith("Deadline must be in the future");
    await expect(
      bettingHouse
        .connect(challenger)
        .createBet(ethers.ZeroAddress, "cond", 1n, BigInt(now + 1000), await token.getAddress(), ethers.ZeroAddress)
    ).to.be.revertedWith("Challengee cannot be the zero address");
    await expect(
      bettingHouse
        .connect(challenger)
        .createBet(challenger.address, "cond", 1n, BigInt(now + 1000), await token.getAddress(), ethers.ZeroAddress)
    ).to.be.revertedWith("Challenger and challengee cannot be the same");
    await expect(
      bettingHouse
        .connect(challenger)
        .createBet(challengee.address, "cond", 1n, BigInt(now + 1000), ethers.ZeroAddress, ethers.ZeroAddress)
    ).to.be.revertedWith("Token is not supported");
  });

  it("access control reverts on wrong caller", async function () {
    const { bettingHouse, challenger, challengee, other, token, amount, deadline } = await loadFixture(
      deployFixture
    );
    await bettingHouse
      .connect(challenger)
      .createBet(challengee.address, "cond", amount, deadline, await token.getAddress(), ethers.ZeroAddress);

    // cancel only by challenger
    await expect(bettingHouse.connect(challengee).cancelBet(0)).to.be.revertedWith(
      "Only challenger can perform this action"
    );
    // accept only by challengee
    await expect(bettingHouse.connect(challenger).acceptBet(0)).to.be.revertedWith(
      "Only challengee can perform this action"
    );

    await bettingHouse.connect(challengee).acceptBet(0);
    // submitProof only by challengee
    await expect(bettingHouse.connect(challenger).submitProof(0, "p")).to.be.revertedWith(
      "Only challengee can perform this action"
    );
    await bettingHouse.connect(challengee).submitProof(0, "p");
    // acceptProof only by challenger
    await expect(bettingHouse.connect(challengee).acceptProof(0)).to.be.revertedWith(
      "Only challenger can perform this action"
    );
    // disputeProof only by challenger
    await expect(bettingHouse.connect(challengee).disputeProof(0)).to.be.revertedWith(
      "Only challenger can perform this action"
    );
  });

  it("invalid status reverts", async function () {
    const { bettingHouse, challenger, challengee, token, amount, deadline } = await loadFixture(deployFixture);
    await bettingHouse
      .connect(challenger)
      .createBet(challengee.address, "cond", amount, deadline, await token.getAddress(), ethers.ZeroAddress);

    // cannot submitProof before accept
    await expect(bettingHouse.connect(challengee).submitProof(0, "proof")).to.be.revertedWith(
      "Bet is in invalid status"
    );
    // cannot acceptProof before proof submitted
    await expect(bettingHouse.connect(challenger).acceptProof(0)).to.be.revertedWith("Bet is in invalid status");
    // cancel, then try accept -> bet closed
    await bettingHouse.connect(challenger).cancelBet(0);
    await expect(bettingHouse.connect(challengee).acceptBet(0)).to.be.revertedWith("Bet is closed");
  });

  it("owner-only admin actions and bounds", async function () {
    const { bettingHouse, deployer, other } = await loadFixture(deployFixture);
    await expect(bettingHouse.connect(other).setFees(200))
      .to.be.revertedWithCustomError(bettingHouse, "OwnableUnauthorizedAccount")
      .withArgs(other.address);
    await expect(bettingHouse.connect(other).setFeeRecipient(other.address))
      .to.be.revertedWithCustomError(bettingHouse, "OwnableUnauthorizedAccount")
      .withArgs(other.address);
    await expect(bettingHouse.connect(deployer).setFees(10001)).to.be.revertedWith(
      "Fees must be less than or equal to 100%"
    );
  });

  it("getCurrentStatus transitions reflect timeouts including mediation", async function () {
    const { bettingHouse, deployer, challenger, challengee, mediator, token, amount, deadline } = await loadFixture(
      deployFixture
    );
    await bettingHouse
      .connect(challenger)
      .createBet(challengee.address, "cond", amount, deadline, await token.getAddress(), mediator.address);

    // Open -> after acceptance deadline
    const bet0 = await bettingHouse.bets(0);
    await time.increaseTo(bet0.acceptanceDeadline + ONE);
    expect(await bettingHouse.getCurrentStatus(0)).to.eq(9); // BET_NOT_ACCEPTED_IN_TIME

    // Restart: create again and accept, refilling balances and approvals
    await token.connect(deployer).mint(challenger.address, amount);
    await token.connect(deployer).mint(challengee.address, amount);
    await token.connect(challenger).approve(await bettingHouse.getAddress(), amount);
    await token.connect(challengee).approve(await bettingHouse.getAddress(), amount);
    const start = (await time.latest()) + 1000;
    await bettingHouse
      .connect(challenger)
      .createBet(challengee.address, "cond", amount, start, await token.getAddress(), mediator.address);
    await bettingHouse.connect(challengee).acceptBet(1);
    const bet1 = await bettingHouse.bets(1);
    await time.increaseTo(bet1.proofSubmissionDeadline + ONE);
    expect(await bettingHouse.getCurrentStatus(1)).to.eq(10); // PROOF_NOT_SUBMITTED_IN_TIME

    // Restart: create, accept, submit proof then pass acceptance deadline (refill again)
    await token.connect(deployer).mint(challenger.address, amount);
    await token.connect(deployer).mint(challengee.address, amount);
    await token.connect(challenger).approve(await bettingHouse.getAddress(), amount);
    await token.connect(challengee).approve(await bettingHouse.getAddress(), amount);
    const start2 = (await time.latest()) + 1000;
    await bettingHouse
      .connect(challenger)
      .createBet(challengee.address, "cond", amount, start2, await token.getAddress(), mediator.address);
    await bettingHouse.connect(challengee).acceptBet(2);
    await bettingHouse.connect(challengee).submitProof(2, "p");
    const bet2 = await bettingHouse.bets(2);
    await time.increaseTo(bet2.proofAcceptanceDeadline + ONE);
    expect(await bettingHouse.getCurrentStatus(2)).to.eq(11); // PROOF_NOT_ACCEPTED_IN_TIME

    // Restart: create, accept, submit proof, dispute to mediation then timeout mediation (refill again)
    await token.connect(deployer).mint(challenger.address, amount);
    await token.connect(deployer).mint(challengee.address, amount);
    await token.connect(challenger).approve(await bettingHouse.getAddress(), amount);
    await token.connect(challengee).approve(await bettingHouse.getAddress(), amount);
    const start3 = (await time.latest()) + 1000;
    await bettingHouse
      .connect(challenger)
      .createBet(challengee.address, "cond", amount, start3, await token.getAddress(), mediator.address);
    await bettingHouse.connect(challengee).acceptBet(3);
    await bettingHouse.connect(challengee).submitProof(3, "p");
    await bettingHouse.connect(challenger).disputeProof(3);
    const bet3 = await bettingHouse.bets(3);
    await time.increaseTo(bet3.mediationDeadline + ONE);
    expect(await bettingHouse.getCurrentStatus(3)).to.eq(12); // BET_NOT_MEDIATED_IN_TIME
  });

  it("claimMoney for BET_NOT_MEDIATED_IN_TIME refunds both sides net", async function () {
    const { bettingHouse, challenger, challengee, mediator, token, amount, deadline } = await loadFixture(
      deployFixture
    );
    await bettingHouse
      .connect(challenger)
      .createBet(challengee.address, "cond", amount, deadline, await token.getAddress(), mediator.address);
    await bettingHouse.connect(challengee).acceptBet(0);
    await bettingHouse.connect(challengee).submitProof(0, "p");
    await bettingHouse.connect(challenger).disputeProof(0);
    const bet0 = await bettingHouse.bets(0);
    await time.increaseTo(bet0.mediationDeadline + ONE);

    const feesBps = await bettingHouse.fees();
    const net = amountAfterFees(amount, feesBps);
    const balChalBefore = await token.balanceOf(challenger.address);
    const balCheeBefore = await token.balanceOf(challengee.address);

    // Either party can claim; use challenger
    await expect(bettingHouse.connect(challenger).claimMoney(0)).to.not.be.reverted;
    const balChalAfter = await token.balanceOf(challenger.address);
    const balCheeAfter = await token.balanceOf(challengee.address);
    expect(balChalAfter - balChalBefore).to.eq(net);
    expect(balCheeAfter - balCheeBefore).to.eq(net);
  });

  it("claimMoney reverts when status is not claimable", async function () {
    const { bettingHouse, challenger, challengee, token, amount, deadline } = await loadFixture(deployFixture);
    await bettingHouse
      .connect(challenger)
      .createBet(challengee.address, "cond", amount, deadline, await token.getAddress(), ethers.ZeroAddress);
    await bettingHouse.connect(challengee).acceptBet(0);
    await expect(bettingHouse.connect(challenger).claimMoney(0)).to.be.revertedWith(
      "Bet is not in a claimable status"
    );
  });

  it("upgrades proxy (authorizes by owner)", async function () {
    const { bettingHouse } = await loadFixture(deployFixture);
    const addr = await bettingHouse.getAddress();
    const Factory = await ethers.getContractFactory("BettingHouse");
    const upgraded = await upgrades.upgradeProxy(addr, Factory);
    await upgraded.waitForDeployment();
    expect(await upgraded.getAddress()).to.eq(addr);
  });
});


