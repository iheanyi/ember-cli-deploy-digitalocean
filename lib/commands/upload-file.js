"use strict";

class UploadFileTask {
  constructor(options) {
    options = options || {};
    this.log = options.log;
    this.scpClient = options.scpClient;
    this.distDir = options.distDir;
    this.localFile = options.localFile;
    this.remoteFile = options.remoteFile; 
  }

  run() {
    return this.runUploadFile();
  }

  runUploadFile() {
    var localFile = this.localFile;
    var remoteFile = this.remoteFile;

    return new Promise((resolve, reject) => {
      this.scpClient.upload(localFile, remoteFile, err => {
        if (err) {
          this.log(err, {color: 'red'});
          reject(err);
        }
        
        resolve();
      });
    });
  }
}

module.exports = UploadFileTask;
