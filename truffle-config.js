const HDWalletProvider = require('truffle-hdwallet-provider')
const { readFileSync } = require('fs')
const path = require('path')

const dotenv = require('dotenv');
dotenv.config();

console.log(`MNEMONIC: ${process.env.MNEMONIC}`)
console.log(`INFURA_API_KEY: ${process.env.INFURA_API_KEY}`)

module.exports = {
  // Uncommenting the defaults below
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  //
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*"
    },
    ganache: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    },
    kovan: {
      provider: function () {
        const mnemonic = process.env.MNEMONIC;
        return new HDWalletProvider(mnemonic, `https://kovan.infura.io/v3/${process.env.INFURA_API_KEY}`, 0, 10)
      },
      network_id: 42,
      gas: 5000000,
      gasPrice: 25000000000,
      skipDryRun: true
    },
    mainnet: {
      provider: function () {
        const mnemonic = process.env.MNEMONIC;
        return new HDWalletProvider(mnemonic, `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`, 0, 10)
      },
      network_id: 1,
      gas: 5000000,
      gasPrice: 25000000000,
      skipDryRun: true
    }
  },
  compilers: {
    solc: {
      version: "0.6.6"
    }
  }
};
