const https = require('https');
const credentials = require('./credentials');
const { URL } = require('node:url');
const Package = require('../package.json');

/**
 * AquaClient class
 * @class AquaClient
 */
class AquaClient {

  /**
   * Create a new AquaClient instance
   * @param {*} args
   */
  constructor(args={}) {
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
      per_page_max: 1000
    };
  };

  /**
   * Set Aqua URL instance
   * @param {*} instance Aqua instance URL
   */
  setInstance(instance) {
    if (typeof instance !== 'string') {
      throw new Error('Instance must be a string');
    }

    this._instance = instance;
  };

  /**
   * Set the token
   * @param {string} token
   */
  setToken(token) {
    Object.defineProperty(this, "_token", {enumerable: false, writable: true});
    this._token.store(token);
    Object.defineProperty(this, "_token", {enumerable: false, writable: false});
  };

  /**
   * Main request method
   * @param {*} args
   * @returns Promise
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

    return new Promise((resolve, reject) => {
      let responseData = [];

      let request = https.request(target, {
        method: args.method,
        headers: args.headers,
        rejectUnauthorized: false // @todo make this configurable
      }, (response) => {
        response.on('data', (chunk) => {
          responseData.push(chunk);
        });

        response.on('end', () => {
          let responseString = Buffer.concat(responseData).toString();
          let responseObject = JSON.parse(responseString);

          resolve(responseObject);
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
   * @param {*} args
   * @returns Promise
   */
  get(endpoint, args={querystring: {}, headers: {}}) {
    return this.request(endpoint, {method: 'GET', ...args});
  };

  /**
   * Alias for a POST request
   * @param {string} endpoint
   * @param {*} args
   * @returns Promise
   */
  post(endpoint, args={querystring: {}, headers: {}, body: {}}) {
    return this.request(endpoint, {method: 'POST', ...args});
  };

  /**
   * Get a single page from a paginated aqua endpoint
   * @param {string} path
   * @param {object} qs
   * @param {number} currentPage
   * @param {number} perPage
   * @returns Promise
   */
  getPage(path, args={querystring: {}, page: 1, pageSize: 1000}) {
    if (args.pageSize > this._options.per_page_max) {
      throw new Error(`perPage must be less than or equal to ${this._options.per_page_max}`);
    }

    return this.get(path, args);
  };

  /**
   * Fetch all data from an aqua endpoint
   * @param {string} path
   * @param {object} qs
   * @returns Promise
   */
  getAll(path="", args={querystring: {}}) {
    // @todo Instead of doing this synchronously, we should do it asynchronously
    return new Promise(async (resolve, reject) => {
      let first = await this.getPage(path, {querystring: args.querystring, page: 1, pageSize: 1});

      // If we have less than the max per page, we can just fetch and return the first page
      if (first.count <= this._options.per_page_max) {
        let all = await this.getPage(path, {querystring: args.querystring, page: 1, pageSize: this._options.per_page_max});
        resolve(all);
        return;
      }

      let pagesNeeded = Math.ceil(first.count / this._options.per_page_max);
      let all = [];

      for (let i = 1; i <= pagesNeeded; i++) {
        let page = await this.getPage(path, {querystring: querystring, page: i, pageSize: this._options.per_page_max});

        if (page.result) {
          all = [...all, ...page.result];
        }
      }

      resolve(all);
    });
  };

  /**
   * Build URL
   * @param {string} path uri path
   * @param {object} qs object key/value pair querystring
   * @returns string url
   */
  buildUrl(path="", qs={}) {
    const url = new URL(this._instance);
    url.pathname = path;

    if (typeof qs === 'object' && Object.keys(qs).length > 0) {
      for (const [key, value] of Object.entries(qs)) {
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
   * @param {Credentials} credentials
   * @returns Promise
   */
  fetchToken(credentials) {
    return this.post('/api/v1/login', {body: credentials.fetch()});
  }

  /**
   * Authenticate using credentials and store the token for future requests
   * @param {Credentials} credentials
   * @returns token
   * @throws Error
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
   * Fetch version matrix
   * @returns {*} Version matrix
   */
  version() {
    return {
      client: Package.version
    };
  }
}

module.exports = AquaClient;