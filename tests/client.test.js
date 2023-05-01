const TestMeta = {
  name: 'AquaClient'
};
const test = require('node:test');
const assert = require('node:assert/strict');
const AquaClient = require('../src/aqua-client');

// Test data
const TestCredentials = require('./data/test-credentials.json');

// Test client
const client = new AquaClient();

// Default tests

test(`(${TestMeta.name}) Checking setting token`, (t) => {
  client.setToken(TestCredentials.token);
});

test(`(${TestMeta.name}) Checking encrypted token matches test token`, (t) => {
  assert.deepEqual(client._token.fetch(), TestCredentials.token);
});
