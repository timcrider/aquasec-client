# Aqua Security REST Client

`@timcrider/aquasec-client` is a Node.js simple REST client for the Aqua Security API. This client is not intended to be a complete implementation of the Aqua API, but rather a simple way to interact with the API using Node.js. This client bundles several useful features such as authentication, credentials management, and some quality of life improvements.

Check the [official Aquasec documentation](https://docs.aquasec.com/docs) for specific endpoint information.

## Basic Usage

```bash
$ npm i @timcrider/aqua-client
```

### Connecting to Aqua

```js
// Load the client and credentials classes
const {AquaClient, Credentials} = require('@timcrider/aqua-client');

// Create Aqua rest client using the Aqua instance URL
const client = new AquaClient('<Aqua URL>');

// Create authentication credentials object
const auth = new Credentials().store({
  id: '<Aqua User>',
  password: '<Aqua Password>',
  remember: true
});

// Login to Aqua and store the token in the client.
// This method also returns the token for use in other clients
await client.authenticate(auth);

// List all registries
let registries = await client.get('/api/v1/registries');
console.log(JSON.stringify(registries, null, 2))

```

### Environment Variables

| Variable | Description | Used By |
| --- | --- | --- |
| `AQUA_ID` | Aqua username | `Credentials` |
| `AQUA_PASSWORD` | Aqua password | `Credentials` |
| `AQUA_URL` | Aqua instance URL | `AquaClient` |

## Development

### VSCode DevContainer

[Visual Studio Code DevContainers](https://code.visualstudio.com/docs/devcontainers/containers) are supported.  Simply open the project in VSCode and select the "Reopen in Container" option.  This will build the container and open the project in the container.

### Uses Native Node Testing Framework

This project uses the native Node.js [testing framework](https://nodejs.org/docs/latest-v18.x/api/test.html).  To run the tests, use the following command:

```bash
$ npm run test
```

### Contributing

Contributions are welcome!  Please submit a pull request with your changes.

---
**Disclaimer:** This product is not associated with [Aqua Security](https://www.aquasec.com/).  It is a personal project that I am sharing with the community.  I am not responsible for any damages that may occur from the use of this software.  Please use at your own risk.