import { HardhatUserConfig, task } from "hardhat/config";
import "@typechain/hardhat";
import "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "hardhat-deploy";

import dotenv from "dotenv";
dotenv.config();

const TEST_HDWALLET = {
    mnemonic: "test test test test test test test test test test test junk",
    path: "m/44'/60'/0'/0",
    initialIndex: 0,
    count: 20,
    passphrase: "",
};

const accounts = process.env.PRIVATE_KEY_SEPOLIA
    ? [process.env.PRIVATE_KEY_SEPOLIA!, process.env.PRIVATE_KEY_BERA!]
    : TEST_HDWALLET;

const UNISWAP_SETTING = {
    version: "0.7.6",
    settings: {
        optimizer: {
            enabled: true,
            runs: 2_000,
        },
    },
};
const config: HardhatUserConfig = {
    paths: {
        artifacts: "artifacts",
        cache: "cache",
        deploy: "deploy",
        sources: "contracts",
        tests: "test",
    },
    namedAccounts: {
        deployer: {
            default: 0,
            80094: 1,
        },
        smartAccountOwner: 1,
        alice: 2,
        charlie: 3,
        sessionKey: 4,
    },
    solidity: {
        compilers: [
            {
                version: "0.8.24",
                settings: {
                    optimizer: { enabled: true, runs: 800 },
                    viaIR: true,
                    metadata: {
                        // do not include the metadata hash, since this is machine dependent
                        // and we want all generated code to be deterministic
                        // https://docs.soliditylang.org/en/v0.7.6/metadata.html
                        bytecodeHash: "none",
                    },
                },
            },
            {
                version: "0.7.0",
            },
            {
                version: "0.7.5",
            },
            {
                version: "0.7.6",
            },
            {
                version: "0.8.0",
            },
            UNISWAP_SETTING,
        ],
        overrides: {
            "@uniswap/v3-core/contracts/libraries/FullMath.sol": UNISWAP_SETTING,
            "@uniswap/v3-core/contracts/libraries/TickMath.sol": UNISWAP_SETTING,
            "@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol": UNISWAP_SETTING,
        },
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            accounts: TEST_HDWALLET,
            saveDeployments: true,
            deploy: ["deploy/hardhat"],
        },
        eth_sepolia: {
            url: process.env.RPC_ETH_SEPOLIA,
            accounts,
            saveDeployments: true,
            deploy: ["deploy/eth_sepolia"],
        },
        folked_bera: {
            tags: ["forked-bera"],
            url: "http://127.0.0.1:9001",
            accounts: TEST_HDWALLET,
            live: false,
            chainId: 31337,
            deploy: ["deploy/folked_bera"],
        },
        bera: {
            url: process.env.RPC_BERA,
            accounts,
            saveDeployments: true,
            deploy: ["deploy/bera"],
        },
    },
};

export default config;
