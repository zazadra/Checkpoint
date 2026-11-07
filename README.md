# WalSign 🦭✍️

> **Enterprise-grade decentralized document signing and verification platform built on Sui, powered by Tatum RPC and Walrus storage.**  
> Create multi-party signing requests, store documents securely on Walrus, and resolve addresses instantly via SuiNS (Sui Name Service).

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Sui](https://img.shields.io/badge/Sui-Mainnet-4DA2FF?logo=data:image/svg+xml;base64,PHN2Zy8+)](https://sui.io)
[![Walrus](https://img.shields.io/badge/Walrus-Storage-7C3AED)](https://walrus.xyz)
[![SuiNS](https://img.shields.io/badge/SuiNS-Domain_Service-blue)](https://suins.io)
[![Tatum Gateway](https://img.shields.io/badge/Tatum-Enterprise_RPC-teal)](https://tatum.io)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 💡 What is WalSign?

**WalSign** is a decentralized, cryptographically secure alternative to traditional doc-signing tools (like DocuSign or HelloSign). Instead of relying on central databases, PDFs and signature trails are fully recorded on-chain.

### 🌟 Key Features
- 🔒 **Tamper-Proof Storage** — Upload document PDFs or images directly to **Walrus** (decentralized blob storage).
- 🤝 **Multi-Party Signing Flow** — Define multiple designated signers for a document using their SUI addresses or **SuiNS domains** (e.g. `alice.sui`).
- ⚡ **Tatum Enterprise RPC** — High-performance, low-latency Sui Mainnet connection with guaranteed uptime and custom header authorization.
- 🏷️ **SuiNS Integration** — Resolve `.sui` domains instantly during signer input and display clean primary names on dashboard cards.
- 🛡️ **Zero-Wallet Public Verification** — Anyone can drop a file on the `/verify` page, calculate its SHA-256 hash in the browser, and match it against WalSign's Sui contract registry.

---

## 🏗️ Architecture

```
                 +-----------------------------------+
                 |           User Browser            |
                 +----+-------------------------+----+
                      |                         |
        [1] Upload Document Blob         [2] Sign & Create Request
                      |                         |
                      v                         v
           +---------------------+   +---------------------+
           |    Walrus Storage   |   |   Sui Blockchain    |
           |   (Blob ID Anchor)  |   | (SigningRequest Obj)|
           +---------------------+   +----------+----------+
                                                |
                                                | [3] Query Events & States
                                                v
                                     +---------------------+
                                     |  Tatum Sui Gateway  |
                                     +---------------------+
```

### Flow Breakdown:
1. **Document Upload**: Documents are securely registered on the **Walrus** decentralized storage network.
2. **On-chain Anchor**: The creator specifies the Walrus `blob_id`, the SHA-256 `document_hash`, and the list of designated signers. This initiates a shared `SigningRequest` object on Sui.
3. **Multi-Signatures**: Designated signers connect their wallets, load the document directly from Walrus, and call the Move contract `sign` method to append their signatures.
4. **Resolution**: All signers' addresses are cross-referenced dynamically via the **Sui Name Service (SuiNS)** client for enhanced clarity and verification.

---

## 🛠️ Tech Stack & Integration Details

| Layer | Integration | Detail |
|-------|-------------|--------|
| **Core Client** | Next.js 16 (Turbopack) | Fast, responsive App Router layout with elegant styling. |
| **RPC Gateway** | **Tatum Enterprise Sui Node** | Seamless integration via custom request headers with fallback gateways. |
| **Decentralized Storage** | **Walrus Mainnet** | Dynamic uploads and downloads using official `@mysten/walrus` SDK hooks. |
| **Domains Service** | **SuiNS (Sui Name Service)** | Bidirectional lookups (names to addresses, and addresses to primary `.sui` names). |
| **Move Contract** | **Sui Mainnet** | Shared-object architecture with real-time `SignatureEvent` tracking. |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- SUI CLI (optional, for deploying your own smart contract)
- A Sui Mainnet wallet (e.g., Sui Wallet, OKX Wallet) loaded with gas

### 1. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/zazadra/Walsign.git
cd Walsign
npm install
```

### 2. Configuration
Create a `.env.local` file in the root directory:
```env
# Tatum API Key — get a free key at https://dashboard.tatum.io
NEXT_PUBLIC_TATUM_API_KEY=your-tatum-api-key-here

# WalSign Move Package ID — update this after publishing:
NEXT_PUBLIC_WALSIGN_PACKAGE_ID=0xyour-move-package-id-here

# Network Config
NEXT_PUBLIC_SUI_NETWORK=mainnet
```

### 3. Move Contract Deployment
To publish the Move smart contract to Sui Mainnet:
```bash
cd move/walsign
sui client publish --gas-budget 100000000
```
Capture the **Package ID** from the transaction output and paste it into `NEXT_PUBLIC_WALSIGN_PACKAGE_ID` inside your `.env.local` file.

### 4. Running Locally
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 💻 Smart Contract Walkthrough

The smart contract is located at `move/walsign/sources/walsign.move`.

### Key Structs & Capabilities
- **`SigningRequest`**: The shared object holding the signature states.
  ```move
  struct SigningRequest has key, store {
      id: UID,
      creator: address,
      title: String,
      blob_id: String,
      document_hash: vector<u8>,
      required_signers: vector<address>,
      signed_by: vector<address>,
      created_at: u64,
      completed: bool,
      revoked: bool,
  }
  ```
- **`SignatureEvent`**: Emitted on every signature, enabling indexing off-chain.
  ```move
  struct SignatureEvent has copy, drop {
      request_id: ID,
      signer: address,
      blob_id: String,
      timestamp: u64,
  }
  ```

---

## 📁 Codebase Structure

```
walsign/
├── move/walsign/           # Sui Move smart contract
│   ├── Move.toml
│   └── sources/walsign.move
│
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── page.tsx        # Dynamic landing page with rich animations
│   │   ├── create/         # Document sign request creator UI
│   │   ├── sign/           # Interactive wallet signer interface
│   │   ├── verify/         # Decentralized, wallet-less file verification page
│   │   └── dashboard/      # Unified tracking dashboard (Sent & To Sign tabs)
│   │
│   ├── lib/                # Core Integration libraries
│   │   ├── tatum.ts        # Enterprise Tatum RPC client
│   │   ├── suins.ts        # SuiNS name & reverse-lookup client
│   │   ├── walsign.ts      # Move interaction layer (Tx builders & hash calculator)
│   │   └── walrus.ts       # Web3 storage integration helper
│   │
│   └── components/         # Premium UI Components
│       ├── Navbar.tsx      # Glassmorphic header with connect button
│       └── FeedbackCard.tsx
└── README.md
```

---

## 🤝 Contributing
Contributions are highly appreciated. Feel free to open issues or submit pull requests.

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
