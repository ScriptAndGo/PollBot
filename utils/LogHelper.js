// -----------------------------------------------------------------------------
// Module definition
// -----------------------------------------------------------------------------
module.exports.name = 'LogHelper';



// -----------------------------------------------------------------------------
// loglevel definition
// -----------------------------------------------------------------------------
// Possible values: 'silent', 'error', 'warn', 'info', 'debug', 'trace'
module.exports.setLevel = function(logger, level) {
  level = loglevelToNumber(logger, level);
  module.exports.level = level;
}

module.exports.logLevelMessagePrefix = function(name) {
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
const loglevelToNumber = function loglevelToNumber(logger, level) {
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

module.exports.log = function(logger, level) {
  level = loglevelToNumber(logger, level);
  
  let func;
  switch (level) {
    case logger.levels.TRACE:
      func = logger.trace;
      break;
    case logger.levels.DEBUG:
      func = logger.debug;
      break;
    case logger.levels.INFO:
      func = logger.info;
      break;
    case logger.levels.WARN:
      func = logger.warn;
      break;
    case logger.levels.ERROR:
      func = logger.error;
      break;
  }
  
  return func;
}

module.exports.functionCall = function(logger, functionName, functionArgs = {}, level = logger.levels.DEBUG) {
  level = loglevelToNumber(logger, level);
  
  args = []
  if (functionArgs !== undefined) {
    for (let key in functionArgs) {
      args.push('\n  ' + key + ':');
      args.push(functionArgs[key]);
    }
  }
  
  if (logger.getLevel() <= level) {
    module.exports.log(logger, level)(functionName + '()', ...args);
  }
}

module.exports.functionCallDebug = function(logger, functionName, debugFunctionArgs, defaultFunctionArgs = {}, level = logger.levels.DEBUG) {
  level = loglevelToNumber(logger, level);
  module.exports.functionCall(logger, functionName, (level <= logger.levels.DEBUG) ? debugFunctionArgs : defaultFunctionArgs, level);
}