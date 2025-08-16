import { type BetStatus } from './indexer';

export interface BetStateResult {
  currentStatus: BetStatus;
  deadline: number; // 0 if no deadline or bet is closed
  timeRemaining: number; // in milliseconds, 0 if deadline passed or no deadline
}

export interface BetObject {
  lastUpdatedStatus: BetStatus;
  acceptanceDeadline: Date;
  proofSubmissionDeadline: Date;
  proofAcceptanceDeadline: Date;
  mediationDeadline?: Date;
  isClosed: boolean;
}

/**
 * Implementation of the smart contract's getCurrentStatus function in TypeScript
 * Determines the current state of a bet based on its status and deadlines
 */
export function getCurrentState(bet: BetObject): BetStateResult {
  const now = Date.now();
  const lastUpdatedStatus = bet.lastUpdatedStatus;
  
  // If bet is closed, return the last status with no deadline
  if (bet.isClosed) {
    return {
      currentStatus: lastUpdatedStatus,
      deadline: 0,
      timeRemaining: 0
    };
  }

  // Check each state and its corresponding deadline
  if (lastUpdatedStatus === 'OPEN') {
    const acceptanceDeadline = bet.acceptanceDeadline.getTime();
    if (now > acceptanceDeadline) {
      return {
        currentStatus: 'BET_NOT_ACCEPTED_IN_TIME',
        deadline: 0,
        timeRemaining: 0
      };
    }
    return {
      currentStatus: 'OPEN',
      deadline: acceptanceDeadline,
      timeRemaining: Math.max(0, acceptanceDeadline - now)
    };
  }
  
  if (lastUpdatedStatus === 'ACCEPTED') {
    const proofSubmissionDeadline = bet.proofSubmissionDeadline.getTime();
    if (now > proofSubmissionDeadline) {
      return {
        currentStatus: 'PROOF_NOT_SUBMITTED_IN_TIME',
        deadline: 0,
        timeRemaining: 0
      };
    }
    return {
      currentStatus: 'ACCEPTED',
      deadline: proofSubmissionDeadline,
      timeRemaining: Math.max(0, proofSubmissionDeadline - now)
    };
  }
  
  if (lastUpdatedStatus === 'PROOF_SUBMITTED') {
    const proofAcceptanceDeadline = bet.proofAcceptanceDeadline.getTime();
    if (now > proofAcceptanceDeadline) {
      return {
        currentStatus: 'PROOF_NOT_ACCEPTED_IN_TIME',
        deadline: 0,
        timeRemaining: 0
      };
    }
    return {
      currentStatus: 'PROOF_SUBMITTED',
      deadline: proofAcceptanceDeadline,
      timeRemaining: Math.max(0, proofAcceptanceDeadline - now)
    };
  }
  
  if (lastUpdatedStatus === 'PROOF_DISPUTED' && !bet.isClosed) {
    if (bet.mediationDeadline && bet.mediationDeadline.getTime() > 0) {
      const mediationDeadline = bet.mediationDeadline.getTime();
      if (now > mediationDeadline) {
        return {
          currentStatus: 'BET_NOT_MEDIATED_IN_TIME',
          deadline: 0,
          timeRemaining: 0
        };
      }
      return {
        currentStatus: 'PROOF_DISPUTED',
        deadline: mediationDeadline,
        timeRemaining: Math.max(0, mediationDeadline - now)
      };
    }
    // If no mediator or mediation deadline is 0, return disputed state with no deadline
    return {
      currentStatus: 'PROOF_DISPUTED',
      deadline: 0,
      timeRemaining: 0
    };
  }

  // For all other states (terminal states), return with no deadline
  return {
    currentStatus: lastUpdatedStatus,
    deadline: 0,
    timeRemaining: 0
  };
}

/**
 * Formats time remaining into a human-readable string
 */
export function formatTimeRemaining(timeRemaining: number): string {
  if (timeRemaining <= 0) {
    return 'Expired';
  }

  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return '< 1m';
  }
}

/**
 * Gets the status color based on time remaining
 */
export function getTimeStatusColor(timeRemaining: number, deadline: number): string {
  if (timeRemaining <= 0 || deadline === 0) {
    return 'text-red-600';
  }
  
  const totalTime = deadline - (deadline - timeRemaining);
  const timePercentage = timeRemaining / totalTime;
  
  if (timePercentage > 0.5) {
    return 'text-green-600';
  } else if (timePercentage > 0.25) {
    return 'text-yellow-600';
  } else {
    return 'text-orange-600';
  }
}