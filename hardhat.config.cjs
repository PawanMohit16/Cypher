require("@nomiclabs/hardhat-ethers");

module.exports = {
  defaultNetwork: "ganache",
  networks: {
    ganache: {
      url: "http://127.0.0.1:7545/", // Ganache RPC URL
      accounts: [
        "0xb3d7c6fcddf4c0117cd6fdb81a2d1afadd9ee852ba098596d5e01460fdfd841a" 
      ]
    }
  },
  solidity: "0.8.28",
};