const TestMeta = {
  name: 'AquaClient'
};
const common = require('./lib/common');
const testlog = common.testLog(TestMeta.name);

const test = require('node:test');
const assert = require('node:assert/strict');
const AquaClient = require('../src/aqua-client');
const LocalRestServer = require('../src/dev/localsrv');

// Test data
const TestCredentials = require('./data/test-credentials.json');

// Test client
const client = new AquaClient({instance: 'https://localhost:3000'});

// Default tests

test(testlog('Checking setting token'), (t) => {
  client.setToken(TestCredentials.token);
});

test(testlog('Checking encrypted token matches test token'), (t) => {
  assert.deepEqual(client._token.fetch(), TestCredentials.token);
});

test(testlog('Testing express binding'), async (t) => {
  let localsrv = new LocalRestServer();

  // start local web server
  console.log(testlog(`Starting local server...`, 'local-rest-server'));
  await localsrv.start();

  // hit the main endpoint and ensure we got a thing
  console.log(testlog('Checking root endpoint for a valid rest server', 'local-rest-server'));
  let x = await client.request({method: 'GET', endpoint: '/', querystring: {page: 1, limit: 10}});
  assert.deepEqual(x, {message: 'Hello World!', ok: true, foo: 'bar'});

  // hit the main endpoint using the get method and ensure we got a thing
  console.log(testlog('Checking root endpoint for a valid rest server using GET method', 'local-rest-server'));
  x = await client.get({endpoint: '/', querystring: {page: 1, limit: 10}});
  assert.deepEqual(x, {message: 'Hello World!', ok: true, foo: 'bar'});

  // hit the /post endpoint using the post method and ensure we got a thing
  console.log(testlog('Checking /post endpoint for a valid rest server using POST method', 'local-rest-server'));
  x = await client.post({endpoint: '/post', body: {foo: 'bar'}});
  assert.deepEqual(x, {message: 'Hello World!', ok: true, foo: 'bar', body: {foo: 'bar'}});

  // stop local web server
  console.log(testlog(`Stopping local server...`, 'local-rest-server'));
  localsrv.stop();
});