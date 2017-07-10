var path = require('path');
var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name: 'PollBot',
  description: 'HipChat bot for simple question polls and restaurant polls.',
  script: path.join(__dirname, 'PollBot.js'),
});

// Install handler
svc.on('install', function() {
  console.log('Install complete.');
  svc.start();
});

// Uninstall handler
svc.on('uninstall', function() {
  console.log('Uninstall complete.');
  console.log('The service exists:', svc.exists);
});

svc.install();
//svc.uninstall();