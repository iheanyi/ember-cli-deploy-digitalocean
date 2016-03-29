var DeployPlugin = require('ember-cli-deploy-plugin');
var SSHClient = require('ssh2').Client;
var SCPClient = require('scp2');
var path = require('path');
var RSVP = require('rsvp');
var exec = RSVP.denodeify(require('child_process').exec);

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

    return exec("cd " + context.distDir + "; npm install; cd ..", {
      cwd: path.dirname(context.distDir)
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        var conn = this.conn;
        conn.on('ready', () => {
          conn.exec('sudo apt-get update -y; sudo apt-get upgrade -y; sudo apt-get install -y nginx gcc build-essential; rm /etc/nginx/sites-enabled/default;', (err, stream) => {
            if (err) throw err;
            stream.on('data', (data) => {
              this.log('STDOUT: ' + data);
            }).on('end', (data) => {
              resolve();
            });
          })      
        }).connect({
          host: this.config.ipAddress,
          port: 22,
          username: process.env.DROPLET_USERNAME || 'root',
          privateKey: require('fs').readFileSync(process.env.PRIVATE_KEY_DIR),
          password: process.env.DROPLET_PASSWORD,
          passphrase: process.env.PASSPHRASE,
        });
      });  
    }).catch(err => {
      throw err;
    });
  },
  upload: function(context) {
    this.log('Uploading assets to the droplet!');

    var scpClient = this.scpClient;

    var fileClient = this.fileClient;

    return new Promise((resolve, reject) => {
      scpClient.scp(context.distDir, this.scpConfig, (err) => {
        if (err) {
          throw err;
        }


        fileClient.upload('./node_modules/ember-cli-deploy-digitalocean/templates/nginx.conf', '/etc/nginx/nginx.conf', (err) => {
          if (err) {
            this.log(err);
            throw err;
          }

          return resolve();
        });
      });
    });
  },
  didUpload: function(context) {
    var conn = this.conn;

    this.log('Done uploading!');
    this.log('Starting application!');
    var fileClient = this.fileClient;

    return new Promise((resolve, reject) => {
      fileClient.upload('./node_modules/ember-cli-deploy-digitalocean/templates/fastboot.conf', '/etc/init/fastboot.conf', err => {
        if (err) {
          this.log(err, {color: 'red'});
          throw err;
        }

        this.log('Finished uploading init script.');

        conn.on('ready', () => {
          conn.exec("sudo service nginx restart; \
            sudo service fastboot restart;", (err, stream) => {
              if (err) throw err;
                stream.on('data', (data) => {
                this.log('STDOUT: ' + data);
              }).on('end', (data) => {
                this.log("We're in business!");
                  return resolve();
                }).stderr.on('data', (data) => {
                  this.log('STDERR: ' + data);
                });
          })
        }).connect({
          host: this.config.ipAddress,
          port: 22,
          username: process.env.DROPLET_USERNAME || 'root',
          privateKey: require('fs').readFileSync(process.env.PRIVATE_KEY_DIR),
          password: process.env.DROPLET_PASSWORD,
          passphrase: process.env.PASSPHRASE,
        });
      });
    })
  }
});
