import "dotenv/config";
import * as readline from "readline/promises";
import { WalletBuilder } from "@midnight-ntwrk/wallet";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import {
  NetworkId,
  setNetworkId,
  getZswapNetworkId,
  getLedgerNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import { createBalancedTx } from "@midnight-ntwrk/midnight-js-types";
import { Transaction } from "@midnight-ntwrk/ledger";
import { Transaction as ZswapTransaction } from "@midnight-ntwrk/zswap";
import { WebSocket } from "ws";
import * as path from "path";
import * as fs from "fs";
import * as Rx from "rxjs";
import { MidnightProviders } from "./providers/midnight-providers.js";
import { EnvironmentManager } from "./utils/environment.js";

const getSecretKeyBytes = () => {
  const hex = (process.env.CONTRACT_SECRET_KEY || process.env.WALLET_SEED || "").replace(/^0x/, "");
  if (!/^[a-fA-F0-9]{64}$/.test(hex)) {
    throw new Error(
      "CONTRACT_SECRET_KEY (or WALLET_SEED fallback) must be a 32-byte hex string"
    );
  }
  return Uint8Array.from(Buffer.from(hex, "hex"));
};

// Fix WebSocket for Node.js environment
// @ts-ignore
globalThis.WebSocket = WebSocket;

// Configure for Midnight Testnet
setNetworkId(NetworkId.TestNet);

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("🌙 my-app CLI (health)\n");

  try {
    // Validate environment
    EnvironmentManager.validateEnvironment();

    // Check for deployment file
    if (!fs.existsSync("deployment.json")) {
      console.error("❌ No deployment.json found! Run npm run deploy first.");
      process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf-8"));
    console.log(`Contract: ${deployment.contractAddress}\n`);

    const networkConfig = EnvironmentManager.getNetworkConfig();
    const contractName =
      deployment.contractName || process.env.CONTRACT_NAME || "health";
    const walletSeed = process.env.WALLET_SEED!;

    console.log("Connecting to Midnight network...");

    // Build wallet
    const wallet = await WalletBuilder.buildFromSeed(
      networkConfig.indexer,
      networkConfig.indexerWS,
      networkConfig.proofServer,
      networkConfig.node,
      walletSeed,
      getZswapNetworkId(),
      "info"
    );

    wallet.start();

    // Wait for sync
    await Rx.firstValueFrom(
      wallet.state().pipe(Rx.filter((s) => s.syncProgress?.synced === true))
    );

    // Load contract
    const contractPath = path.join(process.cwd(), "contracts");
    const contractModulePath = path.join(
      contractPath,
      "managed",
      contractName,
      "contract",
      "index.cjs"
    );
    const HelloWorldModule = await import(contractModulePath);
    const secretKeyBytes = getSecretKeyBytes();
    const contractInstance = new HelloWorldModule.Contract({
      secretKey: (context: any) => [context.state, secretKeyBytes],
    });

    // Create wallet provider
    const walletState = await Rx.firstValueFrom(wallet.state());

    const walletProvider = {
      coinPublicKey: walletState.coinPublicKey,
      encryptionPublicKey: walletState.encryptionPublicKey,
      balanceTx(tx: any, newCoins: any) {
        return wallet
          .balanceTransaction(
            ZswapTransaction.deserialize(
              tx.serialize(getLedgerNetworkId()),
              getZswapNetworkId()
            ),
            newCoins
          )
          .then((tx) => wallet.proveTransaction(tx))
          .then((zswapTx) =>
            Transaction.deserialize(
              zswapTx.serialize(getZswapNetworkId()),
              getLedgerNetworkId()
            )
          )
          .then(createBalancedTx);
      },
      submitTx(tx: any) {
        return wallet.submitTransaction(tx);
      },
    };

    // Configure providers
    const providers = MidnightProviders.create({
      contractName,
      walletProvider,
      networkConfig,
    });

    // Connect to contract
    const deployed: any = await findDeployedContract(providers, {
      contractAddress: deployment.contractAddress,
      contract: contractInstance,
    });

    console.log("✅ Connected to contract\n");

    // Main menu loop (health contract)
    let running = true;
    while (running) {
      console.log("--- Menu ---");
      console.log("1. Submit proof");
      console.log("2. Read activity sum");
      console.log("3. Read heart rate sum");
      console.log("4. Read goal count");
      console.log("5. Exit");

      const choice = await rl.question("\nYour choice: ");

      switch (choice) {
        case "1": {
          console.log("\nSubmitting proof...");
          const activityStr = await rl.question("Enter activity value (uint32): ");
          const heartStr = await rl.question("Enter heart rate value (uint32): ");
          try {
            const activityValue = BigInt(activityStr);
            const heartValue = BigInt(heartStr);
            const tx = await deployed.callTx.submitProof(activityValue, heartValue);
            console.log("✅ Success!");
            console.log(`Tx ID: ${tx.public.txId}`);
            console.log(`Block height: ${tx.public.blockHeight}\n`);
          } catch (error) {
            console.error("❌ Failed to submit proof:", error);
          }
          break;
        }

        case "2": {
          console.log("\nReading activity sum...");
          try {
            const state = await providers.publicDataProvider.queryContractState(
              deployment.contractAddress
            );
            if (state) {
              const ledger = HelloWorldModule.ledger(state.data);
              console.log(`📋 Activity sum: ${ledger.activitySum}\n`);
            } else {
              console.log("📋 No state found\n");
            }
          } catch (error) {
            console.error("❌ Failed to read activity sum:", error);
          }
          break;
        }

        case "3": {
          console.log("\nReading heart rate sum...");
          try {
            const state = await providers.publicDataProvider.queryContractState(
              deployment.contractAddress
            );
            if (state) {
              const ledger = HelloWorldModule.ledger(state.data);
              console.log(`📋 Heart rate sum: ${ledger.heartRateSum}\n`);
            } else {
              console.log("📋 No state found\n");
            }
          } catch (error) {
            console.error("❌ Failed to read heart rate sum:", error);
          }
          break;
        }

        case "4": {
          console.log("\nReading goal count...");
          try {
            const state = await providers.publicDataProvider.queryContractState(
              deployment.contractAddress
            );
            if (state) {
              const ledger = HelloWorldModule.ledger(state.data);
              console.log(`📋 Goal count: ${ledger.goalCount}\n`);
            } else {
              console.log("📋 No state found\n");
            }
          } catch (error) {
            console.error("❌ Failed to read goal count:", error);
          }
          break;
        }

        case "5":
          running = false;
          console.log("\n👋 Goodbye!");
          break;

        default:
          console.log("❌ Invalid choice. Please enter 1, 2, 3, 4, or 5.\n");
      }
    }

    // Clean up
    await wallet.close();
  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
