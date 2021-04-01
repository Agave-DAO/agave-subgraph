FROM node:alpine

WORKDIR /app
RUN npm i -g ganache-cli
EXPOSE 8545

CMD npx ganache-cli \
    --fork "${RPC_PROTOCOL:-https}://:$INFURA_SECRET@$RPC_ENDPOINT$INFURA_KEY$FORK_BLOCK_SPEC" \
    --port 8545 \
    --host 0.0.0.0
