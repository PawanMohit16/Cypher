# 🔐 Cypher - Blockchain Certificate Validator

Welcome to **Cypher**, a decentralized platform for issuing and validating certificates using blockchain and IPFS. Cypher ensures secure, tamper-proof certification by combining smart contracts, IPFS storage, and modern Web3 technologies.

---

## ⚡️ Getting Started

Follow these steps to set up and run Cypher locally:

### 1. Clone the Repository

```bash
git clone https://github.com/Dipesh-Dubey/cypher-certify-flow.git
cd cypher
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create `.env` File

At the root of your project, create a `.env` file and add the following environment variables:

```env
VITE_PINATA_API_KEY=<your_pinata_api_key>
VITE_PINATA_SECRET_API_KEY=<your_pinata_secret>
GANACHE_URL=http://127.0.0.1:7545
PRIVATE_KEY=<private_key_of_admin_wallet>
VITE_CONTRACT_ADDRESS=<deployed_smart_contract_address>
VITE_RPC_URL=http://127.0.0.1:7545
```

### 4. Run Ganache

- Open Ganache and start a new workspace or quickstart project.
- Ensure it's running on `http://127.0.0.1:7545`.
- Use one of the accounts' private keys for MetaMask.

### 5. Configure MetaMask

- Import an account from Ganache using its private key.
- Add a custom network with the following details:
  - **Network Name:** LocalHost 8545 *(default label)*
  - **RPC URL:** `http://127.0.0.1:7545`
  - **Chain ID:** `1337`
  - **Block Explorer URL:** *(leave blank)*

> 💡 If the wallet balance doesn’t show up, reconnect MetaMask to `localhost` using the above RPC settings and re-import.

### 6. Ensure External Services Are Running

- ✅ **Pinata**: Must be accessible (currently runs best from Mehul's PC).
- ✅ **Firebase**: Confirm Firebase services are properly initialized.

---

## 🚀 Project Progress

### ✅ Features Implemented:
- Certificate creation and blockchain-based authentication.
- Storage of certificates on **IPFS**.
- Validation of certificates using smart contracts.
- Display of user-issued certificates on the homepage post-login.

> 🚧 Role-based access control (admin vs. user) is **pending** implementation.

---

## 🐞 Known Issues / Bugs

### 🔁 MetaMask Glitch
- **Problem:** Wallet details (including RPC URL) need to be entered **twice** sometimes.
- **Cause:** MetaMask may fail to persist custom network data.
- **Workaround:** Use only the `localhost:7545` connection and **remove all other networks** in MetaMask.

---

## 📦 Recommended RPC Setup for MetaMask + Ganache

| Parameter          | Value                    |
|--------------------|--------------------------|
| **RPC URL**        | `http://127.0.0.1:7545`  |
| **Network Name**   | `LocalHost 8545`         |
| **Chain ID**       | `1337`                   |
| **Block Explorer** | *(leave empty)*          |

---

## 🛠 Developer Notes

- Always clear unnecessary MetaMask connections to avoid network issues.
- Keep `.env` values up to date with contract and account changes.
- Only use the Ganache testnet (`localhost:7545`) for consistent behavior.
- Use `npm run dev` to start the frontend locally.

---

## 📌 To-Do (Upcoming Features)

- [ ] Proper role-based separation between admin and users.
- [ ] Better MetaMask connection handling.
- [ ] UI enhancements for the certificate dashboard.
- [ ] Deployment to Polygon Mumbai or another public testnet.

---

## 🙋‍♂️ Questions?

For issues with Pinata access or Firebase setup, contact us.

---

> Made by the Cypher Team.
#