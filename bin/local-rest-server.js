const express = require('express');
const https = require('https');
const selfsigned = require('selfsigned');
const app = express();
let port = 3000;

if (process.argv[2] && !isNaN(process.argv[2]) && process.argv[2] > 0 && process.argv[2] < 65535) {
  port = process.argv[2];
}

(async () => {
  // create a local certificate
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = selfsigned.generate(attrs, { days: 365 });


  const server = https.createServer({
    key: pems.private,
    cert: pems.cert
  }, app);


  app.get('/', (req, res) => {
    res.json({message: 'Hello World!', ok: true, foo: 'bar'});
  });

  server.listen(port, () => {

    if (process.send) {
      process.send({ok: true});
    }

    console.log(`Local testing REST api started ${port}`)
  });

})();