import fs from "fs";
import path from "path";
import { ethers, upgrades } from "hardhat";

async function main() {
  const network = await ethers.provider.getNetwork();
  const deploymentsDir = path.resolve(__dirname, "../deployments");
  const infile = path.join(deploymentsDir, `${network.chainId}.json`);

  if (!fs.existsSync(infile)) {
    throw new Error(`No deployment found for chainId ${network.chainId}. Run scripts/deploy.ts first.`);
  }

  const { proxy } = JSON.parse(fs.readFileSync(infile, "utf8")) as { proxy: string };

  console.log(`Upgrading BettingHouse proxy at ${proxy} on chain ${network.chainId}...`);

  const BettingHouseVNext = await ethers.getContractFactory("BettingHouse");
  const upgraded = await upgrades.upgradeProxy(proxy as `0x${string}`, BettingHouseVNext);
  await upgraded.waitForDeployment();

  const newImpl = await upgrades.erc1967.getImplementationAddress(await upgraded.getAddress());
  console.log(`Upgraded implementation at: ${newImpl}`);

  // Save new implementation address back to deployments file
  const data = JSON.parse(fs.readFileSync(infile, "utf8")) as Record<string, unknown> & { implementation?: string };
  data.implementation = newImpl;
  data["upgradedAt"] = new Date().toISOString();
  fs.writeFileSync(infile, JSON.stringify(data, null, 2));
  console.log(`Updated ${infile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
