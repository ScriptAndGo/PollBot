// -----------------------------------------------------------------------------
// Module definition
// -----------------------------------------------------------------------------
module.exports.name = 'PollBot';
module.exports.level = 'warn';
// Global logging level
//
// Possible values: 'silent', 'error', 'warn', 'info', 'debug', 'trace'
//
// Recommended:
//    'warn' for regular usage
//    'info' for regular development
//    'debug' when dealing with deep issues
//    'trace' when dealing with VERY deep issues
//
// Note: it is preferable to set 'debug' log levels for each module individually
//       rather than using the global switch, cf. 'loglevel setup' section.



// -----------------------------------------------------------------------------
// Dependencies
// -----------------------------------------------------------------------------
var fs = require('fs');

var wobot = require('wobot');
var logger = require('loglevel').getLogger(module.exports.name);
var loglevelMessagePrefix = require('loglevel-message-prefix');

var logHelper = require('./utils/LogHelper');
logHelper.setLevel(logger, module.exports.level);

var pollPlugin = require('./plugins/PollPlugin');



// -----------------------------------------------------------------------------
// loglevel definition
// -----------------------------------------------------------------------------
// You can change the logging level of each module individually for easier debugging
// logger.setLevel('debug');
logger.setLevel(logHelper.level);
loglevelMessagePrefix(logger, logHelper.logLevelMessagePrefix(module.exports.name));



// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------
// Get credentials
var credentialsString = fs.readFileSync('credentials', 'utf-8');
var [jid, password, defaultRoom] = credentialsString.split(/\s+/);
logger.debug('jid:', jid);
logger.debug('password: Nope! Chuck Testa');
logger.debug('defaultRoom:', defaultRoom);

// Instantiate bot
var bot = new wobot.Bot({
  jid: jid + '/pollbot',
  password: password,
});

// Create user list
bot.users = {};

// Load plugins
bot.loadPlugin(pollPlugin.name, pollPlugin);

// Connect to HipChat server
bot.connect();



// -----------------------------------------------------------------------------
// Event handlers
// -----------------------------------------------------------------------------
bot.onConnect(function onConnect() {
  // Logging
  logHelper.functionCall(logger, arguments.callee.name);
  
  // Connect, join default room, and initialize user list
  logger.info('Connected to HipChat!\n  Server:', bot.mucHost, '\n  JID:', bot.jid, '\n  Name:', bot.name);
  if (defaultRoom !== undefined) {
      this.join(defaultRoom + '@' + bot.mucHost);
      logger.info('Automatically joined default room:', defaultRoom);
  }
  this.refreshUsers();
});

bot.onInvite(function onInvite(roomJid, senderJid, message) {
  // Logging
  logHelper.functionCall(logger, arguments.callee.name, {'roomJid': roomJid, 'senderJid': senderJid, 'message': message});
  
  // Join
  this.join(roomJid);
  logger.info('Joined room:', roomJid);
});

bot.onMessage(function onMessage(roomJid, senderName, message) {
  // Logging
  logHelper.functionCall(logger, arguments.callee.name, {'roomJid': roomJid, 'senderName': senderName, 'message': message});  
});

bot.onPrivateMessage(function onPrivateMessage(senderJid, message) {
  // Logging
  logHelper.functionCall(logger, arguments.callee.name, {'senderJid': senderJid, 'message': message});
});

bot.onError(function onError(error, message, stanza) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'error': error, 'message': message, 'stanza': stanza}, {'error': error, 'message': message}, 'error');
});

bot.onPing(function onPing() {
  // Logging
  logHelper.functionCall(logger, arguments.callee.name, {}, 'trace');
});

bot.onDisconnect(function onDisconnect() {
  // Logging
  logHelper.functionCall(logger, arguments.callee.name);
});



// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------
bot.getUserByName = function getUserByName(name) {
  // Search for user in fetched list
  // If not found, refresh list
  var user = this.users[name];
  if (user === undefined) {
    this.refreshUsers();
    user = this.users[name];
  }
  return user;
}

bot.getUserByJid = function getUserByJid(jid) {
  // Search for user in fetched list
  // If not found, refresh list
  for (var key in users) {
    if (users[key].jid === jid) { var user = users[key]; }
  }
  if (user === undefined) {
    this.refreshUsers();
    for (var key in users) {
      if (users[key].jid === jid) { user = users[key]; }
    }
  }
  return user;
}

bot.getUserByMentionName = function getUserByMentionName(mention_name) {
  // Search for user in fetched list
  // If not found, refresh list
  for (var key in users) {
    if (users[key].mention_name === mention_name) { var user = users[key]; }
  }
  if (user === undefined) {
    this.refreshUsers();
    for (var key in users) {
      if (users[key].mention_name === mention_name) { user = users[key]; }
    }
  }
  return user;
}

bot.refreshUsers = function refreshUsers() {
  // Refresh users list
  logger.info('Refreshing user list');
  users = {};
  
  this.getRoster(function(err, roster, stanza) {
    roster.forEach(function(user) {
      user.mention_name = '@' + user.mention_name;
      users[user.name] = user;
    });
  });
  
  this.users = users;
}