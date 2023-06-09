const TestMeta = {
  name: `Credentials`
};
const common = require('./lib/common');
const testlog = common.testLog(TestMeta.name);

const { describe, it } = require('node:test');
const assert = require(`node:assert/strict`);
const crypto = require(`crypto`);
const Credentials = require(`../src/credentials`);

// Test data
const TestCredentials = require(`./data/test-credentials.json`);

// Test credentials
const credentials = new Credentials();
const aes192Credentials = new Credentials(`aes192`, crypto.randomBytes(24));

describe('Testing default credentials encryption', () => {
  it(testlog('Encrypting test credentials', 'default'), (t) => {
    credentials.store(TestCredentials);
  });

  it(testlog('Checking encrypted credentials are encrypted', 'default'), (t) => {
    assert.notDeepEqual(credentials._encrypted, TestCredentials, `Credentials are not the same`);
  });

  it(testlog('Checking decrypted credentials are decrypted', 'default'), (t) => {
    assert.deepEqual(credentials.fetch(), TestCredentials);
  });
});

// AES192 tests
describe('Testing AES192 credentials encryption', () => {

  it(testlog('Encrypting test credentials', 'aes192'), (t) => {
    aes192Credentials.store(TestCredentials);
  });

  it(testlog('Checking encrypted credentials are encrypted', 'aes192'), (t) => {
    assert.notDeepEqual(aes192Credentials._encrypted, TestCredentials, `Credentials are not the same`);
  });

  it(testlog('Checking decrypted credentials are decrypted', 'aes192'), (t) => {
    assert.deepEqual(aes192Credentials.fetch(), TestCredentials);
  });
});

// Object chaining
describe('Testing credentials object chaining', () => {
  let credchain = new Credentials().store(TestCredentials);

  it(testlog('Checking encrypted credentials are encrypted', 'default'), (t) => {
    assert.notDeepEqual(credchain._encrypted, TestCredentials, `Credentials are not the same`);
  });

  it(testlog('Checking decrypted credentials are decrypted', 'default'), (t) => {
    assert.deepEqual(credchain.fetch(), TestCredentials);
  });
});