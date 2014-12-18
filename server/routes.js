/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var config = require('./config');

module.exports = [{
  method: 'GET',
  path: '/',
  config: {
    auth: 'session',
    handler: function (request, reply) {
      var page = request.auth.isAuthenticated ? 'app.html' : 'index.html';
      reply.file(page);
    }
  }
}, {
  method: 'GET',
  path: '/auth/logout',
  handler: function (request, reply) {
    request.auth.session.clear();
    return reply.redirect('/');
  }
}, {
  method: 'GET',
  path: '/auth/complete',
  config: {
    auth: 'oauth',
    handler: function (request, reply) {
      // TODO: bell did the oauth thing for us. assume it's in the request.
      // next, hit the profile server to get the fxa_uid, email, name, avatar.
      // finally, set the fxa_uid in the cookie,
      // then hapi-auth-cookie signs the cookie.
      var sessionData = {
        fxaId: '6d940dd41e636cc156074109b8092f96'
      };
      reply()
        .state('session', sessionData)
        .redirect('/'); //redirect home, then we'll load the logged-in view
    }
  }
}, {
  // static routes using dist/, yay grunt
  method: 'GET',
  path: '/dist/{param*}',
  handler: {
    directory: {
      path: config.get('server.staticPath'),
      listing: config.get('server.staticDirListing')
    }
  }
}];
