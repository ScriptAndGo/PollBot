// -----------------------------------------------------------------------------
// Module definition
// -----------------------------------------------------------------------------
module.exports.name = 'LogHelper';



// -----------------------------------------------------------------------------
// loglevel definition
// -----------------------------------------------------------------------------
// Possible values: 'silent', 'error', 'warn', 'info', 'debug', 'trace'
module.exports.setLevel = function setLevel(logger, level) {
  level = loglevelToNumber(logger, level);
  module.exports.level = level;
}

module.exports.logLevelMessagePrefix = function logLevelMessagePrefix(name) {
  return {  
    staticPrefixes: [name],
    prefixFormat: '[%p]',
    options: {
      timestamp: {
        locale: 'fr-FR'
      }
    }
  }
};



// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------
function loglevelToNumber(logger, level) {
  if (typeof level === 'string' && logger.levels[level.toUpperCase()] !== undefined) {
    level = logger.levels[level.toUpperCase()];
  }
  if (typeof level === 'number' && level >= 0 && level <= logger.levels.SILENT) {
    return level;
  }
  else {
    console.log('Invalid level value: ' + level);
    return;
  }
}

module.exports.log = function log(logger, level) {
  level = loglevelToNumber(logger, level);
  
  switch (level) {
    case logger.levels.TRACE:
      var func = logger.trace;
      break;
    case logger.levels.DEBUG:
      var func = logger.debug;
      break;
    case logger.levels.INFO:
      var func = logger.info;
      break;
    case logger.levels.WARN:
      var func = logger.warn;
      break;
    case logger.levels.ERROR:
      var func = logger.error;
      break;
  }
  
  return func;
}

module.exports.functionCall = function functionCall(logger, functionName, functionArgs = {}, level = logger.levels.DEBUG) {
  level = loglevelToNumber(logger, level);
  
  args = []
  if (functionArgs !== undefined) {
    Object.keys(functionArgs).forEach(function(key) {
      args.push('\n  ' + key + ':');
      args.push(functionArgs[key]);
    });
  }
  
  if (logger.getLevel() <= level) {
    module.exports.log(logger, level)(functionName + '()', ...args);
  }
}

module.exports.functionCallDebug = function functionCallDebug(logger, functionName, debugFunctionArgs, defaultFunctionArgs = {}, level = logger.levels.DEBUG) {
  level = loglevelToNumber(logger, level);
  module.exports.functionCall(logger, functionName, (level <= logger.levels.DEBUG) ? debugFunctionArgs : defaultFunctionArgs, level);
}