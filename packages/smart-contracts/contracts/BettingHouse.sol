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
        COMPLETED_BY_CHALLENGER,
        FORFEITED_BY_CHALLENGEE,
        BET_NOT_ACCEPTED_IN_TIME,
        PROOF_NOT_SUBMITTED_IN_TIME,
        PROOF_NOT_ACCEPTED_IN_TIME,
        BET_NOT_MEDIATED_IN_TIME,
        DRAW
    }
    
    // Events
    event BetCreated(
        uint256 indexed betId,
        address indexed challenger,
        address indexed challengee,
        string condition,
        uint256 amount,
        address token,
        address mediator
    );

    event BetCancelled(uint256 indexed betId);
    event BetRejected(uint256 indexed betId);
    event BetAccepted(uint256 indexed betId, uint256 feePerSide, uint256 totalFees);
    event ProofSubmitted(uint256 indexed betId, string proof);
    event ProofAccepted(uint256 indexed betId);
    event ProofDisputed(uint256 indexed betId, bool isMediating, uint256 mediationDeadline);
    event BetForfeited(uint256 indexed betId);
    event BetClaimed(uint256 indexed betId, address indexed claimer, BetStatus resultingStatus);

    event FeesUpdated(uint256 feesBps);
    event FeeRecipientUpdated(address feeRecipient);
    event SupportedTokenAdded(address token);
    event SupportedTokenRemoved(address token);
    
    struct Bet {
        address challenger;
        address challengee;
        address mediator;
        string condition;
        uint256 amount;
        uint256 amountAfterFees;
        uint256 acceptanceDeadline;
        uint256 proofSubmissionDeadline;
        uint256 proofAcceptanceDeadline;
        uint256 mediationDeadline;
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
    uint256 public constant BET_MEDIATION_DEADLINE = 1 days;
    uint256 public fees;
    address public feeRecipient;

    modifier existingBet(uint256 betId) {
        require(betId < totalBets, "Bet does not exist");
        _;
    }

    modifier betNotClosed(uint256 betId) {
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

    modifier onlyMediator(uint256 betId) {
        require(bets[betId].mediator == msg.sender, "Only mediator can perform this action");
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
        fees = 100; // 1%, in basis points
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setFees(uint256 _fees) public onlyOwner {
        require(_fees <= 10000, "Fees must be less than or equal to 100%");
        fees = _fees;
        emit FeesUpdated(_fees);
    }

    function setFeeRecipient(address _feeRecipient) public onlyOwner {
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
    }

    function addSupportedToken(address token) public onlyOwner {
        supportedTokens[token] = true;
        emit SupportedTokenAdded(token);
    }

    function removeSupportedToken(address token) public onlyOwner {
        supportedTokens[token] = false;
        emit SupportedTokenRemoved(token);
    }

    function createBet(address challengee, string calldata condition, uint256 amount, uint256 deadline, address tokenAddress, address mediator) public nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(deadline > block.timestamp, "Deadline must be in the future");
        require(challengee != address(0), "Challengee cannot be the zero address");
        require(msg.sender != challengee, "Challenger and challengee cannot be the same");
        require(supportedTokens[tokenAddress], "Token is not supported");
        
        uint256 betId = totalBets;

        // transfer tokens from the challenger to the betting house
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        
        bets[betId] = Bet({
            challenger: msg.sender,
            challengee: challengee,
            mediator: mediator,
            condition: condition,
            amount: amount,
            amountAfterFees: amount - (amount * fees / 10000),
            acceptanceDeadline: block.timestamp + BET_ACCEPTANCE_DEADLINE,
            proofSubmissionDeadline: deadline,
            proofAcceptanceDeadline: deadline + PROOF_ACCEPTANCE_DEADLINE,
            proof: "",
            lastUpdatedStatus: BetStatus.OPEN,
            token: IERC20(tokenAddress),
            isClosed: false,
            mediationDeadline: 0
        });

        totalBets++;

        emit BetCreated(betId, msg.sender, challengee, condition, amount, tokenAddress, mediator);
    }

    function cancelBet(uint256 betId) public existingBet(betId) onlyChallenger(betId) betNotClosed(betId) nonReentrant {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        require(currentStatus == BetStatus.OPEN, "Bet is not open");
        bet.lastUpdatedStatus = BetStatus.CANCELLED;
        bet.isClosed = true;
        bet.token.transfer(bet.challenger, bet.amount);
        emit BetCancelled(betId);
    }

    function rejectBet(uint256 betId) public existingBet(betId) onlyChallengee(betId) betNotClosed(betId) nonReentrant {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        require(currentStatus == BetStatus.OPEN, "Bet is not open");
        bet.lastUpdatedStatus = BetStatus.REJECTED;
        bet.isClosed = true;
        bet.token.transfer(bet.challenger, bet.amount);
        emit BetRejected(betId);
    }

    function acceptBet(uint256 betId) public existingBet(betId) onlyChallengee(betId) betNotClosed(betId) nonReentrant {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        require(currentStatus == BetStatus.OPEN, "Bet is not open");
        bet.lastUpdatedStatus = BetStatus.ACCEPTED;
        bet.token.transferFrom(bet.challengee, address(this), bet.amount);
        bet.token.transfer(feeRecipient, (bet.amount - bet.amountAfterFees) * 2);
        emit BetAccepted(betId, (bet.amount - bet.amountAfterFees), (bet.amount - bet.amountAfterFees) * 2);
    }

    function submitProof(uint256 betId, string calldata proof) public existingBet(betId) onlyChallengee(betId) {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        require(currentStatus == BetStatus.ACCEPTED, "Bet is in invalid status");
        bet.proof = proof;
        bet.lastUpdatedStatus = BetStatus.PROOF_SUBMITTED;
        emit ProofSubmitted(betId, proof);
    }

    function acceptProof(uint256 betId) public existingBet(betId) onlyChallenger(betId) betNotClosed(betId) nonReentrant {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        require(currentStatus == BetStatus.PROOF_SUBMITTED, "Bet is in invalid status");
        bet.lastUpdatedStatus = BetStatus.COMPLETED_BY_CHALLENGEE;
        bet.isClosed = true;
        bet.token.transfer(bet.challengee, bet.amountAfterFees * 2);
        emit ProofAccepted(betId);
    }

    function disputeProof(uint256 betId) public existingBet(betId) onlyChallenger(betId) betNotClosed(betId) nonReentrant {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        require(currentStatus == BetStatus.PROOF_SUBMITTED, "Bet is in invalid status");
        bet.lastUpdatedStatus = BetStatus.PROOF_DISPUTED;
        
        if (bet.mediator == address(0)) {
            bet.isClosed = true;

            // currently, both parties will get their money back in case of dispute
            bet.token.transfer(bet.challengee, bet.amountAfterFees);
            bet.token.transfer(bet.challenger, bet.amountAfterFees);
            emit ProofDisputed(betId, false, 0);
        } else {
            bet.mediationDeadline = block.timestamp + BET_MEDIATION_DEADLINE;
            emit ProofDisputed(betId, true, bet.mediationDeadline);
        }
    }

    function submitMediation(uint256 betId, bool isDraw, bool isChallengeeWinner) public existingBet(betId) onlyMediator(betId) betNotClosed(betId) nonReentrant {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        require(currentStatus == BetStatus.PROOF_DISPUTED, "Bet is in invalid status");
        if (isDraw) {
            bet.lastUpdatedStatus = BetStatus.DRAW;
            bet.token.transfer(bet.challenger, bet.amountAfterFees);
            bet.token.transfer(bet.challengee, bet.amountAfterFees);
        } else if (isChallengeeWinner) {
            bet.lastUpdatedStatus = BetStatus.COMPLETED_BY_CHALLENGEE;
            bet.token.transfer(bet.challengee, bet.amountAfterFees * 2);
        } else {
            bet.lastUpdatedStatus = BetStatus.COMPLETED_BY_CHALLENGER;
            bet.token.transfer(bet.challenger, bet.amountAfterFees * 2);
        }
        bet.isClosed = true;
    }

    function forfeitBet(uint256 betId) public existingBet(betId) onlyChallengee(betId) betNotClosed(betId) nonReentrant {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        require(currentStatus == BetStatus.ACCEPTED, "Bet is in invalid status");
        bet.lastUpdatedStatus = BetStatus.FORFEITED_BY_CHALLENGEE;
        bet.isClosed = true;
        bet.token.transfer(bet.challenger, bet.amountAfterFees * 2);
        emit BetForfeited(betId);
    }

    function claimMoney(uint256 betId) public existingBet(betId) betNotClosed(betId) nonReentrant {
        Bet storage bet = bets[betId];
        BetStatus currentStatus = getCurrentStatus(betId);
        
        bet.isClosed = true;
        
        if (currentStatus == BetStatus.PROOF_NOT_ACCEPTED_IN_TIME) {
            bet.token.transfer(bet.challengee, bet.amountAfterFees * 2);
            emit BetClaimed(betId, msg.sender, BetStatus.PROOF_NOT_ACCEPTED_IN_TIME);
        } else if (currentStatus == BetStatus.PROOF_NOT_SUBMITTED_IN_TIME) {
            bet.token.transfer(bet.challenger, bet.amountAfterFees * 2);
            emit BetClaimed(betId, msg.sender, BetStatus.PROOF_NOT_SUBMITTED_IN_TIME);
        } else if (currentStatus == BetStatus.BET_NOT_ACCEPTED_IN_TIME) {
            bet.token.transfer(bet.challenger, bet.amountAfterFees);
            emit BetClaimed(betId, msg.sender, BetStatus.BET_NOT_ACCEPTED_IN_TIME);
        } else if (currentStatus == BetStatus.BET_NOT_MEDIATED_IN_TIME) {
            bet.token.transfer(bet.challenger, bet.amountAfterFees);
            bet.token.transfer(bet.challengee, bet.amountAfterFees);
            emit BetClaimed(betId, msg.sender, BetStatus.BET_NOT_MEDIATED_IN_TIME);
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
        } else if (lastUpdatedStatus == BetStatus.PROOF_DISPUTED && !bets[betId].isClosed) {
            if (block.timestamp > bets[betId].mediationDeadline) {
                return BetStatus.BET_NOT_MEDIATED_IN_TIME;
            }
        }

        return lastUpdatedStatus;
    }
}