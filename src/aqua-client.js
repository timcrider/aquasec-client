const https = require('https');
const credentials = require('./credentials');
const { URL } = require('node:url');
const Package = require('../package.json');


/**
 * Aqua request arguments
 *
 * @typedef {Object} AquaRequestArgs
 * @property {string} method HTTP method (currently only supports GET and POST)
 * @property {object} querystring Querystring key/value pair object
 * @property {object} headers HTTP headers key/value pair object
 * @property {object} body HTTP body key/value pair object
 */

/**
 * Aqua client constructor options
 *
 * @typedef {Object} AquaRequestConstructorOptions
 * @property {number} per_page_max Maximum number of items per page
 * @property {boolean} debug Debug mode
 * @property {boolean} ssl_verify SSL verification
 */

/**
 * Aqua client constructor options
 *
 * @typedef {Object} AquaClientConstructor
 * @property {string} instance Aqua instance URL
 * @property {AquaRequestConstructorOptions} options Aqua client options
 */

/**
 * AquaClient class
 *
 * @class AquaClient
 */
class AquaClient {

  /**
   * Create a new AquaClient instance
   *
   * @param {AquaClientConstructor} args AquaClient constructor arguments
   * @param {AquaRequestConstructorOptions} options AquaClient options
   */
  constructor(args={}, options={}) {
    this._instance = null;
    this._port = null;

    if (args.instance) {
      this.setInstance(args.instance);
    }

    // Authentication token holder
    this._token = new credentials();
    Object.defineProperty(this, "_token", {enumerable: false, writable: false});

    // Options
    this._options = {
      ...options,
      ...{
        per_page_max: 1000,
        debug: false,
        ssl_verify: false
      }
    };

  };

  /**
   * Set Aqua URL instance
   *
   * @param {string} Instance Aqua instance URL
   */
  setInstance(instance) {
    if (typeof instance !== 'string') {
      throw new Error('Instance must be a string');
    }

    this._instance = instance;
  };

  /**
   * Set the token
   *
   * @param {string} token
   */
  setToken(token) {
    Object.defineProperty(this, "_token", {enumerable: false, writable: true});
    this._token.store(token);
    Object.defineProperty(this, "_token", {enumerable: false, writable: false});
  };

  /**
   * Set debug mode
   *
   * @param {boolean} debug Debug mode
   */
  setDebug(debug) {
    this._options.debug = debug ? true : false;
  }

  /**
   * Main request method
   *
   * @param {string} endpoint URI Endpoint
   * @param {AquaRequestArgs} args Request arguments
   * @returns Promise Parsed json object on success, rejection thrown on failure
   */
  request(endpoint, args={method: 'GET', querystring: {}, headers: {}, body: {}}) {
    args.endpoint = endpoint;
    let target = this.buildUrl(args.endpoint, args.querystring);
    const isPost = args.method === 'POST';

    // if args.headers is an empty object, add Accept and ContentType headers to 'application/json'
    if (typeof args.headers !== 'object' || Object.keys(args.headers).length === 0) {
      args.headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
    }

    if (isPost) {
      args.body = JSON.stringify(args.body);
      args.headers['Content-Length'] = args.body.length;
    }

    if (this._token.hasData() && !args.headers['Authorization']) {
      args.headers['Authorization'] = `Bearer ${this._token.fetch()}`;
    }

    // Handle actual request
    return new Promise((resolve, reject) => {
      let responseData = [];

      let request = https.request(target, {
        method: args.method,
        headers: args.headers,
        rejectUnauthorized: this._options.ssl_verify
      }, (response) => {
        // Capture response data
        response.on('data', (chunk) => {
          responseData.push(chunk);
        });

        // Resolve response data
        response.on('end', () => {
          try {
            // Stringify response data and try to parse into object/array
            let responseString = Buffer.concat(responseData).toString();
            let responseObject = JSON.parse(responseString);

            resolve(responseObject);
          } catch (err) {
            reject(err);
          }
        });
      });

      request.on('error', (err) => {
        reject(err);
      });

      isPost && args.body && request.write(args.body);
      request.end();
    });
  };

  /**
   * Alias for a GET request
   *
   * @param {object} args Request arguments
   * @param {object} args.querystring Querystring key/value pair object
   * @param {object} args.headers HTTP headers key/value pair object
   * @returns Promise Parsed json object on success, rejection thrown on failure
   */
  get(endpoint, args={querystring: {}, headers: {}}) {
    return this.request(endpoint, {method: 'GET', ...args});
  };

  /**
   * Alias for a POST request
   *
   * @param {string} endpoint URI Endpoint
   * @param {object} args Request arguments
   * @param {object} args.querystring Querystring key/value pair object
   * @param {object} args.headers HTTP headers key/value pair object
   * @param {object} args.body HTTP body key/value pair object
   * @returns Promise Parsed json object on success, rejection thrown on failure
   */
  post(endpoint, args={querystring: {}, headers: {}, body: {}}) {
    return this.request(endpoint, {method: 'POST', ...args});
  };

  /**
   * Get a single page from a paginated aqua endpoint
   *
   * @param {string} path uri path
   * @param {object} args Request arguments
   * @param {object} args.querystring Querystring key/value pair object
   * @param {number} args.page Page number
   * @param {number} args.page_size Number of items per page
   * @returns Promise Parsed json object on success, rejection thrown on failure
   */
  getPage(path, args={querystring: {}, page: 1, page_size: -1}) {
    if (args.page_size > this._options.per_page_max) {
      throw new Error(`perPage must be less than or equal to ${this._options.per_page_max}`);
    }

    return this.get(path, args);
  };

  /**
   * Fetch all data from an aqua endpoint
   *
   * @param {string} path
   * @param {object} args Request arguments
   * @param {object} args.querystring Querystring key/value pair object
   * @returns Promise Parsed json object on success, rejection thrown on failure
   */
  getAll(path="", args={querystring: {}}) {
    // @todo Instead of doing this synchronously, we should do it asynchronously
    return new Promise(async (resolve, reject) => {
      let first = await this.getPage(path, {querystring: {...args.querystring, ...{page: 1, page_size: 1}}});

      // If we have less than the max per page, we can just fetch and return the first page
      if (first.count <= this._options.per_page_max) {
        let all = await this.getPage(path, {querystring: {...args.querystring, ...{page: 1, page_size: this._options.per_page_max}}});
        resolve(all);
        return;
      }

      let pagesNeeded = Math.ceil(first.count / this._options.per_page_max);
      let all = [];

      for (let i = 1; i <= pagesNeeded; i++) {
        let page = await this.getPage(path, {querystring: {...querystring, ...{page: i, page_size: this._options.per_page_max}}});

        if (page.result) {
          all = [...all, ...page.result];
        }
      }

      resolve(all);
    });
  };

  /**
   * Build URL
   *
   * @param {string} path uri path
   * @param {object} querystring object key/value pair querystring
   * @returns string url
   */
  buildUrl(path="", querystring={}) {
    const url = new URL(this._instance);
    url.pathname = path;

    if (typeof querystring === 'object' && Object.keys(querystring).length > 0) {
      for (const [key, value] of Object.entries(querystring)) {
        url.searchParams.append(key, value);
      }
    }

    if (this._port) {
      url.port = this._port;
    }

    return url.toString();
  }

  /**
   * Fetch authentication token using valid credentials
   *
   * @param {Credentials} credentials Aqua authentication credentials object
   * @returns Promise API response request promise
   */
  fetchToken(credentials) {
    return this.post('/api/v1/login', {body: credentials.fetch()});
  }

  /**
   * Authenticate using credentials and store the token for future requests
   *
   * @param {Credentials} credentials Aqua authentication credentials object
   * @returns {Credentials} token Aqua authentication token object
   * @throws Error on failure
   */
  authenticate(credentials) {
    return new Promise (async (resolve, reject) => {
      try {
        let token = await this.fetchToken(credentials);
        this.setToken(token.token);

        // @todo check options to reutrn token or true
        resolve(token);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Fetch version matrix\
   *
   * @returns {object} Version matrix
   * @returns {string} Version matrix.client Client version
   */
  version() {
    return {
      client: Package.version
    };
  }
}

module.exports = AquaClient;