const https = require('https');
const credentials = require('./credentials');
const { URL } = require('node:url');

class AquaClient {
  /**
   * 
   * @param {*} args 
   */
  constructor(args={}) {
    this._instance = null;
    this._port = null;

    if (args.instance) {
      this.setInstance(args.instance);
    }

    // User authentication (used to get token)

    // Authentication token
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
   * @param {*} token 
   */
  setToken(token) {
    Object.defineProperty(this, "_token", {enumerable: false, writable: true});
    this._token.store(token);
    Object.defineProperty(this, "_token", {enumerable: false, writable: false});
  };

  /**
   * 
   * @param {*} args 
   * @returns Promise
   */
  request(args={method: 'GET', endpoint: '', querystring: {}, headers: {}, body: {}}) {
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
   * 
   * @param {*} args 
   * @returns 
   */
  get(args={endpoint: '', querystring: {}, headers: {}}) {
    return this.request({method: 'GET', ...args});
  };

  /**
   * 
   * @param {*} args 
   * @returns 
   */
  post(args={endpoint: '', querystring: {}, headers: {}, body: {}}) {
    return this.request({method: 'POST', ...args});
  };

  /**
   * 
   * @param {string} path 
   * @param {object} qs 
   * @param {number} currentPage 
   * @param {number} perPage 
   * @returns 
   */
  getPage(path, qs={}, currentPage=1, perPage=1000) {
    if (perPage > this._options.per_page_max) {
      throw new Error(`perPage must be less than or equal to ${this._options.per_page_max}`);
    }

    return this.get(path, {...qs, ...{page: currentPage, pagesize: perPage}});
  };

  /**
   * Fetch all data from an aqua endpoint
   * @param {string} path 
   * @param {object} qs 
   * @returns 
   */
  getAll(path="", qs={}) {
    // @todo Instead of doing this synchronously, we should do it asynchronously
    return new Promise(async (resolve, reject) => {
      let first = await this.getPage(path, qs, 1, 1);

      // If we have less than the max per page, we can just fetch and return the first page
      if (first.count <= this._options.per_page_max) {
        let all = await this.getPage(path, qs, 1, this._options.per_page_max)
        resolve(all);
        return;
      }

      let pagesNeeded = Math.ceil(first.count / this._options.per_page_max);
      let all = [];

      for (let i = 1; i <= pagesNeeded; i++) {
        let page = await this.getPage(path, qs, i, this._options.per_page_max);
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

  fetchToken(credentials) {
    return this.request({method: 'POST', endpoint: '/api/v1/login', body: credentials.fetch()});
  }

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

}

module.exports = AquaClient;