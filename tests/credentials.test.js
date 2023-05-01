const TestMeta = {
  name: `Credentials`
};
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

test(`(${TestMeta.name}) Encrypting test credentials`, (t) => {
  credentials.store(TestCredentials);
});

test(`(${TestMeta.name}) Checking encrypted credentials are encrypted`, (t) => {
  assert.notDeepEqual(credentials._encrypted, TestCredentials, `Credentials are not the same`);
});

test(`(${TestMeta.name}) Checking decrypted credentials are decrypted`, (t) => {
  assert.deepEqual(credentials.fetch(), TestCredentials);
});

// AES192 tests
test(`(${TestMeta.name}) Encrypting test credentials (aes192)`, (t) => {
  aes192Credentials.store(TestCredentials);
});

test(`(${TestMeta.name}) Checking encrypted credentials are encrypted (aes192)`, (t) => {
  assert.notDeepEqual(aes192Credentials._encrypted, TestCredentials, `Credentials are not the same`);
});

test(`(${TestMeta.name}) Checking decrypted credentials are decrypted (aes192)`, (t) => {
  assert.deepEqual(aes192Credentials.fetch(), TestCredentials);
});
