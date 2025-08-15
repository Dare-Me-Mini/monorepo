import fs from "fs";
import path from "path";
import { ethers } from "hardhat";

function getArg(name: string): string | undefined {
  const env = process.env[name] || process.env[name.toUpperCase()];
  if (env) return env;
  const flag = process.argv.findIndex((a) => a === `--${name}`);
  if (flag >= 0 && process.argv[flag + 1]) return process.argv[flag + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split("=")[1];
  return undefined;
}

async function main() {
  const network = await ethers.provider.getNetwork();
  const deploymentsDir = path.resolve(__dirname, "../../deployments");
  const infile = path.join(deploymentsDir, `${network.chainId}.json`);
  if (!fs.existsSync(infile)) throw new Error(`No deployment found at ${infile}`);
  const { proxy } = JSON.parse(fs.readFileSync(infile, "utf8")) as { proxy: string };

  const token = getArg("token") ?? process.env.TOKEN;
  if (!token) throw new Error("Missing --token=<address> or TOKEN env var");
  if (!/^0x[a-fA-F0-9]{40}$/.test(token)) throw new Error("Invalid token address");

  const signer = (await ethers.getSigners())[0];
  const bettingHouse = await ethers.getContractAt("BettingHouse", proxy, signer);
  const tx = await bettingHouse.removeSupportedToken(token as `0x${string}`);
  const receipt = await tx.wait();
  console.log(`Removed supported token ${token}. Tx: ${receipt?.hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


