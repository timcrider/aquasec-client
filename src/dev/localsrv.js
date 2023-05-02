const fork = require('child_process').fork;

class LocalRestServer {
  constructor(args={}) {
    this._child = null;
  }

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

      // If we haven't resolved after 10 seconds, we're done
      setTimeout(() => {
        reject(`Unable to start local server after 10 seconds`);
      }, 10000);
  
    });
  }

  stop() {
    this._child.kill();
  }

}

module.exports = LocalRestServer;