FROM node:alpine

WORKDIR /app
COPY hardhat.config.js /app/hardhat.config.js
RUN npm i hardhat
EXPOSE 8545

CMD npx hardhat --config ./hardhat.config.js --network hardhat node --hostname 0.0.0.0 --port 8545
