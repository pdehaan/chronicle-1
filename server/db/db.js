/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var mysql = require('mysql');
var config = require('../config');
var buf = require('buf').hex;
var log = require('../logger')('server.db');

// TODO use connection pooling and/or attach this to the server
var conn = mysql.createConnection({
  host: config.get('db.mysql.host'),
  user: config.get('db.mysql.user'),
  password: config.get('db.mysql.password')
});

// DB API uses callbacks for the moment; TODO return promises?
module.exports = {
  createUser: function(fxaId, email, oauthToken, cb) {
    var query = 'INSERT INTO users (fxa_id, email, oauth_token) ' + 
                'VALUES (?, ?, ?)' +
                'ON DUPLICATE KEY UPDATE ' +
                'fxa_id = VALUES(fxa_id), ' +
                'email = VALUES(email), ' +
                'oauth_token = VALUES(oauth_token)';
    conn.query(query, [fxaId, email, oauthToken], function(err) {
      if (err) {
        log.warn('error saving user: ' + err);
        // TODO send the item to a retry queue
      }
      cb(err);
    });
  }
};
