import { ponder } from "ponder:registry";
import { bet, betEvent } from "ponder:schema";
import { BettingHouseAbi } from "../abis/BettingHouseAbi";
import { neynarService } from "./utils/neynar";

type OnchainBet = readonly [
  `0x${string}`, // challenger
  `0x${string}`, // challengee
  `0x${string}`, // mediator
  string, // condition
  bigint, // amount
  bigint, // amountAfterFees
  bigint, // acceptanceDeadline
  bigint, // proofSubmissionDeadline
  bigint, // proofAcceptanceDeadline
  bigint, // mediationDeadline
  string, // proof
  number, // lastUpdatedStatus (uint8)
  `0x${string}`, // token
  boolean // isClosed
];

const STATUS = [
  "OPEN",
  "CANCELLED",
  "ACCEPTED",
  "REJECTED",
  "PROOF_SUBMITTED",
  "PROOF_DISPUTED",
  "COMPLETED_BY_CHALLENGEE",
  "COMPLETED_BY_CHALLENGER",
  "FORFEITED_BY_CHALLENGEE",
  "BET_NOT_ACCEPTED_IN_TIME",
  "PROOF_NOT_SUBMITTED_IN_TIME",
  "PROOF_NOT_ACCEPTED_IN_TIME",
  "BET_NOT_MEDIATED_IN_TIME",
  "DRAW",
] as const;

function toDate(seconds: bigint | number): Date {
  const s = typeof seconds === "number" ? seconds : Number(seconds);
  return new Date(s * 1000);
}

ponder.on("BettingHouse:BetCreated", async ({ event, context }) => {
  const { betId } = event.args;

  // Read full bet struct from chain at the block it was created to avoid
  // depending on event payload shape.
  const onchain = (await context.client.readContract({
    abi: BettingHouseAbi,
    address: event.log.address as `0x${string}`,
    functionName: "bets",
    args: [betId],
    blockNumber: event.block.number,
  })) as OnchainBet;

  const [
    challenger,
    challengee,
    mediator,
    condition,
    amount,
    amountAfterFees,
    acceptanceDeadline,
    proofSubmissionDeadline,
    proofAcceptanceDeadline,
    mediationDeadline,
    proof,
    lastUpdatedStatus,
    token,
    isClosed,
  ] = onchain;

  const status = STATUS[lastUpdatedStatus] ?? "OPEN";

  // Lookup Farcaster user data for challenger and challengee
  const farcasterUsers = await neynarService.getUsersByAddresses([challenger, challengee]);
  const challengerUser = farcasterUsers[challenger.toLowerCase()]?.[0];
  const challengeeUser = farcasterUsers[challengee.toLowerCase()]?.[0];

  await context.db.insert(bet).values({
    id: betId,
    challenger,
    challengee,
    mediator,
    condition,
    amount,
    amountAfterFees,
    acceptanceDeadline: toDate(acceptanceDeadline),
    proofSubmissionDeadline: toDate(proofSubmissionDeadline),
    proofAcceptanceDeadline: toDate(proofAcceptanceDeadline),
    mediationDeadline: toDate(mediationDeadline),
    proof,
    lastUpdatedStatus: status,
    token,
    isClosed,
    // Farcaster user data
    challengerFid: challengerUser?.fid || null,
    challengerUsername: challengerUser?.username || null,
    challengerPfp: challengerUser?.pfp_url || null,
    challengeeFid: challengeeUser?.fid || null,
    challengeeUsername: challengeeUser?.username || null,
    challengeePfp: challengeeUser?.pfp_url || null,
    createdTxHash: event.transaction.hash,
    createdBlockNumber: event.block.number,
    createdTimestamp: toDate(event.block.timestamp),
    updatedAt: toDate(event.block.timestamp),
  });

  await context.db.insert(betEvent).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    blockNumber: event.block.number,
    timestamp: toDate(event.block.timestamp),
    betId,
    name: "BetCreated",
    actor: event.transaction.from,
    details: {
      challenger,
      challengee,
      amount: amount.toString(),
      condition,
      token,
      mediator,
      // Include Farcaster data in event details
      challengerFid: challengerUser?.fid || null,
      challengerUsername: challengerUser?.username || null,
      challengerPfp: challengerUser?.pfp_url || null,
      challengeeFid: challengeeUser?.fid || null,
      challengeeUsername: challengeeUser?.username || null,
      challengeePfp: challengeeUser?.pfp_url || null,
    },
  });
});

ponder.on("BettingHouse:BetCancelled", async ({ event, context }) => {
  const { betId } = event.args;
  await context.db.update(bet, { id: betId }).set({
    lastUpdatedStatus: "CANCELLED",
    isClosed: true,
    updatedAt: toDate(event.block.timestamp),
  });
  await context.db.insert(betEvent).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    blockNumber: event.block.number,
    timestamp: toDate(event.block.timestamp),
    betId,
    name: "BetCancelled",
    actor: event.transaction.from,
    details: {},
  });
});

ponder.on("BettingHouse:BetRejected", async ({ event, context }) => {
  const { betId } = event.args;
  await context.db.update(bet, { id: betId }).set({
    lastUpdatedStatus: "REJECTED",
    isClosed: true,
    updatedAt: toDate(event.block.timestamp),
  });
  await context.db.insert(betEvent).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    blockNumber: event.block.number,
    timestamp: toDate(event.block.timestamp),
    betId,
    name: "BetRejected",
    actor: event.transaction.from,
    details: {},
  });
});

ponder.on("BettingHouse:BetAccepted", async ({ event, context }) => {
  const { betId, feePerSide, totalFees } = event.args;
  await context.db.update(bet, { id: betId }).set({
    lastUpdatedStatus: "ACCEPTED",
    updatedAt: toDate(event.block.timestamp),
  });
  await context.db.insert(betEvent).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    blockNumber: event.block.number,
    timestamp: toDate(event.block.timestamp),
    betId,
    name: "BetAccepted",
    actor: event.transaction.from,
    details: { 
      feePerSide: feePerSide.toString(), 
      totalFees: totalFees.toString() 
    },
  });
});

ponder.on("BettingHouse:ProofSubmitted", async ({ event, context }) => {
  const { betId, proof } = event.args;
  await context.db.update(bet, { id: betId }).set({
    proof,
    lastUpdatedStatus: "PROOF_SUBMITTED",
    updatedAt: toDate(event.block.timestamp),
  });
  await context.db.insert(betEvent).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    blockNumber: event.block.number,
    timestamp: toDate(event.block.timestamp),
    betId,
    name: "ProofSubmitted",
    actor: event.transaction.from,
    details: { proof },
  });
});

ponder.on("BettingHouse:ProofAccepted", async ({ event, context }) => {
  const { betId } = event.args;
  await context.db.update(bet, { id: betId }).set({
    lastUpdatedStatus: "COMPLETED_BY_CHALLENGEE",
    isClosed: true,
    updatedAt: toDate(event.block.timestamp),
  });
  await context.db.insert(betEvent).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    blockNumber: event.block.number,
    timestamp: toDate(event.block.timestamp),
    betId,
    name: "ProofAccepted",
    actor: event.transaction.from,
    details: {},
  });
});

ponder.on("BettingHouse:ProofDisputed", async ({ event, context }) => {
  const { betId, isMediating, mediationDeadline } = event.args;

  await context.db.update(bet, { id: betId }).set({
    lastUpdatedStatus: "PROOF_DISPUTED",
    isClosed: isMediating ? false : true,
    updatedAt: toDate(event.block.timestamp),
    ...(isMediating ? { mediationDeadline: toDate(mediationDeadline) } : {}),
  });
  await context.db.insert(betEvent).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    blockNumber: event.block.number,
    timestamp: toDate(event.block.timestamp),
    betId,
    name: "ProofDisputed",
    actor: event.transaction.from,
    details: { 
      isMediating, 
      mediationDeadline: mediationDeadline.toString() 
    },
  });
});

ponder.on("BettingHouse:BetForfeited", async ({ event, context }) => {
  const { betId } = event.args;
  await context.db.update(bet, { id: betId }).set({
    lastUpdatedStatus: "FORFEITED_BY_CHALLENGEE",
    isClosed: true,
    updatedAt: toDate(event.block.timestamp),
  });
  await context.db.insert(betEvent).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    blockNumber: event.block.number,
    timestamp: toDate(event.block.timestamp),
    betId,
    name: "BetForfeited",
    actor: event.transaction.from,
    details: {},
  });
});

ponder.on("BettingHouse:BetClaimed", async ({ event, context }) => {
  const { betId, claimer, resultingStatus } = event.args;
  const status = STATUS[Number(resultingStatus)];
  await context.db.update(bet, { id: betId }).set({
    lastUpdatedStatus: status,
    isClosed: true,
    updatedAt: toDate(event.block.timestamp),
  });
  await context.db.insert(betEvent).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    blockNumber: event.block.number,
    timestamp: toDate(event.block.timestamp),
    betId,
    name: "BetClaimed",
    actor: claimer,
    details: { 
      resultingStatus: status 
    },
  });
});

// Optionally, time-based status transitions could be computed off-chain separately.
