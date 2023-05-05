const fork = require('child_process').fork;

/**
 * LocalRestServer class
 *
 * @class LocalRestServer
 */
class LocalRestServer {
  /**
   * Create a new LocalRestServer instance
   *
   * @param {*} args Reserved for future use
   */
  constructor(args={}) {
    this._child = null;
  }

  /**
   * Fork a local web server for mock testing
   *
   * @returns {Promise} Promise that resolves when the server is ready
   */
  start() {
    return new Promise((resolve, reject) => {
      this._child = fork(
        'bin/local-rest-server.js'
      );

      this._child.on('message', (msg) => {
        if (msg.ok) {
          resolve();
        }
      });

      // @todo Add in handling error exit signals

      setTimeout(() => {
        this._child.kill();
        reject(`Unable to start local server after 10 seconds`);
      }, 10000);
    });
  }

  /**
   * Stop the local web server
   */
  stop() {
    this._child.kill();
  }

}

module.exports = LocalRestServer;