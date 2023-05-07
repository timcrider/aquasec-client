# Aqua Security REST Client

`@timcrider/aquasec-client` is a Node.js simple REST client for the Aqua Security API. Check the [official Aquasec documentation](https://docs.aquasec.com/docs) for specific endpoint information.

## Installation

```bash
$ npm i @timcrider/aqua-client
```

## Basic Usage

```js
(async () => {
  const {AquaClient, Credentials} = require('@timcrider/aqua-client');

  // Create Aqua rest client
  const client = new AquaClient('<Aqua URL>');

  // Create Aqua credentials
  const auth = new Credentials()store({
    id: '<Aqua User>',
    password: '<Aqua Password>',
    remember: true
  });

  // Login to Aqua
  await client.authenticate(auth);

  // Get registries
  let registries = await client.get('/api/v1/registries');
  console.log(JSON.stringify(registries, null, 2))

  // Get images
  let images = await client.get('/api/v1/images', {querystring: {registry: '<registry name>'}});
  console.log(JSON.stringify(images, null, 2))

})();

```

---
**Disclaimer:** This product is not associated with [Aqua Security](https://www.aquasec.com/).  It is a personal project that I am sharing with the community.  I am not responsible for any damages that may occur from the use of this software.  Please use at your own risk.