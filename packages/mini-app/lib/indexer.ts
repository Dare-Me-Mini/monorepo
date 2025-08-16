import { validatePublicEnv } from "./env";

// Indexer API client for fetching bet data
export interface IndexerBet {
  id: string;
  challenger: string;
  challengee: string;
  mediator: string;
  condition: string;
  amount: string;
  amountAfterFees: string;
  acceptanceDeadline: string;
  proofSubmissionDeadline: string;
  proofAcceptanceDeadline: string;
  mediationDeadline: string;
  proof: string;
  lastUpdatedStatus: BetStatus;
  token: string;
  isClosed: boolean;
  // Farcaster user data
  challengerFid?: number;
  challengerUsername?: string;
  challengerPfp?: string;
  challengeeFid?: number;
  challengeeUsername?: string;
  challengeePfp?: string;
  createdTxHash: string;
  createdBlockNumber: string;
  createdTimestamp: string;
  updatedAt: string;
}

export interface IndexerBetEvent {
  txHash: string;
  logIndex: number;
  blockNumber: string;
  timestamp: string;
  betId: string;
  name: string;
  actor: string;
  details: Record<string, unknown>;
}

export interface BetsResponse {
  items: IndexerBet[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  totalCount: number;
}

export interface BetEventsResponse {
  items: IndexerBetEvent[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  totalCount: number;
}

export type BetStatus = 
  | "OPEN"
  | "CANCELLED"
  | "ACCEPTED"
  | "REJECTED"
  | "PROOF_SUBMITTED"
  | "PROOF_DISPUTED"
  | "COMPLETED_BY_CHALLENGEE"
  | "COMPLETED_BY_CHALLENGER"
  | "FORFEITED_BY_CHALLENGEE"
  | "BET_NOT_ACCEPTED_IN_TIME"
  | "PROOF_NOT_SUBMITTED_IN_TIME"
  | "PROOF_NOT_ACCEPTED_IN_TIME"
  | "BET_NOT_MEDIATED_IN_TIME"
  | "DRAW";

export interface BetFilter {
  id?: string;
  challenger?: string;
  challengee?: string;
  token?: string;
  lastUpdatedStatus?: BetStatus;
  isClosed?: boolean;
  // Add more filters as needed
}

class IndexerClient {
  private baseUrl: string;

  constructor() {
    const env = validatePublicEnv();
    this.baseUrl = env.indexerUrl.replace(/\/$/, '');
  }

  async getBet(id: string | number): Promise<IndexerBet | null> {
    try {
      const query = `
        query GetBet($id: String!) {
          bet(id: $id) {
            id
            challenger
            challengee
            mediator
            condition
            amount
            amountAfterFees
            acceptanceDeadline
            proofSubmissionDeadline
            proofAcceptanceDeadline
            mediationDeadline
            proof
            lastUpdatedStatus
            token
            isClosed
            challengerFid
            challengerUsername
            challengerPfp
            challengeeFid
            challengeeUsername
            challengeePfp
            createdTxHash
            createdBlockNumber
            createdTimestamp
            updatedAt
          }
        }
      `;

      const response = await fetch(`${this.baseUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { id: id.toString() },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      return result.data.bet;
    } catch (error) {
      console.error('Failed to fetch bet:', error);
      throw error;
    }
  }

  async getBets(options: {
    where?: BetFilter;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    limit?: number;
    after?: string;
    before?: string;
  } = {}): Promise<BetsResponse> {
    try {
      const query = `
        query GetBets($where: betFilter, $orderBy: String, $orderDirection: String, $limit: Int, $after: String, $before: String) {
          bets(where: $where, orderBy: $orderBy, orderDirection: $orderDirection, limit: $limit, after: $after, before: $before) {
            items {
              id
              challenger
              challengee
              mediator
              condition
              amount
              amountAfterFees
              acceptanceDeadline
              proofSubmissionDeadline
              proofAcceptanceDeadline
              mediationDeadline
              proof
              lastUpdatedStatus
              token
              isClosed
              challengerFid
              challengerUsername
              challengerPfp
              challengeeFid
              challengeeUsername
              challengeePfp
              createdTxHash
              createdBlockNumber
              createdTimestamp
              updatedAt
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            totalCount
          }
        }
      `;

      const response = await fetch(`${this.baseUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: options,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      return result.data.bets;
    } catch (error) {
      console.error('Failed to fetch bets:', error);
      throw error;
    }
  }

  async getBetEvents(betId: string | number, options: {
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    limit?: number;
  } = {}): Promise<BetEventsResponse> {
    try {
      const query = `
        query GetBetEvents($where: betEventFilter, $orderBy: String, $orderDirection: String, $limit: Int) {
          betEvents(where: $where, orderBy: $orderBy, orderDirection: $orderDirection, limit: $limit) {
            items {
              txHash
              logIndex
              blockNumber
              timestamp
              betId
              name
              actor
              details
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            totalCount
          }
        }
      `;

      const response = await fetch(`${this.baseUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            where: { betId: betId.toString() },
            ...options,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      return result.data.betEvents;
    } catch (error) {
      console.error('Failed to fetch bet events:', error);
      throw error;
    }
  }

  async getUserBets(userAddress: string, options: {
    includeAsChallenger?: boolean;
    includeAsChallengee?: boolean;
    status?: BetStatus[];
    limit?: number;
    orderDirection?: 'asc' | 'desc';
  } = {}): Promise<BetsResponse> {
    const {
      includeAsChallenger = true,
      includeAsChallengee = true,
      status,
      limit = 50,
      orderDirection = 'desc',
    } = options;

    const whereConditions = [];

    if (includeAsChallenger && includeAsChallengee) {
      whereConditions.push({
        OR: [
          { challenger: userAddress.toLowerCase() },
          { challengee: userAddress.toLowerCase() },
        ],
      });
    } else if (includeAsChallenger) {
      whereConditions.push({ challenger: userAddress.toLowerCase() });
    } else if (includeAsChallengee) {
      whereConditions.push({ challengee: userAddress.toLowerCase() });
    }

    if (status && status.length > 0) {
      whereConditions.push({ lastUpdatedStatus_in: status });
    }

    const where = whereConditions.length > 1 
      ? { AND: whereConditions }
      : whereConditions[0] || {};

    return this.getBets({
      where,
      orderBy: 'createdTimestamp',
      orderDirection,
      limit,
    });
  }
}

export const indexerClient = new IndexerClient();

// Utility functions
export function getBetStatusLabel(status: BetStatus): string {
  switch (status) {
    case 'OPEN':
      return 'Open';
    case 'ACCEPTED':
      return 'Accepted';
    case 'REJECTED':
      return 'Rejected';
    case 'CANCELLED':
      return 'Cancelled';
    case 'PROOF_SUBMITTED':
      return 'Proof Submitted';
    case 'PROOF_DISPUTED':
      return 'Proof Disputed';
    case 'COMPLETED_BY_CHALLENGEE':
      return 'Won by Challengee';
    case 'COMPLETED_BY_CHALLENGER':
      return 'Won by Challenger';
    case 'FORFEITED_BY_CHALLENGEE':
      return 'Forfeited';
    case 'BET_NOT_ACCEPTED_IN_TIME':
      return 'Expired';
    case 'PROOF_NOT_SUBMITTED_IN_TIME':
      return 'Proof Deadline Passed';
    case 'PROOF_NOT_ACCEPTED_IN_TIME':
      return 'Proof Review Deadline Passed';
    case 'BET_NOT_MEDIATED_IN_TIME':
      return 'Mediation Deadline Passed';
    case 'DRAW':
      return 'Draw';
    default:
      return status;
  }
}

export function getBetStatusColor(status: BetStatus): string {
  switch (status) {
    case 'OPEN':
      return 'bg-blue-100 text-blue-800';
    case 'ACCEPTED':
      return 'bg-green-100 text-green-800';
    case 'REJECTED':
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    case 'PROOF_SUBMITTED':
      return 'bg-yellow-100 text-yellow-800';
    case 'PROOF_DISPUTED':
      return 'bg-orange-100 text-orange-800';
    case 'COMPLETED_BY_CHALLENGEE':
    case 'COMPLETED_BY_CHALLENGER':
      return 'bg-green-100 text-green-800';
    case 'FORFEITED_BY_CHALLENGEE':
      return 'bg-red-100 text-red-800';
    case 'DRAW':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}