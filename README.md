# my-app

A Midnight Network application created with `create-mn-app`.

## Getting Started

### Prerequisites

- Node.js 22+ installed
- Docker installed (for proof server)

### Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Setup and deploy**:

   ```bash
   npm run setup
   ```

   This will:

   - Compile your Compact contract
   - Build TypeScript to JavaScript
   - Deploy contract to the testnet

3. **Interact with your contract**:
   ```bash
   npm run cli
   ```

### Available Scripts

- `npm run setup` - Compile, build, and deploy contract
- `npm run compile` - Compile Compact contract
- `npm run build` - Build TypeScript
- `npm run deploy` - Deploy contract to testnet
- `npm run cli` - Interactive CLI for contract
- `npm run check-balance` - Check wallet balance
- `npm run reset` - Reset all compiled/built files
- `npm run clean` - Clean build artifacts

### Environment Variables

Copy `.env.example` to `.env` and configure:

- `WALLET_SEED` - Your 64-character wallet seed (auto-generated)
- `MIDNIGHT_NETWORK` - Network to use (testnet)
- `PROOF_SERVER_URL` - Proof server URL
- `CONTRACT_NAME` - Contract name

### Project Structure

```
my-app/
├── contracts/
│   ├── health.compact    # Smart contract source
│   └── managed/               # Compiled artifacts
├── src/
│   ├── deploy.ts             # Deployment script
│   ├── cli.ts                # Interactive CLI
│   ├── providers/            # Shared providers
│   └── utils/                # Utility functions
├── .env                      # Environment config (keep private!)
├── deployment.json           # Deployment info
└── package.json
```

### Getting Testnet Tokens

1. Run `npm run deploy` to see your wallet address
2. Visit [https://midnight.network/test-faucet](https://midnight.network/test-faucet)
3. Enter your address to receive test tokens

### Learn More

- [Midnight Documentation](https://docs.midnight.network)
- [Compact Language Guide](https://docs.midnight.network/compact)
- [Tutorial Series](https://docs.midnight.network/tutorials)

## Contract Overview

This project powers the Private Wellness Tracker, a privacy-first dApp on the Midnight Network. The contract acts as a verifiable registry that allows users to prove healthy behaviors (steps/heart rate) to third parties (insurers) without ever revealing their raw biometric data.

-Verifies Zero-Knowledge Proofs: Validates client-side proofs asserting that daily goals (e.g., Steps >= 10,000) have been met.
-Maintains Encrypted State: Stores cumulative activity metrics (activitySum, heartRateSum) on the ledger as encrypted commitments.
-Manages Rewards: Tracks a public goalCount to unlock insurance reward tiers without exposing the underlying data history.


The contract uses:

-Private Ledger State: For activitySum and heartRateSum (biometrics are never plain-text).
-Compact Circuits: Specifically submitProof for state transitions and getStats for dashboard rendering.
-Witnesses: To handle client-side secret keys and local data validation.


Happy coding! 🌙
