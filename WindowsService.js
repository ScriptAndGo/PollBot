// -----------------------------------------------------------------------------
// Dependencies
// -----------------------------------------------------------------------------
var path = require('path');

var Service = require('node-windows').Service;
var parseArgs = require('minimist')



// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------
// Create service object
var svc = new Service({
  name: 'PollBot',
  description: 'HipChat bot for simple question polls and restaurant polls.',
  script: path.join(__dirname, 'PollBot.js'),
});

// Parse arguments
var argv = parseArgs(process.argv.slice(2))
var validArg = false;
var reinstallFlag = false;
var restartFlag = false;

// Install
if (argv.install) {
  validArg = true;
  install();
}

// Uninstall
else if (argv.uninstall) {
  validArg = true;
  uninstall();
}

// Reinstall / update
else if (argv.reinstall || argv.update) {
  validArg = true;
  reinstallFlag = true;
  uninstall();
}

// Start
else if (argv.start) {
  validArg = true;
  start();
}

// Stop
else if (argv.stop) {
  validArg = true;
  stop();
}

// Restart
else if (argv.restart) {
  validArg = true;
  stop();
  restartFlag = true;
}

// Invalid arguments
else if (validArg === false) {
  var usage = `Invalid arguments.
Usage:
  node WindowsService.js --install
  node WindowsService.js --uninstall
  node WindowsService.js --reinstall
  node WindowsService.js --update
  
  node WindowsService.js --start
  node WindowsService.js --stop
  node WindowsService.js --restart`
  console.log(usage);
}


// -----------------------------------------------------------------------------
// Event handlers
// -----------------------------------------------------------------------------
svc.on('install', function() {
  console.log('Install complete!');  
  if (svc.exists) {
    console.log('Starting service...');
    svc.start();
  }
});

svc.on('alreadyinstalled', function() {
  console.log('Service is already installed.');
  console.log('Starting service...');
  svc.start();
});

svc.on('uninstall', function() {
  console.log('Uninstall complete!');
  if (reinstallFlag) {
    install();
  }
});

svc.on('start', function() {
  console.log('Service up and running!');
});

svc.on('stop', function() {
  console.log('Service stopped!');
  if (restartFlag) {
    start();
  }
});

svc.on('error', function() {
  console.log('An error occurred!');
});



// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------
function install() {
  // Safeguard
  if (svc.exists) {
    console.log('Service already installed, nothing to do.!');
    return;
  }
  
  console.log('Installing service...');
  svc.install();
}

function uninstall() {
  if (!svc.exists) {
    console.log('Service does not exist, nothing to do.');
    return;
  }
  
  console.log('Uninstalling service...');
  svc.uninstall();
}

function start() {
  // Safeguard
  if (!svc.exists) {
    console.log('Service does not exist, install it first!');
    return;
  }
  
  svc.start();
}

function stop() {
  // Safeguard
  if (!svc.exists) {
    console.log('Service does not exist, install it first!');
    return;
  }
  
  svc.stop();
}