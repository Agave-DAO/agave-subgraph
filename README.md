# Subgraph for Aave Protocol V2

## Development

```bash
# copy env and adjust its content
# you can get an access token from https://thegraph.com/explorer/dashboard
cp .env.test .env
# install project dependencies
npm i
# fetch current contracts as submodule
npm run prepare:all
# run codegen
npm run subgraph:codegen
# now you're able to deploy to thegraph via
npm run deploy:hosted:mainnet

```

## Deployment

To be able to deploy the subgraph in any environment for any network first we will need to prepare the local env:

- get the protocol v2 contracts and compile them

```
npm run prepare:contracts
```

### Self-hosted

- The first time you will deploy the subgraph you need to first create it in the TheGraph node:

```
// For Kovan:
npm run subgraph:create:self-hosted:kovan

// for Mainnet
npm run subgraph:create:self-hosted:mainnet
```

- Before any deployment you need to generate the types and schemas:

```
npm run subgraph:codegen
```

- When / If the subgraph is created you can then deploy

```
// For Kovan:
  npm run deploy:self-hosted:kovan

// For Mainnet:
  npm run deploy:self-hosted:mainnet
```

### Hosted

To be able to deploy to the hosted solution you will need to create a .env file and add `ACCESS_TOKEN` environment variable. You can find this in the dashboard of the TheGraph

```
// For Kovan:
npm run deploy:hosted:kovan

// For Mainnet:
npm run deploy:hosted:mainnet
```

### Local

TODO:

- refactor get addresses after local deployment
- refactor npm scripts

1. Start docker environment for a buidler node and TheGraph infrastructure:

```
# deletes prior images to clear the cached postgres output; see note below
docker-compose down -v && docker-compose up -V
```

Remember that before runing `docker-compose up` you need to run `docker-compose down` if it is not the first time. That is because the postgres database needs to not be persistant, so we need to delete the docker volumes.

2. Deploy local subgraph:

```
# run this from within the subgraph repo root
graph create --node http://localhost:8020 agave/protocol-v2 \
  && graph deploy --node http://localhost:8020 --ipfs http://127.0.0.1:5001 agave/protocol-v2 ./subgraph.yaml
```

3. To check or query the subgraph use:

You can run `docker-compose logs -f graph-node` in another terminal to see the graph-node outputs,
since the main compose terminal outputs get cluttered by hardhat debug outputs.

```
Queries (HTTP):     http://localhost:8000/subgraphs/name/aave/migrator
Subscriptions (WS): http://localhost:8001/subgraphs/name/aave/migrator

INFO Starting JSON-RPC admin server at: http://localhost:8020, component: JsonRpcServer
INFO Starting GraphQL HTTP server at: http://localhost:8000, component: GraphQLServer
INFO Starting index node server at: http://localhost:8030, component: IndexNodeServer
INFO Starting GraphQL WebSocket server at: ws://localhost:8001, component: SubscriptionServer
INFO Starting metrics server at: http://localhost:8040, component: MetricsServer

```
