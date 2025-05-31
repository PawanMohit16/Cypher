const hre = require("hardhat");

async function main() {
  const CertVault = await hre.ethers.getContractFactory("CertVault");
  const certVault = await CertVault.deploy();
  await certVault.deployed();

  console.log("CertVault deployed to:", certVault.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});