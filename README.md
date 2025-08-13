# Requirements Document

## Introduction

Bet Me is a Farcaster mini app that enables users to create and participate in social bets using USDC tokens. The platform allows users to challenge others with custom bet conditions, facilitates peer-to-peer betting with matched stakes, and uses community voting to determine winners through a decentralized polling mechanism.

## Requirements

### Requirement 1

**User Story:** As a challenger, I want to create a bet against another user with a custom condition and stake amount, so that I can engage in social betting activities.

#### Acceptance Criteria

1. WHEN a user accesses the Bet Me mini app THEN the system SHALL display a bet creation interface
2. WHEN a user enters a target username, bet condition, the bet timeframe and USDC amount THEN the system SHALL validate the inputs and allow bet submission
3. WHEN a user submits a bet THEN the system SHALL create a pending bet record and send a notification to the target user
4. IF the challenger has insufficient USDC balance THEN the system SHALL prevent bet creation and display an error message
5. WHEN a bet is created THEN the system SHALL lock the challenger's USDC stake in escrow

### Requirement 2

**User Story:** As a challenged user, I want to receive notifications about bets made against me and choose whether to accept or decline them, so that I can control my participation in betting activities.

#### Acceptance Criteria

1. WHEN a bet is created against a user THEN the system SHALL send a notification to the challenged user
2. WHEN a challenged user views a bet notification THEN the system SHALL display the bet details including challenger, condition, amount, and timeframe
3. WHEN a challenged user accepts a bet THEN the system SHALL verify they have sufficient USDC balance to match the stake
4. WHEN a challenged user accepts a bet THEN the system SHALL lock their matching USDC stake in escrow and activate the bet
5. WHEN a challenged user declines a bet THEN the system SHALL return the challenger's stake and mark the bet as declined
6. IF a challenged user does not respond within 24 hours THEN the system SHALL automatically decline the bet and return the challenger's stake

### Requirement 3

**User Story:** As a challenged user in an active bet, I want to submit proof of completing the bet condition within the specified timeframe, so that I can demonstrate my performance for community evaluation.

#### Acceptance Criteria

1. WHEN a bet becomes active THEN the system SHALL start a countdown timer for the specified timeframe
2. WHEN a challenged user uploads an image as proof THEN the system SHALL validate the image format and store it securely
3. WHEN proof is submitted THEN the system SHALL update the bet status to "awaiting community vote" and display the proof image
4. IF no proof is submitted before the timeframe expires THEN the system SHALL automatically award the bet to the challenger
5. WHEN proof is submitted THEN the system SHALL initiate a 24-hour community voting period

### Requirement 4

**User Story:** As a community member, I want to vote on bet outcomes by staking USDC on my choice, so that I can participate in the decision-making process and potentially earn rewards.

#### Acceptance Criteria

1. WHEN a bet enters the voting phase THEN the system SHALL display the bet details and proof image to all users
2. WHEN a user wants to vote THEN the system SHALL allow them to stake USDC on either the challenger or challenged user
3. WHEN a user submits a vote with stake THEN the system SHALL lock their USDC in the voting pool
4. WHEN the 24-hour voting period ends THEN the system SHALL calculate the percentage distribution of votes
5. IF voting results in a tie (50/50) THEN the system SHALL return all stakes to their original owners and cancel the bet

### Requirement 5

**User Story:** As a bet participant or voter, I want the system to automatically distribute winnings based on voting outcomes, so that I receive my rewards without manual intervention.

#### Acceptance Criteria

1. WHEN voting concludes THEN the system SHALL determine the winner based on majority vote percentage
2. WHEN a winner is determined THEN the system SHALL transfer the losing bet stake to the winning participant
3. WHEN vote distribution is calculated THEN the system SHALL redistribute losing voters' stakes proportionally to winning voters
4. WHEN winnings are calculated THEN the system SHALL deduct a 2% platform fee from the total betting pool
5. WHEN all calculations are complete THEN the system SHALL execute all USDC transfers atomically
6. IF any transfer fails THEN the system SHALL revert all transfers and maintain the original stake distribution

### Requirement 6

**User Story:** As a user, I want to view my betting history, active bets, and wallet balance, so that I can track my performance and manage my account.

#### Acceptance Criteria

1. WHEN a user accesses their profile THEN the system SHALL display their current USDC balance
2. WHEN a user views their betting history THEN the system SHALL show all past bets with outcomes and winnings/losses
3. WHEN a user has active bets THEN the system SHALL display them with current status and remaining time
4. WHEN a user views bet details THEN the system SHALL show all relevant information including participants, stakes, and voting results
5. WHEN a user wants to withdraw USDC THEN the system SHALL allow withdrawal of available balance to their connected wallet
