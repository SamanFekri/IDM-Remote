'use strict';

const Hapi = require('hapi');
const Config = require('./config');
const NodeRSA = require('node-rsa');
const Joi = require('joi');
const cmd = require('node-cmd');

const key = new NodeRSA(Config.priKey);
key.importKey(Config.pubKey, 'public');

// Create a server with a host and port
const server = Hapi.server({
  host: Config.ip,
  port: Config.port
});

// Add the route
server.route({
  method: 'GET',
  path: '/hello',
  handler: function (request, h) {

    return 'hello world';
  }
});

server.route({
  method: 'POST',
  path: '/api/start',
  config: {
    validate: {
      payload: {
        secret: Joi.string().required(),
        list: Joi.string().required(),
        user: Joi.string().required()
      }
    }
  },
  handler: function (request, h) {
    if (request.payload.user in Config.users) {
      let decrypted = key.decrypt(request.payload.secret, 'utf8');
      console.log(decrypted);
      if (Config.users[request.payload.user].secret === decrypted) {
        let list = JSON.parse(request.payload.list);
        if (list.length > 0) {
          for (let i in list) {
            let item = list[i];
            let line = ``;
            if ('name' in item) {
              line = `idman /n /a /d "${item.link}" /f ${item.name}`;
            } else {
              line = `idman /n /a /d "${item.link}"`;
            }
            cmd.get(line, (err, data, stderr) => {
              console.log(`Data: ${data}`);
              console.log(`Err: ${err}`);
              console.log(`StdErr: ${stderr}`);
            });
          }
          cmd.run('idman /s');
          return {code: 200};
        }
      }
    }
    return request.payload;
  }
});

// Start the server
async function start() {

  try {
    await server.start();
  }
  catch (err) {
    console.log(err);
    process.exit(1);
  }

  console.log('Server running at:', server.info.uri);
};

start();