# EAS Service

## Running the standalone service

To run the service listening at a specific port (e.g. 4000), do:

```
yarn start 4000
```

## Using a .env file

You can configure environment variables for the service by creating a `.env` file in the root of your project. This file should contain the key-value pairs for your configuration:

- `PORT`: The port on which the service will run.
- `PRIVATE_KEY`: The signer (gas payer) private key.
- `LOOT_BOX_PK`: The loot box containing funds for the wallets.
- `OP_PROVIDER`: The RPC URL for the Optimism network.
- `SCHEMA`: The definiton of the attestation schema.
- `SCHEMA_UID`: The schema UID for the Optimism network.

## Using the service

### Publish an attestation

An example call to the service that will publish the attestation.

```
curl
-X POST
-H "Content-Type: application/json"
-d '{"userID":"0x1234","portOrCompanyName":"Porto de Santos","portOrCompanyCoordinates":["-23.9833","-46.3333"],"actionType":"Entrada","actionDate":"2021-07-01","actionCoordinates":["-23.9833","-46.3333"],"collectorName":"João","incomingMaterials":["Plástico"],"incomingWeightsKg":["100"],"incomingCodes":["123"],"outgoingMaterials":[""],"outgoingWeightsKg":[""],"outgoingCodes":[""],"productName":"Plástico","batchQuantity":"100","weightPerItemKg":"1"}'
http://localhost:3000/attest
```

### Check that the service is alive

```
curl http://localhost:3000/ping
```

## Deploying an AWS lambda.

Use the script `deploy` to package a ZIP file for the deployment of AWS lambda function.

Use the script `layer` to a package a ZIP file with the dependencies needed to run the lambda function.
