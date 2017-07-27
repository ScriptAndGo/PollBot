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
const fs = require('fs');

const wobot = require('wobot');
const logger = require('loglevel').getLogger(module.exports.name);
const loglevelMessagePrefix = require('loglevel-message-prefix');

const logHelper = require('./utils/LogHelper');



// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------
// Get settings, sanitize, and assign
let [jid, password, defaultRoom, loglevel] = fs.readFileSync('PollBot.settings', 'utf-8').split(/\s+/).map(setting => {
  setting = setting.trim();
  if (setting.length === 0) { setting = undefined };
  return setting;
});

// Set user-defined log level and apply globally (if none found, defaults to value declared at the top)
if (loglevel !== undefined) {
  module.exports.level = loglevel;
}
logHelper.setLevel(logger, module.exports.level);



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
logger.debug('jid:', jid);
logger.debug('password: Nope! Chuck Testa');
logger.debug('defaultRoom:', defaultRoom);
logger.debug('loglevel:', loglevel);
logger.debug('module.exports.level:', module.exports.level);

// Safeguard
if (jid === undefined || password === undefined) {
  logger.error('Could not find required settings "jid" and "password" from "PollBot.settings"');
  process.exit(1);
}

// Instantiate bot
let bot = new wobot.Bot({
  jid: `${jid}/pollbot`,
  password,
});

// Create user list
bot.users = {};

// Load plugins
const pollPlugin = require('./plugins/PollPlugin');
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
      this.join(`${defaultRoom}@${bot.mucHost}`);
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
bot.getUser = function({ name, jid, mentionName } = {}, refreshOnMiss = true) {
  // Safeguard
  if (name === undefined && jid === undefined && mentionName === undefined) {
    logger.error(`Invalid parameters provided to ${arguments.callee.name}()`);
    return;
  }
  
  // Search for user in cached list
  let user;
  for (let key in this.users) {
    if (name !== undefined && key === name) { user = this.users[key]; break; }
    else if (jid !== undefined && this.users[key].jid === jid) { user = this.users[key]; break; }
    else if (mentionName !== undefined && this.users[key].mentionName === mentionName) { user = this.users[key]; break; }
  }
  
  // If not found, refresh cache
  if (user === undefined && refreshOnMiss) {
    this.refreshUsers();
    
    for (let key in this.users) {
      if (name !== undefined && key === name) { user = this.users[key]; break; }
      else if (jid !== undefined && this.users[key].jid === jid) { user = this.users[key]; break; }
      else if (mentionName !== undefined && this.users[key].mentionName === mentionName) { user = this.users[key]; break; }
    }
  }
  
  return user;
}

bot.refreshUsers = function() {
  // Refresh users list
  logger.info('Refreshing user list');
  users = {};
  
  this.getRoster((err, roster, stanza) => {
    for (user of roster) {
      user.mentionName = `@${user.mention_name}`;
      delete user.mention_name;
      users[user.name] = user;
    }
  });
  
  this.users = users;
}