"use strict";

const spawn = require('child_process').spawn;

class NPMInstallTask {
  constructor(options) {
    options = options || {};
    this.distDir = options.distDir;
    this.log = options.log;
  }

  run() {
    return this.runNPMInstall();
  }

  runNPMInstall() {
    return new Promise((resolve, reject) => {
      let distDir = this.distDir;

      this.log(`running npm install in ${distDir}`);

      let npmInstall = spawn('npm', ['install'], {
        cwd: distDir
      });

      let log = data => this.log(data, { verbose: true });

      npmInstall.stdout.on('data', log);
      npmInstall.stderr.on('data', log);

      npmInstall.on('close', code => {
        if (code === 0) resolve();
        else reject();
      });
    });
  }
}

module.exports = NPMInstallTask;
