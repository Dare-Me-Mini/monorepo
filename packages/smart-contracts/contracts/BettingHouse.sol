// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BettingHouse is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    enum BetStatus {
        OPEN,
        CANCELLED,
        ACCEPTED,
        REJECTED,
        PROOF_SUBMITTED,
        PROOF_DISPUTED,
        COMPLETED_BY_CHALLENGEE,
        FORFEITED_BY_CHALLENGEE,
        BET_NOT_ACCEPTED_IN_TIME,
        PROOF_NOT_SUBMITTED_IN_TIME,
        PROOF_NOT_ACCEPTED_IN_TIME
    }
    
    struct Bet {
        address challenger;
        address challengee;
        string condition;
        uint256 amount;
        uint256 amountAfterFees;
        uint256 acceptanceDeadline;
        uint256 proofSubmissionDeadline;
        uint256 proofAcceptanceDeadline;
        string proof;
        BetStatus lastUpdatedStatus;
        IERC20 token;
        bool isClosed;
    }

    uint256 public totalBets;
    mapping(uint256 => Bet) public bets;
    mapping(address => bool) public supportedTokens;

    uint256 public constant BET_ACCEPTANCE_DEADLINE = 1 days;
    uint256 public constant PROOF_ACCEPTANCE_DEADLINE = 1 days;
    uint256 public fees = 100; // 1%, in basis points
    address public feeRecipient;

    modifier existingBet(uint256 betId) {
        require(betId < totalBets, "Bet does not exist");
        require(!bets[betId].isClosed, "Bet is closed");
        _;
    }

    modifier onlyChallenger(uint256 betId) {
        require(bets[betId].challenger == msg.sender, "Only challenger can perform this action");
        _;
    }

    modifier onlyChallengee(uint256 betId) {
        require(bets[betId].challengee == msg.sender, "Only challengee can perform this action");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setFees(uint256 _fees) public onlyOwner {
        fees = _fees;
    }

    function setFeeRecipient(address _feeRecipient) public onlyOwner {
        feeRecipient = _feeRecipient;
    }

    function addSupportedToken(address token) public onlyOwner {
        supportedTokens[token] = true;
    }

    function removeSupportedToken(address token) public onlyOwner {
        supportedTokens[token] = false;
    }

    function createBet(address challengee, string calldata condition, uint256 amount, uint256 deadline, address tokenAddress) public nonReentrant {
        require(supportedTokens[tokenAddress], "Token is not supported");
        
        uint256 betId = totalBets;

        // transfer tokens from the challenger to the betting house
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        
        bets[betId] = Bet({
            challenger: msg.sender,
            challengee: challengee,
            condition: condition,
            amount: amount,
            amountAfterFees: amount - (amount * fees / 10000),
            acceptanceDeadline: block.timestamp + BET_ACCEPTANCE_DEADLINE,
            proofSubmissionDeadline: deadline,
            proofAcceptanceDeadline: deadline + PROOF_ACCEPTANCE_DEADLINE,
            proof: "",
            lastUpdatedStatus: BetStatus.OPEN,
            token: IERC20(tokenAddress),
            isClosed: false
        });

        totalBets++;
    }

    function cancelBet(uint256 betId) public existingBet(betId) onlyChallenger(betId) nonReentrant {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        require(currentStatus == BetStatus.OPEN, "Bet is not open");
        bet.lastUpdatedStatus = BetStatus.CANCELLED;
        bet.isClosed = true;
        bet.token.transfer(bet.challenger, bet.amount);
    }

    function rejectBet(uint256 betId) public existingBet(betId) onlyChallengee(betId) nonReentrant {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        require(currentStatus == BetStatus.OPEN, "Bet is not open");
        bet.lastUpdatedStatus = BetStatus.REJECTED;
        bet.isClosed = true;
        bet.token.transfer(bet.challenger, bet.amount);
    }

    function acceptBet(uint256 betId) public existingBet(betId) onlyChallengee(betId) nonReentrant {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        require(currentStatus == BetStatus.OPEN, "Bet is not open");
        bet.lastUpdatedStatus = BetStatus.ACCEPTED;
        bet.token.transferFrom(bet.challengee, address(this), bet.amount);
        bet.token.transfer(feeRecipient, (bet.amount - bet.amountAfterFees) * 2);
    }

    function submitProof(uint256 betId, string calldata proof) public existingBet(betId) onlyChallengee(betId) {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        require(currentStatus == BetStatus.ACCEPTED, "Bet is in invalid status");
        bet.proof = proof;
        bet.lastUpdatedStatus = BetStatus.PROOF_SUBMITTED;
    }

    function acceptProof(uint256 betId) public existingBet(betId) onlyChallenger(betId) nonReentrant {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        require(currentStatus == BetStatus.PROOF_SUBMITTED, "Bet is in invalid status");
        bet.lastUpdatedStatus = BetStatus.COMPLETED_BY_CHALLENGEE;
        bet.isClosed = true;
        bet.token.transfer(bet.challengee, bet.amountAfterFees * 2);
    }

    function disputeProof(uint256 betId) public existingBet(betId) onlyChallenger(betId) nonReentrant {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        require(currentStatus == BetStatus.PROOF_SUBMITTED, "Bet is in invalid status");
        bet.lastUpdatedStatus = BetStatus.PROOF_DISPUTED;
        bet.isClosed = true;

        // currently, both parties will get their money back in case of dispute
        bet.token.transfer(bet.challengee, bet.amountAfterFees);
        bet.token.transfer(bet.challenger, bet.amountAfterFees);
    }

    function forfeitBet(uint256 betId) public existingBet(betId) onlyChallengee(betId) nonReentrant {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        require(currentStatus == BetStatus.ACCEPTED, "Bet is in invalid status");
        bet.lastUpdatedStatus = BetStatus.FORFEITED_BY_CHALLENGEE;
        bet.isClosed = true;
        bet.token.transfer(bet.challenger, bet.amountAfterFees * 2);
    }

    function claimMoney(uint256 betId) public existingBet(betId) nonReentrant {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        
        bet.isClosed = true;
        
        if (currentStatus == BetStatus.PROOF_NOT_ACCEPTED_IN_TIME) {
            bet.token.transfer(bet.challengee, bet.amountAfterFees * 2);
        } else if (currentStatus == BetStatus.PROOF_NOT_SUBMITTED_IN_TIME) {
            bet.token.transfer(bet.challenger, bet.amountAfterFees * 2);
        } else if (currentStatus == BetStatus.BET_NOT_ACCEPTED_IN_TIME) {
            bet.token.transfer(bet.challenger, bet.amountAfterFees);
        } else {
            revert("Bet is not in a claimable status");
        }
    }
    
    function getCurrentStatus(uint256 betId) public view existingBet(betId) returns (BetStatus) {
        BetStatus lastUpdatedStatus = bets[betId].lastUpdatedStatus;
        if (lastUpdatedStatus == BetStatus.OPEN) {
            if (block.timestamp > bets[betId].acceptanceDeadline) {
                return BetStatus.BET_NOT_ACCEPTED_IN_TIME;
            }
        } else if (lastUpdatedStatus == BetStatus.ACCEPTED) {
            if (block.timestamp > bets[betId].proofSubmissionDeadline) {
                return BetStatus.PROOF_NOT_SUBMITTED_IN_TIME;
            }
        } else if (lastUpdatedStatus == BetStatus.PROOF_SUBMITTED) {
            if (block.timestamp > bets[betId].proofAcceptanceDeadline) {
                return BetStatus.PROOF_NOT_ACCEPTED_IN_TIME;
            }
        }

        return lastUpdatedStatus;
    }
}