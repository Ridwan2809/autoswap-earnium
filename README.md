# 🧪 Earnium Testnet DeFi Automation Script

Ini adalah skrip Node.js yang dirancang untuk mengotomatisasi interaksi dengan **Earnium DEX** di **Aptos Testnet**. Anda bisa menggunakannya untuk:

- ✅ Swap token
- ✅ Menambah / menarik likuiditas
- ✅ Klaim faucet testnet token
- ✅ Jalankan semua fungsi ini untuk banyak akun sekaligus

---

## 🖥️ Contoh Output Saat Menjalankan

███████╗  █████╗  ██████╗  ███╗   ██╗ ██╗ ██╗   ██╗ ███╗    ███╗
██╔════╝ ██╔══██╗ ██╔══██╗ ████╗  ██║ ██║ ██║   ██║ ████╗  ████║
█████╗   ███████║ ██████╔╝ ██╔██╗ ██║ ██║ ██║   ██║ ██╔██ ██╔██║
██╔══╝   ██╔══██║ ██╔══██╗ ██║╚██╗██║ ██║ ██║   ██║ ██║ ╚██╔╝██║
███████╗ ██║  ██║ ██║  ██║ ██║ ╚████║ ██║ ╚██████╔╝ ██║  ╚═╝ ██║
╚══════╝ ╚═╝  ╚═╝ ╚═╝  ╚═╝ ╚═╝  ╚═══╝ ╚═╝  ╚═════╝  ╚═╝      ╚═╝

by : WansNode || Telegram : https://t.me/Wansnode
Pilih mode:

Swap

Add Liquidity

Withdraw Liquidity

Claim Faucet (Testnet Coins: BTC, USDT, USDC)

yaml
Copy
Edit

---

## ⚙️ Fitur

- 🔄 **Swap Token:** Tukar berbagai pasangan token di Earnium DEX.
- 💧 **Tambah Likuiditas:** Sediakan likuiditas ke pool yang didukung.
- 🔓 **Tarik Likuiditas:** Tarik likuiditas yang telah Anda sediakan (proses dua langkah: unstake dan remove).
- 🎁 **Klaim Faucet:** Dapatkan token BTC, USDT, USDC dari faucet Earnium Testnet.
- 👥 **Dukungan Multi-Akun:** Jalankan semua aksi untuk beberapa akun secara otomatis.

---

## 📁 Struktur Berkas

autoswap-earnium/
├─ autoswap_earnium.js # Script utama
├─ keys.txt # Daftar private key (1 per baris)
├─ .env # Konfigurasi lingkungan
└─ package.json # Dependency Node.js

yaml
Copy
Edit

---

## 🚀 Instalasi

1. **Clone repositori:**

```bash
git clone https://github.com/Ridwan2809/autoswap-earnium.git
cd autoswap-earnium
Install dependency:

bash
Copy
Edit
npm install dotenv readline-sync @aptos-labs/ts-sdk
# atau gunakan yarn:
yarn add dotenv readline-sync @aptos-labs/ts-sdk
⚙️ Konfigurasi
Buat file .env di direktori root proyek Anda:

dotenv
Copy
Edit
FULLNODE_URL=https://fullnode.testnet.aptoslabs.com/v1

# (Opsional) nama file kunci selain keys.txt
# KEYS_FILE=my_keys.txt

# (Opsional) satu private key jika tidak pakai keys.txt
# PRIVATE_KEY=ed25519-priv-abc123...
▶️ Cara Menjalankan
bash
Copy
Edit
node autoswap_earnium.js
Skrip akan memandu Anda melalui:

Mode yang dipilih (Swap, Add Liquidity, Withdraw Liquidity, Faucet)

Pasangan token yang tersedia

Jumlah putaran per akun

⚠️ Catatan Penting
🧪 Testnet Only: Skrip ini dibuat untuk Aptos Testnet. Jangan gunakan private key dari mainnet!

🔐 Amanakan Private Key: Jangan upload keys.txt atau .env ke repositori publik.

📊 Slippage Rendah: MIN_OUT disetel ke 1n, artinya toleransi slippage sangat rendah. Ubah sesuai kebutuhan.

📦 LP Details Hardcoded: Nilai LP pool dan jumlah token LP saat ini hardcoded. Untuk produksi, ambil data ini secara dinamis dari blockchain.

🧪 Coba DApp Testnet: https://testnet.earnium.io?ref=L54VGO

🤝 Kontribusi
Kontribusi sangat terbuka! Jika kamu punya ide, fitur baru, atau perbaikan, silakan:

Buat Pull Request

Buka Issue di GitHub

❤️ Dibuat oleh
WansNode
📣 Telegram: https://t.me/Wansnode

## 📄 Lisensi

Proyek ini menggunakan lisensi **MIT**.  
Silakan lihat file [LICENSE](LICENSE) untuk informasi lengkap.# autoswap-earnium
