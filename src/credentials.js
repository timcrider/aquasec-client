const crypto = require('crypto');

class Credentials {
  /**
   * 
   * @param {*} algorithm 
   * @param {*} key 
   * @param {*} iv 
   */
  constructor(algorithm = 'aes-256-cbc', key = crypto.randomBytes(32), iv = crypto.randomBytes(16)) {
    this._hasData = false;
    this._algorithm = algorithm;
    this.setKey(key);
    this.setIv(iv);
    this._encrypted = null;

    // Hide these properties from view
    Object.defineProperty(this, "_key", {enumerable: false, writable: false});
    Object.defineProperty(this, "_iv", {enumerable: false, writable: false});
    Object.preventExtensions(this);
    Object.seal(this);
  };

  /**
   * 
   * @param {*} key Key used to encrypt/decrypt data
   */
  setKey(key) {
    if (!Buffer.isBuffer(key)) {
      throw new Error('Key must be a buffer');
    }

    Object.defineProperty(this, "_key", {enumerable: false, writable: true});
    this._key = key;
    Object.defineProperty(this, "_key", {enumerable: false, writable: false});
  };

  /**
   * 
   * @param {*} iv Initialization vector
   */
  setIv(iv) {
    if (!Buffer.isBuffer(iv)) {
      throw new Error('Iv must be a buffer');
    }

    Object.defineProperty(this, "_iv", {enumerable: false, writable: true});
    this._iv = iv;
    Object.defineProperty(this, "_iv", {enumerable: false, writable: false});
  };

  /**
   * 
   * @param {*} data String or simple object to be stored
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

  hasData() {
    return this._hasData;
  };
}

module.exports = Credentials;
