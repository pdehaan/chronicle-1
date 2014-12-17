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

function createDatabase(cb) {
  var dropDatabaseQuery = 'DROP DATABASE IF EXISTS chronicle';
  var createDatabaseQuery = 'CREATE DATABASE IF NOT EXISTS chronicle ' +
    'CHARACTER SET utf8 COLLATE utf8_unicode_ci';
  var useDatabaseQuery = 'USE chronicle';
  var createTableQuery = 'CREATE TABLE IF NOT EXISTS users (' +
    'fxa_id BINARY(16) NOT NULL PRIMARY KEY,' +
    'email VARCHAR(256) NOT NULL,' +
    'oauth_token BINARY(32),' +  // can we assume this will be true? TODO
    'createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
    'updatedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,' +
    'INDEX (email)' +
    ') ENGINE=InnoDB CHARACTER SET utf8 COLLATE utf8_unicode_ci;';

  conn.connect(function(err) {
    if (err) {
      return log.warn('error connecting to mysql: ' + err);
    }
    log.info('connected to mysql as id ' + conn.threadId);
    
    // TODO use promises for prettier chaining
    log.info('dropping any existing database');
    conn.query(dropDatabaseQuery, function(err) {
      if (err) {
        log.warn('error dropping database: ' + err);
      }
      log.info('old database dropped.')
      log.info('creating chronicle database');
      conn.query(createDatabaseQuery, function(err) {
        if (err) {
          log.warn('error creating database: ' + err);
        }
        log.info('database successfully created');
        conn.query(useDatabaseQuery, function(err) {
          if (err) {
            log.warn('error using database: ' + err);
          }
          log.info('now using database');

          log.info('creating user table');
          conn.query(createTableQuery, function(err) {
            if (err) {
              log.warn('error creating user table: ' + err);
            }
            log.info('user table successfully created');
            cb && setTimeout(cb);
          });
        });
      });
    });
  });
}

// let's insert some dummy data, then exercise the table a bit!
function testDatabase(cb) {
  var useDatabaseQuery = 'USE chronicle';
  var insertFakeUser = 'INSERT INTO users (fxa_id, email, oauth_token) VALUES (?, ?, ?)';
  var fxa_id = buf('6d940dd41e636cc156074109b8092f96');
  var email = 'foo@bar.com';
  var oauth_token = buf('558f9980ad5a9c279beb52123653967342f702e84d3ab34c7f80427a6a37e2c0');
  var selectById = 'SELECT email FROM users WHERE fxa_id = ?';

  conn.query(insertFakeUser, [fxa_id, email, oauth_token], function(err) {
    if (err) {
      log.warn('error inserting fake user: ' + err);
    }
    log.info('fake user inserted!');
    conn.end(function(err) {
      if (err) {
        log.warn('error ending mysql connection: ' + err);
        log.warn('resorting to connection.destroy to end this session');
        conn.destroy();
      }
      log.info('mysql connection closed.');
      cb && setTimeout(cb);
    });
  });
}


createDatabase(testDatabase);
