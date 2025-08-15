# Indexer Integration

This document describes the integration between the mini-app and the Ponder indexer for fetching real-time bet data from the blockchain.

## Overview

The indexer provides a comprehensive API for querying bet data, including:
- Individual bet details
- User bet lists
- Bet events and history
- Real-time status updates

## Architecture

### Indexer Stack
- **Ponder**: Blockchain indexer that syncs events from the BettingHouse contract
- **Database**: Stores processed bet data and events
- **GraphQL API**: Provides structured queries for bet data
- **REST API**: Simple endpoints for common operations

### Mini-App Integration
- **API Client**: `lib/indexer.ts` - Handles all communication with the indexer
- **Hooks**: Custom React hooks for fetching and managing bet data
- **Types**: TypeScript interfaces matching the indexer schema

## API Endpoints

### GraphQL Endpoint
- **URL**: `${INDEXER_URL}/graphql`
- **Capabilities**: Complex queries, filtering, pagination
- **Use Cases**: Bet listings, filtered searches, complex data relationships

### REST Endpoints
- **Individual Bet**: `GET /bets/{id}` - Fetch specific bet details
- **SQL Interface**: `/sql/*` - Direct database queries (advanced usage)

## Data Structure

### Bet Entity
```typescript
interface IndexerBet {
  id: string;
  challenger: string;
  challengee: string;
  mediator: string;
  condition: string;
  amount: string;           // Raw amount in wei/smallest units
  amountAfterFees: string;
  token: string;           // Token contract address
  lastUpdatedStatus: BetStatus;
  proof: string;
  isClosed: boolean;
  createdTimestamp: string;
  acceptanceDeadline: string;
  proofSubmissionDeadline: string;
  proofAcceptanceDeadline: string;
  // ... other fields
}
```

### Bet Status Values
- `OPEN` - Bet created, waiting for acceptance
- `ACCEPTED` - Bet accepted, in progress
- `REJECTED` - Bet rejected by challengee
- `CANCELLED` - Bet cancelled by challenger
- `PROOF_SUBMITTED` - Proof submitted by challenger
- `PROOF_DISPUTED` - Proof disputed by challengee
- `COMPLETED_BY_CHALLENGEE` - Challengee won
- `COMPLETED_BY_CHALLENGER` - Challenger won
- `FORFEITED_BY_CHALLENGEE` - Challengee forfeited
- And more status values for timeout scenarios

## Integration Points

### 1. Bet Details (`useBetDetails` hook)
```typescript
const betDetails = useBetDetails(betId);
// Returns formatted bet data with token amounts properly displayed
```

**Features:**
- Automatic token amount formatting
- Real-time status updates
- Error handling and loading states

### 2. User Bet Lists (`useUserBets` hook)
```typescript
const { 
  bets, 
  activeBets, 
  pendingBets, 
  completedBets 
} = useUserBets({
  autoRefresh: true,
  statusFilter: ['OPEN', 'ACCEPTED']
});
```

**Features:**
- Auto-refresh functionality
- Status-based filtering
- Role-based categorization (challenger vs challengee)
- Pagination support

### 3. Bet Discovery (Home Page)
- Lists user's active and completed bets
- Real-time status indicators
- Quick navigation to bet details

### 4. Bet Detail Page
- Fetches real bet data instead of URL parameters
- Shows accurate status and timestamps
- Displays proof information when available

## Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_INDEXER_URL=http://localhost:42069  # Development
# NEXT_PUBLIC_INDEXER_URL=https://indexer.yourdomain.com  # Production
```

## Error Handling

### Network Errors
- Automatic retry logic
- Graceful fallback to URL parameters when indexer unavailable
- User-friendly error messages

### Data Validation
- Token address validation against supported tokens
- Amount formatting with proper decimal handling
- Status enum validation

## Token Integration

### Amount Display
- Raw amounts from indexer are in wei/smallest units
- Automatically formatted for display using token decimals
- USDC: Divided by 10^6
- WETH: Divided by 10^18

### Token Information
- Token addresses mapped to human-readable symbols
- Emoji icons for visual identification
- Proper decimal handling for calculations

## Real-time Updates

### Auto-refresh
- Configurable refresh intervals (default: 30 seconds)
- Automatic updates when new events occur
- Optimistic updates after user actions

### Manual Refresh
- Pull-to-refresh on mobile
- Refresh button for manual updates
- Page reload after successful transactions

## Performance Optimizations

### Caching
- Client-side caching of bet data
- Avoid redundant API calls
- Smart invalidation strategies

### Pagination
- Lazy loading for large bet lists
- Configurable page sizes
- Cursor-based pagination for consistency

### Bundle Size
- Tree-shaking for unused indexer features
- Lazy-loaded components for bet lists
- Optimized GraphQL queries

## Development Workflow

### 1. Start Indexer
```bash
cd packages/indexer
bun run dev
```

### 2. Start Mini-App
```bash
cd packages/mini-app
bun run dev
```

### 3. Test Integration
- Create test bets through the UI
- Verify data appears in indexer
- Check real-time updates

## Production Deployment

### Indexer Deployment
- Deploy Ponder indexer to cloud infrastructure
- Configure proper RPC endpoints
- Set up database persistence

### Mini-App Configuration
- Update `NEXT_PUBLIC_INDEXER_URL` to production endpoint
- Configure CORS settings on indexer
- Set up monitoring and alerts

## Troubleshooting

### Common Issues

1. **Indexer Connection Failed**
   - Check if indexer is running
   - Verify URL configuration
   - Check network connectivity

2. **Data Not Syncing**
   - Verify indexer is syncing with blockchain
   - Check for RPC rate limits
   - Review indexer logs

3. **Amount Display Issues**
   - Verify token addresses in configuration
   - Check decimal handling in formatters
   - Validate raw amounts from indexer

### Debug Tools
- Browser dev tools for network requests
- Indexer admin interface (if available)
- GraphQL playground for query testing

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Advanced filtering and search capabilities
- [ ] Analytics and statistics
- [ ] Bet recommendation engine
- [ ] Social features (comments, reactions)