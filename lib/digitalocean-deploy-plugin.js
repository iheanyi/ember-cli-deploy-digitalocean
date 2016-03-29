var DeployPlugin = require('ember-cli-deploy-plugin');
var SSHClient = require('ssh2').Client;
var SCPClient = require('scp2');
var path = require('path');

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
    this.config = config;
    this._super.configure.apply(this, arguments);
  },
  willUpload: function(context) {
    console.log("In willUpload!");
    var self = this;

    return new Promise((resolve, reject) => {
      var conn = this.conn;
      conn.on('ready', () => {
        conn.exec('sudo apt-get update -y; sudo apt-get upgrade -y; sudo apt-get install -y nginx gcc build-essential', function(err, stream) {
          if (err) throw err;
          stream.on('data', function(data) {
            console.log('STDOUT: ' + data);
          }).on('end', function(data) {
            console.log('Ending connection!');
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
  },
  upload: function(context) {
    this.log('Uploading assets to the droplet!');

    var scpConfig = {
      host: this.config.ipAddress,
      port: 22,
      username: process.env.DROPLET_USERNAME || 'root',
      privateKey: require('fs').readFileSync(process.env.PRIVATE_KEY_DIR),
      password: process.env.DROPLET_PASSWORD,
      passphrase: process.env.PASSPHRASE,
      path: '/etc/nginx/sites-enabled/ember-app'
    };

    var scpClient = SCPClient;
    var fileClient = new SCPClient.Client(scpConfig);
    return new Promise((resolve, reject) => {
      scpClient.scp(context.distDir, scpConfig, (err) => {
        if (err) {
          throw err;
        }

        const nginxConfig = Object.assign({}, scpConfig, {
          path: '/etc/nginx/nginx.conf',
        });

        fileClient.upload('./node_modules/ember-cli-deploy-digitalocean/nginx.conf', '/etc/nginx/nginx.conf', function(err) {
          console.log('Copyign configuration file!');
          if (err) {
            console.log(err);
            throw err;
          }

          console.log('Copied correctly!');
          return resolve();
        });
      });
    });
  },
  didUpload: function(context) {
    var conn = this.conn;

    this.log('Done uploading!');
    this.log('Starting application!');
    return new Promise((resolve, reject) => {

      console.log('Deploying app!');
      conn.on('ready', () => {

        console.log('Ready to deploy!');
        conn.exec("sudo service nginx stop; service nginx start;  \
                  npm install -g ember-fastboot-server; \
                  cd /etc/nginx/sites-enabled/ember-app; \
                  npm install; \
                  ember-fastboot . &", (err, stream) => {
                  if (err) throw err;
                    stream.on('data', (data) => {
                      console.log('STDOUT: ' + data);
                    }).on('end', (data) => {
                      console.log('Ending connection!');
                      this.log("We're in business!");
                      return resolve();
                    }).stderr.on('data', function(data) {
                      console.log('STDERR: ' + data);
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
    })
  }
});
