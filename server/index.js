/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var Hapi = require('hapi');
var config = require('./config').root();
var log = require('./logger')('server.index');
var routes = require('./routes');

var server = new Hapi.Server({
  connections: {
    routes: {
      files: {
        relativeTo: Path.join(__dirname, '../', config.server.get('server.staticPath'))
      }
    }
  }
});
server.connection({
  host: config.get('server.host'),
  port: config.get('server.port')
});

server.route(routes);

server.register([require('hapi-auth-cookie'), require('bell')], function(err) {
  if (err) {
    log.warn('failed to load plugin: ' + err);
    throw err; // TODO: should we use AppError instead?
  }

  // hapi-auth-cookie init
  server.auth.strategy('session', 'cookie', {
    password: config.get('server.session.password'),
    redirectTo: '/',
    isSecure: config.get('server.session.isSecure'),
    ttl: config.get('server.session.duration')
  });

  // bell init
  server.auth.strategy('oauth', 'bell', {
    provider: {
      protocol: 'oauth2',
      auth: 'TODO: the auth endpoint URI',
      token: 'TODO: the access token endpoint URI',
      version: '2.0',
      scope: 'profile', // or is it 'chronicle'?
      profile: function(credentials, params, get, profileCb) {
        // TODO here's a guess at what to do in here, bell provides no example:
        // 1. grab params.token, send it to the profile endpoint
        // 2. put the profile response into the credentials object, then send it to DB
      }
    },
    password: config.get('server.session.password'),
    clientId: config.get('server.oauth.clientId'),
    clientSecret: config.get('server.oauth.clientSecret'),
    isSecure: config.get('server.session.isSecure')
  });

  server.start(function(err) {
    if (err) {
      log.warn('server failed to start: ' + err);
      throw err; // TODO: should we fail to start in some other way? AppError?
    }
    log.info('chronicle server running on port ' + config.server.port);
  });
});
