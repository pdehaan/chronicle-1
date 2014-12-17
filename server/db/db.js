/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var mysql = require('mysql');
var config = require('../config');
var buf = require('buf').hex;
var log = require('../logger')('server.db');

// TODO use connection pooling
var conn = mysql.createConnection({
  host: config.get('db.mysql.host'),
  user: config.get('db.mysql.user'),
  password: config.get('db.mysql.password')
});

conn.connect(function(err) {
  if (err) {
    return log.warn('error connecting to mysql: ' + err);
  }
  log.info('connected to mysql as id ' + conn.threadId);
});

// TODO use promises for prettier chaining

// do stuff.....
conn.end(function(err) {
  if (err) {
    log.warn('error ending mysql connection: ' + err);
    log.warn('resorting to connection.destroy to end this session');
    conn.destroy();
  }
  log.info('mysql connection closed.');
});
