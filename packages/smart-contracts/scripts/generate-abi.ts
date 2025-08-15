import fs from "fs";
import path from "path";
import { artifacts } from "hardhat";

async function main() {
  const { run } = await import("hardhat");
  await run("compile");

  const bettingHouse = await artifacts.readArtifact("BettingHouse");

  // From packages/smart-contracts/scripts -> up 3 levels to packages/, then indexer/abis
  const indexerAbisDir = path.resolve(__dirname, "../../indexer/abis");
  if (!fs.existsSync(indexerAbisDir)) {
    fs.mkdirSync(indexerAbisDir, { recursive: true });
  }
    
  const miniAppAbisDir = path.resolve(__dirname, "../../mini-app/abis");
  if (!fs.existsSync(miniAppAbisDir)) {
    fs.mkdirSync(miniAppAbisDir, {recursive: true});
  }

  const tsContent = `export const BettingHouseAbi = ${JSON.stringify(
    bettingHouse.abi,
    null,
    2
  )} as const;\n`;

  fs.writeFileSync(path.join(indexerAbisDir, "BettingHouseAbi.ts"), tsContent, "utf8");
  fs.writeFileSync(path.join(miniAppAbisDir, "BettingHouseAbi.ts"), tsContent, "utf8");

  console.log(`Wrote BettingHouseAbi.ts to ${path.join(indexerAbisDir, "BettingHouseAbi.ts")}`);
  console.log(`Wrote BettingHouseAbi.ts to ${path.join(miniAppAbisDir, "BettingHouseAbi.ts")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


