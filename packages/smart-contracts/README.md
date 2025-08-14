# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```

## ABI generation for indexer

Generate ABIs into the indexer package:

```bash
bun hardhat run ./scripts/generate-abi
```

This compiles contracts and writes `BettingHouseAbi.ts` to `packages/indexer/abis/`.
