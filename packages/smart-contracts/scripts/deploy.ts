import fs from "fs";
import path from "path";
import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log(`Deploying BettingHouse with account: ${deployer.address}`);
  console.log(`Network: ${network.name} (${network.chainId})`);

  const BettingHouse = await ethers.getContractFactory("BettingHouse");

  const proxy = await upgrades.deployProxy(BettingHouse, [], { kind: "uups" });
  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log(`Proxy deployed at: ${proxyAddress}`);
  console.log(`Implementation at: ${implAddress}`);

  // Get deployment transaction details
  const deploymentTx = proxy.deploymentTransaction();
  const deploymentBlock = deploymentTx ? await deploymentTx.wait() : null;

  // Persist addresses under deployments/<chainId>.json
  const deploymentsDir = path.resolve(__dirname, "../deployments");
  const outfile = path.join(deploymentsDir, `${network.chainId}.json`);
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });
  const payload = {
    chainId: Number(network.chainId),
    network: network.name,
    proxy: proxyAddress,
    implementation: implAddress,
    deployedBy: deployer.address,
    timestamp: new Date().toISOString(),
    deploymentBlock: deploymentBlock?.blockNumber || null,
  } as const;
  fs.writeFileSync(outfile, JSON.stringify(payload, null, 2));
  console.log(`Saved deployment to ${outfile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
