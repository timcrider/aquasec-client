const TestMeta = {
  name: `Credentials`
};
const common = require('./lib/common');
const testlog = common.testLog(TestMeta.name);

const test = require(`node:test`);
const assert = require(`node:assert/strict`);
const crypto = require(`crypto`);
const Credentials = require(`../src/credentials`);

// Test data
const TestCredentials = require(`./data/test-credentials.json`);

// Test credentials
const credentials = new Credentials();
const aes192Credentials = new Credentials(`aes192`, crypto.randomBytes(24));

// Default tests

test(testlog('Encrypting test credentials', 'default'), (t) => {
  credentials.store(TestCredentials);
});

test(testlog('Checking encrypted credentials are encrypted', 'default'), (t) => {
  assert.notDeepEqual(credentials._encrypted, TestCredentials, `Credentials are not the same`);
});

test(testlog('Checking decrypted credentials are decrypted', 'default'), (t) => {
  assert.deepEqual(credentials.fetch(), TestCredentials);
});

// AES192 tests
test(testlog('Encrypting test credentials', 'aes192'), (t) => {
  aes192Credentials.store(TestCredentials);
});

test(testlog('Checking encrypted credentials are encrypted', 'aes192'), (t) => {
  assert.notDeepEqual(aes192Credentials._encrypted, TestCredentials, `Credentials are not the same`);
});

test(testlog('Checking decrypted credentials are decrypted', 'aes192'), (t) => {
  assert.deepEqual(aes192Credentials.fetch(), TestCredentials);
});
