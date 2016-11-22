const FastbootAppServer = require('fastboot-app-server');
const FSNotifier = require('fastboot-fs-notifier');

let notifier = new FSNotifier({
  targetDir: '/opt/releases/current_release'
});

let server = new FastbootAppServer({
  distPath: '/opt/releases/current_release',
  notifier
});

server.start();
