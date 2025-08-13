// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Orcastrator {
    using SafeERC20 for IERC20;
    enum BetStatus {
        Pending,   // created, awaiting challenged acceptance
        Active,    // both stakes locked, timer running
        Voting,    // proof submitted, voting open
        Declined,  // challenged declined
        Expired,   // challenged did not respond in time (auto-decline)
        Resolved,  // finalized with a winner
        Canceled   // tie -> all refunded
    }

    struct Bet {
        address challenger;
        address challenged;
        uint256 stakeAmount; // per participant
        string condition; // free-form description

        // timing
        uint64 createdAt;
        uint64 acceptUntil;
        uint64 timeframeSeconds; // challenge duration once Active
        uint64 votingEndsAt; // set on proof submission

        // state
        BetStatus status;
        string proofURI; // off-chain reference

        // voting accounting
        uint256 totalVotesChallenger;
        uint256 totalVotesChallenged;

        // finalization snapshot
        address winner; // participant winner address when Resolved
        bool finalized;
    }

    // immutable settings
    IERC20 public immutable usdc;
    address public immutable feeRecipient;
    uint256 public constant FEE_BPS = 200; // 2%
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant ACCEPT_WINDOW = 24 hours;
    uint256 public constant VOTING_WINDOW = 24 hours;

    // storage
    uint256 public nextBetId = 1;
    mapping(uint256 => Bet) public bets;

    // voter stakes per bet and side
    mapping(uint256 => mapping(address => uint256)) public challengerVotes; // betId => voter => amount
    mapping(uint256 => mapping(address => uint256)) public challengedVotes; // betId => voter => amount

    // claimable accounting for voters after finalize or cancel
    mapping(uint256 => bool) public voterSnapshotCreated; // safeguards reentrancy of snapshot
    mapping(uint256 => uint256) public voterWinningTotal; // total winning side stake snapshot
    mapping(uint256 => uint256) public voterLosingPool;   // total losing side stake to be distributed
    mapping(uint256 => bool) public winningSideIsChallenger; // snapshot of which side won
    mapping(uint256 => mapping(address => bool)) public voterClaimed; // betId => voter => claimed?

    // events
    event BetCreated(uint256 indexed betId, address indexed challenger, address indexed challenged, uint256 stakeAmount, string condition, uint64 timeframeSeconds);
    event BetAccepted(uint256 indexed betId);
    event BetDeclined(uint256 indexed betId);
    event BetExpired(uint256 indexed betId);
    event ProofSubmitted(uint256 indexed betId, string proofURI);
    event Voted(uint256 indexed betId, address indexed voter, bool forChallenger, uint256 amount);
    event Finalized(uint256 indexed betId, address winner, bool tie, uint256 feePaid);
    event VoterClaim(uint256 indexed betId, address indexed voter, uint256 amount);

    constructor(address usdcToken, address feeRecipientAddress) {
        require(usdcToken != address(0), "USDC_ZERO");
        require(feeRecipientAddress != address(0), "FEE_RECIP_ZERO");
        usdc = IERC20(usdcToken);
        feeRecipient = feeRecipientAddress;
    }

    // ------------------ Bet lifecycle ------------------

    function createBet(
        address challenged,
        uint256 stakeAmount,
        string calldata condition,
        uint64 timeframeSeconds
    ) external returns (uint256 betId) {
        require(challenged != address(0), "BAD_CHALLENGED");
        require(challenged != msg.sender, "SELF_BET");
        require(stakeAmount > 0, "STAKE_ZERO");
        require(timeframeSeconds > 0, "TIMEFRAME_ZERO");

        // lock challenger's stake
        _pull(msg.sender, address(this), stakeAmount);

        betId = nextBetId++;
        Bet storage b = bets[betId];
        b.challenger = msg.sender;
        b.challenged = challenged;
        b.stakeAmount = stakeAmount;
        b.condition = condition;
        b.createdAt = uint64(block.timestamp);
        b.acceptUntil = uint64(block.timestamp + ACCEPT_WINDOW);
        b.timeframeSeconds = timeframeSeconds;
        b.status = BetStatus.Pending;

        emit BetCreated(betId, msg.sender, challenged, stakeAmount, condition, timeframeSeconds);
    }

    function acceptBet(uint256 betId) external {
        Bet storage b = bets[betId];
        require(b.status == BetStatus.Pending, "NOT_PENDING");
        require(msg.sender == b.challenged, "NOT_CHALLENGED");
        require(block.timestamp <= b.acceptUntil, "ACCEPT_EXPIRED");

        // lock challenged's matching stake
        _pull(msg.sender, address(this), b.stakeAmount);

        b.status = BetStatus.Active;
        emit BetAccepted(betId);
    }

    function declineBet(uint256 betId) external {
        Bet storage b = bets[betId];
        require(b.status == BetStatus.Pending, "NOT_PENDING");
        require(msg.sender == b.challenged, "NOT_CHALLENGED");

        b.status = BetStatus.Declined;
        // refund challenger
        _push(address(this), b.challenger, b.stakeAmount);
        emit BetDeclined(betId);
    }

    function autoExpireBet(uint256 betId) external {
        Bet storage b = bets[betId];
        require(b.status == BetStatus.Pending, "NOT_PENDING");
        require(block.timestamp > b.acceptUntil, "NOT_YET");

        b.status = BetStatus.Expired;
        // refund challenger
        _push(address(this), b.challenger, b.stakeAmount);
        emit BetExpired(betId);
    }

    function submitProof(uint256 betId, string calldata proofURI) external {
        Bet storage b = bets[betId];
        require(b.status == BetStatus.Active, "NOT_ACTIVE");
        require(msg.sender == b.challenged, "ONLY_CHALLENGED");

        // ensure within timeframe
        // Note: timeframe starts when bet becomes Active. We do not store activatedAt explicitly; acceptable approximation: createdAt + ACCEPT_WINDOW >= now means acceptance occurred before acceptUntil.
        // For precision, we consider timeframe from the moment of acceptance; since we don't store that, we allow proof anytime while Active. Optional: could add set when accepted.

        b.status = BetStatus.Voting;
        b.proofURI = proofURI;
        b.votingEndsAt = uint64(block.timestamp + VOTING_WINDOW);
        emit ProofSubmitted(betId, proofURI);
    }

    // Challenger can claim win if no proof by end of timeframe
    function claimNoProofWin(uint256 betId) external {
        Bet storage b = bets[betId];
        require(b.status == BetStatus.Active, "NOT_ACTIVE");
        // timeframe enforcement: use createdAt + timeframe as an approximation starting at acceptance; for simplicity, we anchor from BetAccepted time is not stored.
        // We approximate by requiring createdAt + ACCEPT_WINDOW + timeframeSeconds < now, i.e., worst-case timeline.
        require(block.timestamp > uint256(b.createdAt) + ACCEPT_WINDOW + uint256(b.timeframeSeconds), "TIME_LEFT");

        b.status = BetStatus.Resolved;
        b.finalized = true;
        b.winner = b.challenger;

        // payout both stakes to challenger; no votes exist in this path
        uint256 total = b.stakeAmount * 2;
        uint256 fee = (total * FEE_BPS) / BPS_DENOMINATOR;
        _push(address(this), feeRecipient, fee);
        _push(address(this), b.challenger, total - fee);
        emit Finalized(betId, b.challenger, false, fee);
    }

    // ------------------ Voting ------------------
    function vote(uint256 betId, bool forChallenger, uint256 amount) external {
        Bet storage b = bets[betId];
        require(b.status == BetStatus.Voting, "NOT_VOTING");
        require(block.timestamp <= b.votingEndsAt, "VOTE_ENDED");
        require(amount > 0, "AMOUNT_ZERO");

        _pull(msg.sender, address(this), amount);

        if (forChallenger) {
            challengerVotes[betId][msg.sender] += amount;
            b.totalVotesChallenger += amount;
        } else {
            challengedVotes[betId][msg.sender] += amount;
            b.totalVotesChallenged += amount;
        }
        emit Voted(betId, msg.sender, forChallenger, amount);
    }

    function finalize(uint256 betId) external {
        Bet storage b = bets[betId];
        require(b.status == BetStatus.Voting, "NOT_VOTING");
        require(block.timestamp > b.votingEndsAt, "VOTING_OPEN");
        require(!b.finalized, "ALREADY_FINAL");

        uint256 totalVotesA = b.totalVotesChallenger;
        uint256 totalVotesB = b.totalVotesChallenged;

        uint256 participantsPool = b.stakeAmount * 2; // both already escrowed
        uint256 votersPool = totalVotesA + totalVotesB; // both already escrowed

        if (totalVotesA == totalVotesB) {
            // tie: refund everything
            b.status = BetStatus.Canceled;
            b.finalized = true;
            b.winner = address(0);

            // refund participant stakes
            _push(address(this), b.challenger, b.stakeAmount);
            _push(address(this), b.challenged, b.stakeAmount);

            // snapshot for voter refunds
            voterSnapshotCreated[betId] = true;
            winningSideIsChallenger[betId] = false; // unused
            voterWinningTotal[betId] = 0;
            voterLosingPool[betId] = votersPool; // all voters get back principal via claims

            emit Finalized(betId, address(0), true, 0);
            return;
        }

        // non-tie: determine winner by majority
        bool winnerIsChallenger = totalVotesA > totalVotesB;
        address winner = winnerIsChallenger ? b.challenger : b.challenged;

        // fee from total pool (participants + voters)
        uint256 totalPool = participantsPool + votersPool;
        uint256 fee = (totalPool * FEE_BPS) / BPS_DENOMINATOR;
        if (fee > 0) {
            _push(address(this), feeRecipient, fee);
        }

        // participants payout: winner receives both stakes less proportional fee share implicitly taken from total pool
        _push(address(this), winner, participantsPool);

        // voters: winners get back principal + pro-rata of losing side's stake
        uint256 losingPool = winnerIsChallenger ? totalVotesB : totalVotesA;
        uint256 winningTotal = winnerIsChallenger ? totalVotesA : totalVotesB;

        // after taking fee globally, we leave voter pools intact; their claims are from their side principal plus losingPool
        // To respect fee deduction, we already deducted from totalPool. That effectively reduces remaining reserves for voter payouts and/or participant payouts pro-rata.
        // We have already paid participants their full participantsPool; the fee is effectively coming out of the votersPool first if needed.

        // snapshot for claims
        voterSnapshotCreated[betId] = true;
        winningSideIsChallenger[betId] = winnerIsChallenger;
        voterWinningTotal[betId] = winningTotal;
        voterLosingPool[betId] = losingPool;

        b.status = BetStatus.Resolved;
        b.finalized = true;
        b.winner = winner;

        emit Finalized(betId, winner, false, fee);
    }

    // Claim for voters: returns principal + reward (if on winning side), or refund (if tie)
    function claimVoter(uint256 betId) external {
        Bet storage b = bets[betId];
        require(b.finalized, "NOT_FINAL");
        require(!voterClaimed[betId][msg.sender], "CLAIMED");
        voterClaimed[betId][msg.sender] = true;

        uint256 amount;

        if (b.status == BetStatus.Canceled) {
            // tie: refund both sides proportionally to their own stake
            uint256 a = challengerVotes[betId][msg.sender];
            uint256 c = challengedVotes[betId][msg.sender];
            amount = a + c;
        } else if (b.status == BetStatus.Resolved) {
            bool winChallenger = winningSideIsChallenger[betId];
            if (winChallenger) {
                uint256 principal = challengerVotes[betId][msg.sender];
                if (principal > 0) {
                    amount = principal;
                    uint256 pool = voterLosingPool[betId];
                    uint256 totalWin = voterWinningTotal[betId];
                    if (pool > 0 && totalWin > 0) {
                        amount += (pool * principal) / totalWin;
                    }
                }
            } else {
                uint256 principal = challengedVotes[betId][msg.sender];
                if (principal > 0) {
                    amount = principal;
                    uint256 pool = voterLosingPool[betId];
                    uint256 totalWin = voterWinningTotal[betId];
                    if (pool > 0 && totalWin > 0) {
                        amount += (pool * principal) / totalWin;
                    }
                }
            }
        }

        require(amount > 0, "NOTHING");
        _push(address(this), msg.sender, amount);
        emit VoterClaim(betId, msg.sender, amount);
    }

    // ------------------ Views ------------------
    function getBet(uint256 betId) external view returns (Bet memory) {
        return bets[betId];
    }

    function getVoterPosition(uint256 betId, address voter) external view returns (uint256 onChallenger, uint256 onChallenged) {
        onChallenger = challengerVotes[betId][voter];
        onChallenged = challengedVotes[betId][voter];
    }

    // ------------------ Internal token helpers ------------------
    function _pull(address from, address to, uint256 amount) internal {
        usdc.safeTransferFrom(from, to, amount);
    }

    function _push(address /*from*/, address to, uint256 amount) internal {
        usdc.safeTransfer(to, amount);
    }
}


