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
bot.getUser = function getUser( { name, jid, mention_name } = {}, refreshOnMiss = true) {
  // Safeguard
  if (name === undefined && jid === undefined && mention_name === undefined) {
    logger.error('Invalid parameters provided to getUser().');
    return;
  }
  
  // Search for user in cached list
  var user;
  for (var key in this.users) {
    if (name !== undefined && key === name) { user = this.users[key]; break; }
    else if (jid !== undefined && this.users[key].jid === jid) { user = this.users[key]; break; }
    else if (mention_name !== undefined && this.users[key].mention_name === mention_name) { user = this.users[key]; break; }
  }
  
  // If not found, refresh cache
  if (user === undefined && refreshOnMiss) {
    this.refreshUsers();
    
    for (var key in this.users) {
      if (name !== undefined && key === name) { user = this.users[key]; break; }
      else if (jid !== undefined && this.users[key].jid === jid) { user = this.users[key]; break; }
      else if (mention_name !== undefined && this.users[key].mention_name === mention_name) { user = this.users[key]; break; }
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