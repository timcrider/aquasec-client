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
 * Aqua response analysis object
 *
 * @typedef {Object} AquaReponseAnalysis
 * @property {string} endpoint Endpoint
 * @property {object} args Arguments
 * @property {string} type Endpoint returns an array or object
 * @property {object} pagination Pagination analysis
 * @property {boolean} pagination.supported Does the endpoint support pagination
 * @property {string} pagination.page if pagination what field contains the page number
 * @property {string} pagination.page_size if pagination what field contains the page size
 * @property {string} result if object, field that contains the result array
 * @property {number} count if result is an array, how many items are in the array
 */

/**
 * @constant {object} propLock Lock object property
 */
const propLock = {enumerable: false, writable: false};

/**
 * @constant {object} propUnlock Unlock object property
 */
const propUnlock = {enumerable: false, writable: true};

/**
 * AquaClient class
 *
 * @class AquaClient
 */
class AquaClient {

  /**
   * Create a new AquaClient instance
   *
   * @param {AquaClientConstructor} string Aqua instance URL
   * @param {AquaRequestConstructorOptions} options AquaClient options
   */
  constructor(instance=null, options={}) {
    this._instance = null;
    this._port = null;

    this.setInstance(instance);

    // Authentication token holder
    this._token = new credentials();
    Object.defineProperty(this, "_token", propLock);

    // Options
    this._options = {
      ...{
        per_page_max: 1000,
        debug: false,
        ssl_verify: false
      },
      ...options,
    };
  };

  /**
   * Set Aqua URL instance
   *
   * @param {string} Instance Aqua instance URL
   * @returns {AquaClient} AquaClient instance
   * @throws {Error} If instance is not a string
   * @note If instance is not provided and the AQUA_URL environment variable is set, it will be used
   */
  setInstance(instance=null) {
    if (instance && typeof instance !== 'string') {
      throw new Error('Instance must be a string');
    }

    this._instance = (!instance && process.env.AQUA_URL) ? process.env.AQUA_URL : instance;
    return this;
  };

  /**
   * Set the token
   *
   * @param {string} token
   */
  setToken(token) {
    Object.defineProperty(this, "_token", propUnlock);
    this._token.store(token);
    Object.defineProperty(this, "_token", propLock);
  };

  /**
   * Set debug mode
   *
   * @param {boolean} debug Debug mode
   */
  setDebug(debug) {
    this._options.debug = debug ? true : false;
  };

  /**
   * Write console debug output
   *
   * @param {string} msg Debug message
   */
  debug(msg) {
    if (this._options.debug) {
      console.log(`[DEBUG] ${msg}`);
    }
  };

  /**
   * Dump object to console
   *
   * @param {object} obj Object to dump
   */
  dump(obj) {
    if (this._options.debug) {
      console.log(`[DEBUG] `, JSON.stringify(obj, null, 2));
    }
  };

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

      this.debug(`Requesting ${target}`);
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
    // @todo This only works on apis that support pagination and use page/page_size.
    // @note This may produce unexpected results if the api does not support pagination.
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
        let page = await this.getPage(path, {querystring: {...args.querystring, ...{page: i, page_size: this._options.per_page_max}}});

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
  };

  /**
   * Fetch authentication token using valid credentials
   *
   * @param {Credentials} credentials Aqua authentication credentials object
   * @returns Promise API response request promise
   */
  fetchToken(credentials) {
    return this.post('/api/v1/login', {body: credentials.fetch()});
  };

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
        if (!token.token) {
          throw new Error(`Authentication failed: ${token.message}`);
        }

        this.setToken(token.token);

        // @todo check options to reutrn token or true
        resolve(this._token);
      } catch (err) {
        reject(err);
      }
    });
  };

  /**
   * Fetch version matrix
   *
   * @returns {object} Version matrix
   * @returns {string} Version matrix.client Client version
   */
  version() {
    return {
      client: Package.version
    };
  };

  /**
   * Analyze an endpoint response to determine if pagination is supported
   *
   * @param {object} response Mixed reponse object to analyze
   * @returns AquaReponseAnalysis
   */
  responseAnalyze(response={}) {
    return new Promise (async (resolve, reject) => {
      try {
        let out = {
          type: '', // Endpoint returns an array or object
          pagination: {
            supported: false, // Does the endpoint support pagination
            page: 'page', // if pagination what field contains the page number
            page_size: 'pagesize' // if pagination what field contains the page size
          },
          result: '', // if object, field that contains the result array
          count: 0 // if result is an array, how many items are in the array
        };

        out.type = Array.isArray(response) ? 'array' : 'object';

        // If the endpoint returns an array, we can't determine pagination
        if (out.type === 'array') {
          out.pagination.supported = false;
          out.count = response.length;
          resolve(out);
          return;
        }

        // If the endpoint returns an object, we can try to determine pagination
        if (out.type === 'object') {
          if (response.hasOwnProperty('result') && Array.isArray(response.result)) {
            out.result = 'result';
            out.count = response.result.length;

            // @todo determine if pagination is supported
            if (response.hasOwnProperty('count')) {
              if (response.count > 0 && response.result.length <= response.count) {
                out.pagination.supported = true;
              }
            }
          }
        }

        resolve(out);

      } catch (err) {
        reject(err);
      }
    });
  };

  /**
   * Analyze endpoint
   *
   * @param {string} path API endpoint
   * @param {object} args Analysis arguments
   * @param {object} args.querystring Querystring key/value pair object
   * @param {object} args.headers HTTP headers key/value pair object
   * @returns Promise AquaReponseAnalysis
   * @throws Error on failure
   */
  endpointAnalyze(path="", args={querystring: {}, headers: {}}) {
    // @note Only supports GET requests
    // @todo determine if page returns a single object or an array
    // @todo determine if page supports pagination and page/page_size
    return new Promise (async (resolve, reject) => {
      try {
        let out = {
          endpoint: path, // Endpoint
          args: args, // Arguments
          type: '', // Endpoint returns an array or object
          pagination: {
            supported: false, // Does the endpoint support pagination
            page: 'page', // if pagination what field contains the page number
            page_size: 'page_size' // if pagination what field contains the page size
          },
          result: '', // if object, field that contains the result array
          count: 0 // if result is an array, how many items are in the array
        };

        let pagination = {page: 1, pagesize: 1};
        let response = await this.get(path, args);
        let resp = await this.responseAnalyze(response);
        out = {...out, ...resp};

        resolve(out);
      } catch (err) {
        reject(err);
      }
    });
  };
};

module.exports = AquaClient;