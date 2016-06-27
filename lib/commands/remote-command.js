"use strict";

class RemoteCommandTask {
  constructor(options) {
    options = options || {};
    this.command = options.command;
    this.log = options.log;
    this.conn = options.conn;
    this.ipAddress = options.ipAddress;
  }

  run() {
    return runRemoteCommand();
  }

  runRemoteCommand() {
    return new Promise((resolve, reject) => {
      var conn = this.conn;
      var command = this.command;
      conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) reject(err);

          stream.on('data', (data) => {
            this.log('STDOUT: ' + data);
          }).on('end', (data) => {
            resolve();
          });
        })
      }).connect({
        host: this.ipAddress,
        port: 22,
        username: process.env.DROPLET_USERNAME || 'root',
        privateKey: require('fs').readFileSync(process.env.PRIVATE_KEY_DIR),
        password: process.env.DROPLET_PASSWORD,
        passphrase: process.env.PASSPHRASE,
      });
    });
  }
}
