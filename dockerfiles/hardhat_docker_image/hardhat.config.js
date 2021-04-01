const ENV = {
  INFURA = {
    ENDPOINTS = {
      RINKEBY: process.env.INFURA_ENDPOINT_RINKEBY,
    },
    SECRETS = {
      RINKEBY: (process.env.INFURA_SECRET_RINKEBY?.trim()?.length ?? 0) > 0 ? {
        RAW: process.env.INFURA_SECRET_RINKEBY,
        BASIC_AUTH: process.env.INFURA_SECRET_RINKEBY_BASIC_AUTH ?
          Buffer.from(`:${process.env.INFURA_SECRET_RINKEBY_BASIC_AUTH}`, "utf-8").toString("base64") :
          undefined,
      } : undefined,
    },
  },
  ACCOUNTS = {
    RINKEBY: process.env.ACCOUNT_KEY_RINKEBY,
  },
};

let rinkeby_network = undefined;
if (ENV.INFURA.ENDPOINTS.RINKEBY && ENV.INFURA.SECRETS.RINKEBY && ACCOUNT_KEY_RINKEBY) {
  rinkeby_network = {
    url: ENV.INFURA.ENDPOINTS.rinkeby,
    accounts: [ACCOUNT_KEY_RINKEBY],
    httpHeaders: { Authorization: `Basic ${INFURA_SECRET_RINKEBY_BASIC_AUTH}` },
  };
}

module.exports = {
  solc: {
    version: '0.6.8',
    optimizer: {enabled: true, runs: 200},
    evmVersion: 'istanbul',
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      hardfork: 'istanbul',
      blockGasLimit: 12000000,
      gas: 12000000,
      gasPrice: 8000000000,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true
    },
    ...(rinkeby_network ? { rinkeby: rinkeby_network } : {}),
  }
};

