// autoswap_earnium.js - Script Otomatisasi DeFi Earnium Testnet
require('dotenv').config();
const fs = require('fs');
const readline = require('readline-sync');
const {
    Aptos,
    AptosConfig,
    Network,
    Account,
    Ed25519PrivateKey,
    AccountAddress,
} = require('@aptos-labs/ts-sdk');

const FULLNODE_URL = process.env.FULLNODE_URL || 'https://fullnode.testnet.aptoslabs.com/v1';
const ROUTER_ADDRESS = '0xd5ee59267fe627f12ab4cac246e7d683e65b5d4745660feecf63f1bb0a842a65';
const ROUTER_MODULE = 'router';
const LIQUIDITY_STAKE_POOL_MODULE = 'liquidity_stake_pool';

// Nama fungsi untuk transaksi
const FN_SWAP_APT_IN = 'swap_route_entry_from_coin';
const FN_SWAP_TOKEN_IN = 'swap_route_entry';
const FN_ADD_LIQ_COIN_ENTRY = 'add_liquidity_coin_entry';
const FN_ADD_LIQ_ENTRY = 'add_liquidity_entry';

// Fungsi Withdraw Liquidity (Dua Langkah)
const FN_UNSTAKE = 'unstake';
const FN_REMOVE_LIQ_ENTRY = 'remove_liquidity_entry';
const FN_REMOVE_LIQ_COIN_ENTRY = 'remove_liquidity_coin_entry';

// Konstanta Faucet
const FAUCET_MANAGER_ADDRESS = '0xf46c908924df959df593d7d2f54a00069f6af25f7d1002bfa81c7e653951b32a';
const FAUCET_MANAGER_MODULE = 'token_manager';
const FAUCET_COIN_SYMBOLS_TO_CLAIM = ['BTC', 'USDt', 'USDC'];
const FAUCET_COIN_AMOUNTS_TO_CLAIM = [9176n, 10_000_000n, 10_000_000n];

// Definisi COINS
const COINS = {
    APT: { type: '0x1::aptos_coin::AptosCoin', address: '0x000000000000000000000000000000000000000000000000000000000000000a' },
    BTC: { type: '0xf46c908924df959df593d7d2f54a00069f6af25f7d1002bfa81c7e653951b32a::coin_manager::BTC', address: '0x4542f1d345eefab73e2bb95a7af7e3d93c5730160c48e9f793fcad24e84aa396' },
    USDT: { type: '0x9b440b91089cceeadc1ad4765720d88efd1cdfa69fc21feb3edafe6af42131e2::coin::T', address: '0x9b440b91089cceeadc1ad4765720d88efd1cdfa69fc21feb3edafe6af42131e2' },
    USDt: { type: '0x9b440b91089cceeadc1ad4765720d88efd1cdfa69fc21feb3edafe6af42131e2::coin::T', address: '0x9b440b91089cceeadc1ad4765720d88efd1cdfa69fc21feb3edafe6af42131e2' },
    USDC: { type: '0xeb228470268091d369809d22a71dbd8c23c7da7b17a3a345709ae101451691f0::coin::T', address: '0xeb228470268091d369809d22a71dbd8c23c7da7b17a3a345709ae101451691f0' }
};

// Jumlah likuiditas default per pasangan
const LIQ_AMT_PAIR = {
    'APT/USDT': {
        [COINS.APT.type]: 100_000n,
        [COINS.USDT.type]: 8_084n,
    },
    'USDT/USDC': {
        [COINS.USDT.type]: 10_000n,
        [COINS.USDC.type]: 5_508n,
    },
    'BTC/USDT': {
        [COINS.BTC.type]: 10n,
        [COINS.USDT.type]: 10_710n,
    }
};

// Jumlah default untuk swap
const SWAP_AMT = {
    [COINS.APT.type]:    1_000_000n,
    [COINS.USDT.type]: 1_000n,
    [COINS.USDC.type]: 1_000n,
    [COINS.BTC.type]:    10n
};

const MIN_OUT = 1n; // Minimum jumlah output yang diharapkan
const REFERRER_ADDRESS = '0xb8cf167820fec685007b9b7afcdef2cf6a5e78cc46a551af76cd14255909b95d';

// Detail LP hardcoded untuk penarikan (untuk demo)
// Catatan: Dalam aplikasi sungguhan, nilai-nilai ini harus diambil secara dinamis.
const LP_DETAILS_FOR_WITHDRAWAL = {
    'BTC/USDT': {
        poolId: '0x79e872588fe400f85d75484ec02d5739cf9e3ca19fe5a8e5b608c6694c574e4',
        unstakeLpAmount: 580n,
        removeLpAmount: 72n,
    },
    'APT/USDT': {
        poolId: '0x8bfa8776c0315ba1be0c0eea904af6fbf03069a7fc1573e7c68141f923df5d95',
        unstakeLpAmount: 529394n,
        removeLpAmount: 32425n,
    },
    'USDT/USDC': {
        poolId: '0x11a75e6020064c475cb787936adf1c756d51df1f55872bfb5f9d691ecfb52a76',
        unstakeLpAmount: 2891n,
        removeLpAmount: 651n,
    },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hexToBytes = (hex) => Buffer.from(hex.replace(/^0x/, ''), 'hex');
const addrOfType = (t) => t.split('::')[0];

const PAIRS = [
    ['APT', 'USDT'],
    ['USDT', 'USDC'],
    ['BTC', 'USDT'],
];

async function submitTx(aptos, account, payload) {
    const tx = await aptos.transaction.build.simple({ sender: account.accountAddress, data: payload });
    const pending = await aptos.signAndSubmitTransaction({ signer: account, transaction: tx });
    console.log('    → Transaksi terkirim:', pending.hash);
    await aptos.waitForTransaction({ transactionHash: pending.hash });
    console.log('    ✓ Berhasil dikonfirmasi!');
}

async function addLiquidity({ aptos, account, coinX, coinY }) {
    console.log(`  Mencoba menambahkan likuiditas untuk ${coinX}/${coinY}...`);
    
    let payload;
    const pairKey = `${coinX}/${coinY}`;
    const amountX = LIQ_AMT_PAIR[pairKey][COINS[coinX].type].toString();
    const amountY = LIQ_AMT_PAIR[pairKey][COINS[coinY].type].toString();

    if (coinX === 'APT' || coinX === 'BTC') {
        payload = {
            function: `${ROUTER_ADDRESS}::${ROUTER_MODULE}::${FN_ADD_LIQ_COIN_ENTRY}`,
            typeArguments: [COINS[coinX].type],
            functionArguments: [
                COINS[coinY].address,
                false,
                amountX,
                amountY,
            ],
        };
    } else {
        payload = {
            function: `${ROUTER_ADDRESS}::${ROUTER_MODULE}::${FN_ADD_LIQ_ENTRY}`,
            typeArguments: [],
            functionArguments: [
                COINS[coinX].address,
                COINS[coinY].address,
                false,
                amountX,
                amountY,
            ],
        };
    }
    await submitTx(aptos, account, payload);
}

async function withdrawLiquidity({ aptos, account, coinX, coinY, round }) {
    console.log(`  Mencoba menarik likuiditas untuk ${coinX}/${coinY} (Putaran ke-${round})...`);

    const senderAddress = account.accountAddress.toString();
    let unstakePayload;
    let removePayload;

    const pairKey = `${coinX}/${coinY}`;
    const lpDetails = LP_DETAILS_FOR_WITHDRAWAL[pairKey];

    if (!lpDetails) {
        console.error(`⚠️ Gagal: Detail LP untuk ${pairKey} belum ada. Pastikan LP_DETAILS_FOR_WITHDRAWAL sudah diisi atau ambil data secara dinamis.`);
        throw new Error('Detail LP tidak ditemukan.');
    }

    const { poolId, unstakeLpAmount, removeLpAmount } = lpDetails;

    // Langkah 1: Unstake Liquidity
    unstakePayload = {
        function: `${ROUTER_ADDRESS}::${LIQUIDITY_STAKE_POOL_MODULE}::${FN_UNSTAKE}`,
        typeArguments: [],
        functionArguments: [
            poolId,
            unstakeLpAmount.toString(),
        ],
    };

    console.log('  -> Melakukan unstake...');
    await submitTx(aptos, account, unstakePayload);

    // Langkah 2: Remove Liquidity
    const minAmountX = 0n; // Jumlah minimum koin X yang diharapkan
    const minAmountY = 0n; // Jumlah minimum koin Y yang diharapkan

    removePayload = {
        function: `${ROUTER_ADDRESS}::${ROUTER_MODULE}::${FN_REMOVE_LIQ_ENTRY}`,
        typeArguments: [],
        functionArguments: [
            COINS[coinX].address,
            COINS[coinY].address,
            false,
            removeLpAmount.toString(),
            minAmountX.toString(),
            minAmountY.toString(),
            senderAddress,
        ],
    };

    console.log('  -> Melepas likuiditas...');
    await submitTx(aptos, account, removePayload);
    console.log(`  ✓ Likuiditas ${coinX}/${coinY} berhasil ditarik!`);
}

async function executeSwap({ aptos, account, coinX, coinY, swapAmount }) {
    console.log(`  Mencoba menukar ${coinX} ke ${coinY} sejumlah ${swapAmount.toString()}...`);

    const senderAddress = account.accountAddress.toString();
    let payload;

    if (coinX === 'APT' || coinX === 'BTC') {
        payload = {
            function: `${ROUTER_ADDRESS}::${ROUTER_MODULE}::${FN_SWAP_APT_IN}`,
            typeArguments: [COINS[coinX].type],
            functionArguments: [
                swapAmount.toString(),
                MIN_OUT.toString(),
                [COINS[coinY].address],
                [false],
                senderAddress,
                REFERRER_ADDRESS,
            ],
        };
    } else {
        payload = {
            function: `${ROUTER_ADDRESS}::${ROUTER_MODULE}::${FN_SWAP_TOKEN_IN}`,
            typeArguments: [],
            functionArguments: [
                swapAmount.toString(),
                MIN_OUT.toString(),
                COINS[coinX].address,
                [COINS[coinY].address],
                [false],
                senderAddress,
                REFERRER_ADDRESS,
            ],
        };
    }
    await submitTx(aptos, account, payload);
}

async function claimTestnetCoinsFaucet({ aptos, account }) {
    console.log(`  Mencoba klaim BTC, USDT, USDC dari faucet Earnium untuk akun: ${account.accountAddress.toString()}...`);
    const payload = {
        function: `${FAUCET_MANAGER_ADDRESS}::${FAUCET_MANAGER_MODULE}::faucet_multiple`,
        typeArguments: [],
        functionArguments: [
            account.accountAddress.toString(),
            FAUCET_COIN_SYMBOLS_TO_CLAIM,
            FAUCET_COIN_AMOUNTS_TO_CLAIM.map(amount => amount.toString()),
        ],
    };

    try {
        await submitTx(aptos, account, payload);
        console.log(`  ✓ Klaim Testnet Coins berhasil untuk ${account.accountAddress.toString()}!`);
    } catch (err) {
        console.error(`  ⚠️ Gagal klaim Testnet Coins untuk ${account.accountAddress.toString()}:`, err.message || err);
    }
}

async function executeForAccount({ aptos, account, mode, pairIdx, rounds }) {
    let coinX, coinY;
    if (mode !== 'faucet_testnet_coins') {
        [coinX, coinY] = PAIRS[pairIdx];
        console.log(`\n===============================\nAkun: ${account.accountAddress.toString()}\nPasangan: ${coinX}/${coinY} | Putaran: ${rounds} | Mode: ${mode.toUpperCase()}\n===============================`);
    } else {
        console.log(`\n===============================\nAkun: ${account.accountAddress.toString()}\nMode: ${mode.toUpperCase()}\n===============================`);
    }

    for (let i = 1; i <= rounds; i++) {
        console.log(`\n🔁 Putaran ke-${i}`);
        try {
            if (mode === 'add') {
                await addLiquidity({ aptos, account, coinX, coinY });
            } else if (mode === 'withdraw') {
                await withdrawLiquidity({ aptos, account, coinX, coinY, round: i });
            } else if (mode === 'swap') {
                const swapAmount = SWAP_AMT[COINS[coinX].type];
                if (!swapAmount) {
                    console.error(`⚠️  Error: SWAP_AMT tidak didefinisikan untuk ${coinX}.`);
                    continue;
                }
                await executeSwap({ aptos, account, coinX, coinY, swapAmount });
            } else if (mode === 'faucet_testnet_coins') {
                await claimTestnetCoinsFaucet({ aptos, account });
            }
        } catch (err) {
            console.error('⚠️ Terjadi masalah pada akun ini:', err.message || err);
        }
        await sleep(3000);
    }
}

function sanitizeKey(line) {
    const trimmed = line.trim();
    return trimmed.startsWith('ed25519-priv-') ? trimmed.replace('ed25519-priv-', '') : trimmed;
}

function loadKeys() {
    const path = process.env.KEYS_FILE || 'keys.txt';
    if (fs.existsSync(path)) {
        const content = fs.readFileSync(path, 'utf8');
        return content
            .split(/\r?\n/)
            .map(sanitizeKey)
            .filter(Boolean);
    }
    if (process.env.PRIVATE_KEY) return [sanitizeKey(process.env.PRIVATE_KEY)];
    console.error('Ups! File keys.txt tidak ditemukan atau PRIVATE_KEY di .env belum diatur.');
    process.exit(1);
}

// Blok eksekusi utama
(async () => {
    const keys = loadKeys();
    const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET, fullnode: FULLNODE_URL }));

//--- ASCII Art Banner ---
    //BANNER = """
    console.log('');
    console.log('███████╗  █████╗  ██████╗  ███╗   ██╗ ██╗ ██╗   ██╗ ███╗   ███╗');
    console.log('██╔════╝ ██╔══██╗ ██╔══██╗ ████╗  ██║ ██║ ██║   ██║ ████╗ ████║');
    console.log('█████╗   ███████║ ██████╔╝ ██╔██╗ ██║ ██║ ██║   ██║ ██╔████╔██║');
    console.log('██╔══╝   ██╔══██║ ██╔══██╗ ██║╚██╗██║ ██║ ██║   ██║ ██║╚██╔╝██║');
    console.log('███████╗ ██║  ██║ ██║  ██║ ██║ ╚████║ ██║ ╚██████╔╝ ██║ ╚═╝ ██║');
    console.log('╚══════╝ ╚═╝  ╚═╝ ╚═╝  ╚═╝ ╚═╝  ╚═══╝ ╚═╝  ╚═════╝  ╚═╝     ╚═╝');
    console.log('');
    console.log('by : WansNode || Telegram : https://t.me/Wansnode');
    console.log('--------------------------------------------------');


    const modeChoice = readline.question('\nPilih mode:\n  1) Swap\n  2) Add Liquidity\n  3) Withdraw Liquidity\n  4) Claim Faucet (Testnet Coins: BTC, USDT, USDC)\n> ');
    const mode = modeChoice.trim() === '1' ? 'swap' :
                 modeChoice.trim() === '2' ? 'add' :
                 modeChoice.trim() === '3' ? 'withdraw' :
                 modeChoice.trim() === '4' ? 'faucet_testnet_coins' : 'invalid';

    if (mode === 'invalid') {
        console.error('Pilihan mode tidak valid. Harap masukkan 1, 2, 3, atau 4.');
        process.exit(1);
    }

    let pairIdx = -1;
    if (mode !== 'faucet_testnet_coins') {
        console.log('\nPilih pair:');
        PAIRS.forEach((p, i) => console.log(`  ${i + 1}) ${p[0]}/${p[1]}`));
        pairIdx = parseInt(readline.question('> '), 10) - 1;
        
        if (isNaN(pairIdx) || pairIdx < 0 || pairIdx >= PAIRS.length) {
            console.error('Pilihan pair tidak valid. Harap masukkan angka yang sesuai.');
            process.exit(1);
        }
    }

    const rounds = parseInt(readline.question(`Berapa kali ${mode.replace('_', ' ')} per akun? (default 1): `), 10) || 1;

    console.log(`\n▶️  Memulai ${mode.toUpperCase()} ${mode.startsWith('faucet') ? '' : PAIRS[pairIdx][0] + '/' + PAIRS[pairIdx][1]} sebanyak ${rounds} putaran untuk ${keys.length} akun…`);

    for (const [idx, pk] of keys.entries()) {
        const account = Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(hexToBytes(pk)) });
        console.log(`\n=== [${idx + 1}/${keys.length}] ${account.accountAddress} ===`);
        await executeForAccount({ aptos, account, mode, pairIdx, rounds });
        if (idx !== keys.length - 1) await sleep(1000);
    }

    console.log('\n✅ Semua akun selesai diproses!');
})();
