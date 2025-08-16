import { onchainTable, primaryKey } from "ponder";

// Core bet entity
export const bet = onchainTable("bet", (t) => ({
  id: t.bigint().primaryKey(),
  challenger: t.hex().notNull(),
  challengee: t.hex().notNull(),
  mediator: t.hex().notNull().default("0x0000000000000000000000000000000000000000"),
  condition: t.text().notNull(),
  amount: t.bigint().notNull(),
  amountAfterFees: t.bigint().notNull(),
  acceptanceDeadline: t.timestamp().notNull(),
  proofSubmissionDeadline: t.timestamp().notNull(),
  proofAcceptanceDeadline: t.timestamp().notNull(),
  mediationDeadline: t.timestamp().notNull().default(new Date(0)),
  proof: t.text().notNull().default(""),
  lastUpdatedStatus: t
    .text({
      enum: [
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
      ],
    })
    .notNull(),
  token: t.hex().notNull(),
  isClosed: t.boolean().notNull().default(false),
  // Farcaster user data
  challengerFid: t.integer(),
  challengerUsername: t.text(),
  challengerPfp: t.text(),
  challengeeFid: t.integer(),
  challengeeUsername: t.text(),
  challengeePfp: t.text(),
  createdTxHash: t.hex().notNull(),
  createdBlockNumber: t.bigint().notNull(),
  createdTimestamp: t.timestamp().notNull(),
  updatedAt: t.timestamp().notNull(),
}));

// Events log tables
export const betEvent = onchainTable(
  "bet_event",
  (t) => ({
    txHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.timestamp().notNull(),
    betId: t.bigint().notNull(),
    name: t.text().notNull(),
    actor: t.hex().notNull(),
    details: t.json().$type<Record<string, unknown>>(),
  }),
  (t) => ({
    pk: primaryKey({ columns: [t.txHash, t.logIndex] }),
  })
);
