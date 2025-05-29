# 🛠 Cypher - Blockchain Certificate Validator

Welcome to **Cypher**, a decentralized certificate issuance and validation platform built with blockchain, IPFS, and modern web technologies. This README documents the setup, progress, known bugs, and developer environment to help contributors get started quickly.

---

## 🚀 Project Progress

### ✅ Implemented So Far:
- Certificate creation and authentication (basic structure done; role-based admin/user separation **pending**).
- Certificate storage on **IPFS**.
- Certificate validation mechanism using smart contracts.
- Certificate display on the homepage upon user login.

---

## 🐞 Known Issues / Bugs

### 🔁 MetaMask Glitch
- **Issue:** You need to **enter wallet details twice** (including RPC URL).
- **Cause:** MetaMask sometimes fails to persist custom network connections.
- **Temporary Fix:** Use the following RPC configuration strictly and remove all other connections for stability.

### 🔧 Recommended RPC Setup for Ganache:
- **RPC URL:** `http://127.0.0.1:7545`
- **Network Name:** `LocalHost 8545` *(default name shown in MetaMask)*
- **Chain ID:** `1337`
- **Block Explorer URL:** *(leave empty)*

---

### 🔑 Ganache Wallet Import
- Copy-paste private key from Ganache and import directly into MetaMask.
- If **balance doesn’t appear**, ensure you're connected to the correct `localhost` network (details above).

---

## ⚙️ Required Environment Variables

Create a `.env` file at the root of your project and add the following variables:

```env
VITE_PINATA_API_KEY=<your_pinata_api_key>
VITE_PINATA_SECRET_API_KEY=<your_pinata_secret>
GANACHE_URL=http://127.0.0.1:7545
PRIVATE_KEY=<private_key_of_admin_wallet>
VITE_CONTRACT_ADDRESS=<deployed_smart_contract_address> (available in ganache contract address)
VITE_RPC_URL=http://127.0.0.1:7545
