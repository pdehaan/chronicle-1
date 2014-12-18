/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var path = require('path');
var wreck = require('wreck');
var uuid = require('uuid');

var log = require('./logger')('server.routes');
var config = require('./config');

module.exports = [{
  method: 'GET',
  path: '/',
  config: {
    auth: {
      strategy: 'session',
      mode: 'try'
    },
    plugins: { 'hapi-auth-cookie': { redirectTo: false } },
    handler: function (request, reply) {
      var page = request.auth.isAuthenticated ? 'app.html' : 'index.html';
      // TODO should we set a cookie here? yup.
      // TODO: but don't we want to only cookie logged-in users?
      //       and isn't it silly to pass the uuid to the client-side to use as the nonce?
      // request.auth.session.set({temporarySession: uuid.v4()});
      // TODO we need a way to inject the temporarySessionId into the page
      reply.file(path.join(__dirname, '../app', page));
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
    auth: {
      strategy: 'oauth',
      mode: 'try'
    },
    handler: function (request, reply) {
      // at this point, the oauth dance is complete, we have a code but not a token.
      // we need to swap the code for the token,
      // then we need to ask the profile server for the user's profile,
      // then we need to save the session.
      // TODO: maybe we want this to live inside the server.auth.strategy call for bell?
      log.info('auth/complete invoked');
      log.info('do we have query params? ' + JSON.stringify(request.query));
      // HUGE TODO: we really want to verify this wasn't replayed etc. use the 'state'. skipping for now.

      // 1. we have the code. POST to /v1/token.
      // request params: client_id, client_secret, code.
      // response params: access_token, scope, token_type (currently 'bearer' always)
      var tokenPayload = {
        client_id: config.get('server.oauth.clientId'),
        client_secret: config.get('server.oauth.clientSecret'),
        code: request.query.code
      };
      log.info('about to post the following stuff to thetoken endpoint: ' + JSON.stringify(tokenPayload));
      // TODO use promises to flatten this pyramid
      wreck.post(config.get('server.oauth.tokenEndpoint'),
        { payload: JSON.stringify(tokenPayload) },
        function(err, res, payload) {
          // kk so, what did we get?
          if (err) { log.info('token server error: ' + err) }
          if (!payload) { log.info('token server returned empty response') }
          if (err) { log.info('wreck.read returned an error: ' + err) }
          log.info('token server response: ' + payload);            
          log.info('token server response http code: ' + res.statusCode);
          var pay = JSON.parse(payload);
          var accessToken = pay['access_token'];
          log.info('the token is ' + accessToken);
          // TODO save the token to the user's account in the DB
          // 2. we have the token. time for to fetch us a lil' profile data.
          wreck.get(config.get('server.oauth.profileUri'),
            { headers: {'authorization': 'Bearer ' + accessToken}},
            function(err, res, payload) {
              if (err) { log.info('profile server error: ' + err) }
              if (!payload) { log.info('profile server returned empty response') }
              // ok so now we've got a profile!
              log.info('profile server response: ' + payload);
              // TODO save stuff in the user DB
              // now let's actually set a proper session cookie, huzzah!
              var userId = payload.uid;
              var userEmail = payload.email;
              request.auth.session.set({fxaId: userId});
              reply.redirect('/');
          });
      });
    }
  }
}, {
  // static routes using dist/, yay grunt
  method: 'GET',
  path: '/dist/{param*}',
  handler: {
    // TODO use friggin hapi configs before going to production :-P
    directory: {
      path: path.join(__dirname, '../app'),
      listing: true
    }
  }
}];
