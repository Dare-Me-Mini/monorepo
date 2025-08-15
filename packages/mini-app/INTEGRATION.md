# Smart Contract Integration

This mini-app has been integrated with the BettingHouse smart contract using Farcaster wallet connection with full USDC and WETH support.

## Features Implemented

✅ **Wallet Connection**: Automatic Farcaster wallet connection via wagmi
✅ **Token Support**: Full USDC and WETH integration with proper decimal handling
✅ **Bet Creation**: Create bets on-chain with token selection and proper validation
✅ **Bet Acceptance/Rejection**: Accept or reject bets directly from the interface
✅ **Proof Submission**: Submit proof of bet completion to the blockchain
✅ **Proof Review**: Accept or dispute submitted proofs
✅ **Amount Formatting**: Proper display of token amounts (USDC/10^6, WETH/10^18)
✅ **Error Handling**: Comprehensive error handling with user-friendly messages

## Smart Contract Integration Points

### 1. Bet Creation (`/create`)
- Token selection between USDC and WETH
- Validates friend has a Farcaster wallet
- Creates bet on-chain with proper token amounts (multiplied by token decimals)
- Extracts bet ID from transaction receipt
- Redirects to share page with bet details including token info

### 2. Bet Management (`/dare/[id]`)
- Accept/reject pending bets with proper transaction handling
- View bet status and details with formatted token amounts
- Navigate to proof submission/review with token context

### 3. Proof Submission (`/dare/[id]/proof`)
- Submit proof URL and notes to smart contract
- Local storage backup for user convenience
- Transaction confirmation and error handling

### 4. Proof Review (`/dare/[id]/review`)
- Accept or dispute submitted proofs
- Resolve bet outcomes on-chain
- Update local storage for consistency

## Token Integration

### Supported Tokens
- **USDC**: `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913` (6 decimals)
- **WETH**: `0x4200000000000000000000000000000000000006` (18 decimals)

### Amount Handling
- **Display**: All amounts are displayed in human-readable format (divided by token decimals)
- **Input**: Users enter amounts in normal units (e.g., "100" for 100 USDC)
- **Contract**: Amounts are automatically converted to wei/smallest units before sending to contract
- **Formatting**: Proper decimal place handling for each token type

## Environment Variables

Required environment variables in `.env.local`:

```
NEXT_PUBLIC_BETTING_HOUSE_CONTRACT_ADDRESS=0xf60f49934d6519573BFe2C9971330e3e97158257
NEXT_PUBLIC_RPC_URL=https://base-mainnet.infura.io/v3/9724e109c38649cf84f2bcccebf14cd1
```

## Architecture

- **Contracts**: `lib/contracts.ts` - Contract instances and types
- **Tokens**: `lib/tokens.ts` - Token configuration and formatting utilities
- **Hooks**: `hooks/useBettingHouse.ts` - Contract interaction hooks
- **Hooks**: `hooks/useBetDetails.ts` - On-chain bet data fetching
- **Utils**: `lib/betUtils.ts` - Utility functions for bet management
- **Components**: Updated with smart contract and token integration

## Usage Flow

1. **Connect Wallet**: Automatic Farcaster wallet connection
2. **Create Bet**: Select token (USDC/WETH) → Fill form → Create on-chain → Get bet ID → Share
3. **Accept/Reject**: Recipient can accept or reject the bet (proper token amounts displayed)
4. **Submit Proof**: Challenger submits proof of completion
5. **Review Proof**: Challengee reviews and accepts/disputes
6. **Claim Winnings**: Winner can claim their winnings

## Next Steps

- [x] Add token selection (USDC/WETH implemented)
- [ ] Implement mediator selection
- [ ] Add bet browsing/discovery
- [ ] Implement claiming functionality
- [ ] Add bet history and statistics
- [ ] Add token approval handling for ERC20 tokens
- [ ] Implement balance checking before bet creation