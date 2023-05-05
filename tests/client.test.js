const TestMeta = {
  name: 'AquaClient'
};
const common = require('./lib/common');
const testlog = common.testLog(TestMeta.name);

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const AquaClient = require('../src/aqua-client');
const LocalRestServer = require('../src/dev/localsrv');

// Test data
const TestCredentials = require('./data/test-credentials.json');

// Test client
const client = new AquaClient({instance: 'https://localhost:3000'});

describe('Aquasec local mock api server.', () => {
  let localsrv = new LocalRestServer();

  before(async () => {
    console.log('Local backend server starting.');
    await localsrv.start();
    console.log('Local backend server started.')
  });

  it(testlog('Checking setting token'), (t) => {
    client.setToken(TestCredentials.token);
  });

  it(testlog('Checking encrypted token matches test token'), (t) => {
    assert.deepEqual(client._token.fetch(), TestCredentials.token);
  });

  it(testlog('Testing express binding'), async (t) => {
    // hit the main endpoint and ensure we got a thing
    console.log(testlog('Checking root endpoint for a valid rest server', 'local-rest-server'));
    let x = await client.request('/', {method: 'GET', querystring: {page: 1, limit: 10}});
    assert.deepEqual(x, {message: 'Hello World!', ok: true, foo: 'bar'});

    // hit the main endpoint using the get method and ensure we got a thing
    console.log(testlog('Checking root endpoint for a valid rest server using GET method', 'local-rest-server'));
    x = await client.get('/', {querystring: {page: 1, limit: 10}});
    assert.deepEqual(x, {message: 'Hello World!', ok: true, foo: 'bar'});

    // hit the /post endpoint using the post method and ensure we got a thing
    console.log(testlog('Checking /post endpoint for a valid rest server using POST method', 'local-rest-server'));
    x = await client.post('/post', { body: {foo: 'bar'}});
    assert.deepEqual(x, {message: 'Hello World!', ok: true, foo: 'bar', body: {foo: 'bar'}});
  });

  after(async () => {
    console.log('Local backend server stopping.');
    await localsrv.stop();
    console.log('Local backend server stopped.');
  });
});
