var DeployPlugin = require('ember-cli-deploy-plugin');
var SSHClient = require('ssh2').Client;
var SCPClient = require('scp2');
var path = require('path');
var RSVP = require('rsvp');
var NPMInstallTask = require('./tasks/npm-install');
var RemoteCommandTask = require('./tasks/remote-command');
var UploadAppTask = require('./tasks/upload-app');
var UploadFileTask = require('./tasks/upload-file');

const CONFIG_ENV_MAPPING = {
  FASTBOOT_DO_APPLICATION: 'dropletName',
  FASTBOOT_DO_IP: 'ipAddress',
  FASTBOOT_DO_ENVIRONMENT: 'environmentName',
  FASTBOOT_DO_ID: 'dropletId',
};


module.exports = DeployPlugin.extend({
  defaultConfig: {
    environment: 'production',
    distDir: function(context) {
      return context.distDir;
    },
    distFiles: function(context) {
      return context.distFiles || [];
    },
    fastbootDistDir: function(context) {
      return context.fastbootDistDir;
    },
    fastbootDistFiles: function(context) {
      return context.fastbootDistFiles;
    },
  },

  requiredConfig: ['environment'],

  configure: function() {
    var config = this.pluginConfig;

    for (var key in CONFIG_ENV_MAPPING) {
      if (process.env[key]) {
        config[CONFIG_ENV_MAPPING[key]] = process.env[key];
      }
    }

    this.conn = new SSHClient();
    this.scpConfig = {
      host: config.ipAddress,
      port: 22,
      username: process.env.DROPLET_USERNAME || 'root',
      privateKey: require('fs').readFileSync(process.env.PRIVATE_KEY_DIR),
      password: process.env.DROPLET_PASSWORD,
      passphrase: process.env.PASSPHRASE,
      path: '/etc/nginx/sites-enabled/ember-app'
    };

    this.scpClient = SCPClient;

    const nginxConfig = Object.assign({}, this.scpConfig, {
      path: '/etc/nginx/nginx.conf',
    });


    this.fileClient = new SCPClient.Client(nginxConfig);
    this.config = config;
    this._super.configure.apply(this, arguments);
  },
  willUpload: function(context) {
    var self = this;
    var distDir = context.distDir;

    var npmInstallTask = new NPMInstallTask({
      log: this.log.bind(this),
      distDir: distDir
    });

    return npmInstallTask.run().catch(err => {
      throw err;
    });
  },
  upload: function(context) {
    this.log('Uploading assets to the droplet!');

    var scpClient = this.scpClient;

    var fileClient = this.fileClient;
    var uploadAppTask = new UploadAppTask({
      scpClient: this.scpClient,
      distDir: context.distDir,
      scpConfig: this.scpConfig,
      log: this.log.bind(this),
    });

    var uploadNginxConfigTask = new UploadFileTask({
      localFile: './node_modules/ember-cli-deploy-digitalocean/templates/nginx.conf',
      remoteFile: '/etc/nginx/nginx.conf',
      scpClient: this.fileClient,
      log: this.log.bind(this),
    });

    return uploadAppTask.run()
    .then(() => {
      return uploadNginxConfigTask.run();
    });
  },
  didUpload: function(context) {
    var conn = this.conn;

    this.log('Done uploading!');
    this.log('Starting application!');
    var fileClient = this.fileClient;

    var uploadFastbootConfigTask = new UploadFileTask({
      localFile: './node_modules/ember-cli-deploy-digitalocean/templates/fastboot.conf',
      remoteFile: '/etc/init/fastboot.conf',
      scpClient: this.fileClient,
      log: this.log.bind(this),
    });


    var restartServicesCommand = [
      "sudo service nginx restart",
      "sudo service fastboot restart"
    ].join(';');

    var restartServicesTask = new RemoteCommandTask({
      log: this.log.bind(this),
      command: restartServicesCommand,
      conn: this.conn,
      ipAddress: this.config.ipAddress,
    });

    return uploadFastbootConfigTask.run()
    .then(() => {
      this.log('Finished uploading Fastboot init script.');
      return restartServicesTask.run()
      .then(() => {
        this.log("Fastboot application has been uploaded and started!");
      });
    });
  }
});
