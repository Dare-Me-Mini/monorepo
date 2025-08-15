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

  const feesStr = getArg("fees") ?? getArg("feesBps");
  if (!feesStr) throw new Error("Missing --fees=<bps> or FEES env var");
  const feesBps = Number(feesStr);
  if (!Number.isInteger(feesBps) || feesBps < 0 || feesBps > 10000) {
    throw new Error("fees must be an integer between 0 and 10000 (basis points)");
  }

  const signer = (await ethers.getSigners())[0];
  const bettingHouse = await ethers.getContractAt("BettingHouse", proxy, signer);
  const tx = await bettingHouse.setFees(feesBps);
  const receipt = await tx.wait();
  console.log(`Set fees to ${feesBps} bps. Tx: ${receipt?.hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


