"use strict";

class UploadAppTask {
  constructor(options) {
    options = options || {};
    this. distDir = options.distDir;
    this.scpClient = options.scpClient;
    this.scpConfig = options.scpConfig
  }

  run() {
    return this.runUploadApp();
  }

  runUploadApp() {
    return new Promise((resolve, reject) => {
      var scpClient = this.scpClient;

      scpClient.scp(this.distDir, this.scpConfig, err => {
        if (err) {
          reject(err);
        }

        resolve();
      });
    });
  }
}

module.exports = UploadAppTask;
