/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var Hapi = require('hapi');
var config = require('./config').root();
var log = require('./logger')('server.index');

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

server.route({
  method: 'GET',
  path: '/',
  config: {
    auth: 'session',
    handler: function(request, reply) {
      var page = request.auth.isAuthenticated ? 'app.html' : 'index.html';
      reply.file(page);
    }
  }
});
server.route({
  method: 'GET',
  path: 'v1/auth/logout',
  handler: function(request, reply) {
    request.auth.session.clear();
    return reply.redirect('/');
  }
});
server.route({
  method: 'GET',
  path: 'v1/auth/complete',
  handler: function(request, reply) {
    // bell did the oauth thing for us. assume it's in the request.
    // next, hit the profile server to get the fxa_uid, email, name, avatar.
    // finally, set the fxa_uid in the cookie,
    // then hapi-auth-cookie signs the cookie.
    var sessionData = {
      fxaId: '6d940dd41e636cc156074109b8092f96'
    };
    reply().state('session', sessionData, sessionOpts);
    // TODO is this correct? or do we need to do request.auth.session.ttl(ttl) ?
  }
});
// static routes using dist/, yay grunt
server.route({
  method: 'GET',
  path: '/dist/{param*}',
  handler: {
    directory: {
      path: config.get('server.staticPath'),
      listing: config.get('server.staticDirListing')
    }
  }
});

server.register([require('hapi-auth-cookie'), require('bell')], function(err) {
  if (err) {
    log.warn('failed to load plugin: ' + err);
    throw err; // TODO: should we use AppError instead?
  }

  // hapi-auth-cookie init
  server.auth.strategy('session', 'cookie', {
    password: config.get('server.session.password'), // password is used for Iron cookie encoding. choose wisely.
    redirectTo: '/', // where we send unauthenticated requests
    isSecure: config.get('server.session.isSecure'),
    ttl: config.get('server.session.duration')
  });

  // bell init
  server.auth.strategy('oauth', 'bell', {
    // TODO: is a space the scope separator, or a comma (broken but used by FB,GH)?
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
