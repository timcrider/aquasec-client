const crypto = require('crypto');

/**
 * @constant {object} propLock Lock object property
 */
const propLock = {enumerable: false, writable: false};

/**
 * @constant {object} propUnlock Unlock object property
 */
const propUnlock = {enumerable: false, writable: true};

/**
 * Credentials class
 *
 * @class Credentials
 */
class Credentials {
  /**
   * Create a new Credentials instance
   *
   * @param {string} algorithm Encryption algorithm
   * @param {Buffer} key Encryption key
   * @param {Buffer} iv Initialization vector
   */
  constructor(algorithm = 'aes-256-cbc', key = crypto.randomBytes(32), iv = crypto.randomBytes(16)) {
    this._hasData = false;
    this._algorithm = algorithm;
    this.setKey(key);
    this.setIv(iv);
    this._encrypted = null;

    // Hide these properties from view
    Object.defineProperty(this, "_key", propLock);
    Object.defineProperty(this, "_iv", propLock);
    Object.preventExtensions(this);
    Object.seal(this);
  };

  /**
   * Set the encryption key
   *
   * @param {Buffer} key Key used to encrypt/decrypt data
   */
  setKey(key) {
    if (!Buffer.isBuffer(key)) {
      throw new Error('Key must be a buffer');
    }

    Object.defineProperty(this, "_key", propUnlock);
    this._key = key;
    Object.defineProperty(this, "_key", propLock);
  };

  /**
   * Set the initialization vector
   *
   * @param {Buffer} iv Initialization vector
   */
  setIv(iv) {
    if (!Buffer.isBuffer(iv)) {
      throw new Error('Iv must be a buffer');
    }

    Object.defineProperty(this, "_iv", propUnlock);
    this._iv = iv;
    Object.defineProperty(this, "_iv", propLock);
  };

  /**
   * Store and encrypt a string or simple object
   *
   * @param {string|object} data String or simple object to be stored
   */
  store(data) {
    // If data is an ojbect, convert it to a string
    if (typeof data === 'object') {
      data = JSON.stringify(data);
    }

    const cipher = crypto.createCipheriv(this._algorithm, this._key, this._iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    this._encrypted = encrypted;
    this._hasData = true;
  };

  /**
   * Fetch encrypted data
   *
   * @returns Decrypted data
   */
  fetch() {
    const decipher = crypto.createDecipheriv(this._algorithm, this._key, this._iv);
    let decrypted = decipher.update(this._encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // return decrypted string as an object if it can be parsed as JSON
    try {
      return JSON.parse(decrypted);
    } catch (err) {
      return decrypted;
    }
  };

  /**
   * Check if data has been stored
   *
   * @returns {boolean} True if data has been stored
   */
  hasData() {
    return this._hasData;
  };
}

module.exports = Credentials;
