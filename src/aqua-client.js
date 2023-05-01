const https = require('https');
const querystring = require('querystring');
const credentials = require('./credentials');

class AquaClient {
  constructor(args={}) {
    this._instance = null;

    if (args.instance) {
      this.setInstance(args.instance);
    }

    // User authentication (used to get token)

    // Authentication token
    this._token = new credentials();
    Object.defineProperty(this, "_token", {enumerable: false, writable: false});
  }

  /**
   * Set Aqua URL instance
   * @param {*} instance Aqua instance URL
   */
  setInstance(instance) {
    if (typeof instance !== 'string') {
      throw new Error('Instance must be a string');
    }

    this._instance = instance;
  }

  /**
   * Set the token
   * @param {*} token 
   */
  setToken(token) {
    Object.defineProperty(this, "_token", {enumerable: false, writable: true});
    this._token.store(token);
    Object.defineProperty(this, "_token", {enumerable: false, writable: false});
  }


  request() {

  }

  /**
   * Convert key/value pair object to querystring
   * 
   * @param {*} qs Convert key/value pair object
   * @returns 
   */
  querystring(qs) {
    return (typeof qs === 'object') ? `?${querystring.stringify(qs)}` : '';
  }

}

module.exports = AquaClient;