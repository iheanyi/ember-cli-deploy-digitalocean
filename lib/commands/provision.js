var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var Promise = require('rsvp').Promise;
var DigitalOcean = require('do-wrapper');
var SSHClient = require('ssh2').Client;
var RemoteCommandTask = require('../tasks/remote-command');

var CREATE_NEW_DROPLET = 'Create a new droplet';
var UBUNTU_IMAGE_SLUG = 'ubuntu-14-04-x64';
var NODE_IMAGE_SLUG = 'node';
var YAML = require('yamljs');

module.exports = {
  name: 'do:provision',

  description: 'Provisions a DigitalOcean Droplet for FastBoot',

  run: function() {
    var ACCESS_TOKEN = process.env.DO_ACCESS_TOKEN;
    if (!ACCESS_TOKEN) {
      console.log('Access token not provided!');
      throw new Error('Environment Variable DO_ACCESS_TOKEN is not set!');
    }

    var api = new DigitalOcean(ACCESS_TOKEN);
    var ui = this.ui;

    this.api = api;

    var dropletsPromise = new Promise((resolve, reject) => {
      this.api.dropletsGetAll({}, function(err, res, body) {
        if (err) {
          reject(err);
        }

        resolve(body.droplets);
      });
    });

    var regionsPromise = new Promise((resolve, reject) => {
      this.api.regionsGetAll({}, function(err, res, body) {
        if (err) {
          reject(err);
        }

        resolve(body.regions);
      });
    });

    var keysPromise = new Promise((resolve, reject) => {
      this.api.accountGetKeys({}, function(err, res, body) {
        if (err) {
          reject(err);
        }

        resolve(body.ssh_keys);
      });
    });

    var dropletSizesPromise = new Promise((resolve, reject) => {
      this.api.sizesGetAll({}, function(err, res, body) {
        if (err) {
          reject(err);
        }

        resolve(body.sizes);
      });
    });

    var dropletImagesPromise = new Promise((resolve, reject) => {
      this.api.imagesGetAll({type: 'application'}, function(err, res, body) {
        if (err) {
          reject(err);
        }

        resolve(body.images);
      })
    });

    return Promise.all([dropletsPromise, regionsPromise, keysPromise, dropletSizesPromise]).then((values) => { 
      var droplets = values[0];
      var regions = values[1];
      var userKeys = values[2];
      var dropletSizes = values[3];
      
      this.droplets = droplets;
      this.regions = regions.filter((region) => {
        return region.available === true;
      });
      this.userKeys = userKeys;
      this.dropletSizes = dropletSizes;

      this.ui.writeLine(chalk.green('Provisioning Droplet for Fastboot\n'));

      return this.askQuestions()
      .then(this.createDropletIfNeeded.bind(this), (err) => {
        console.log("Error with DigitalOcean's API!");
        throw new Error(err);
      })
      .then(this.writeConfiguration.bind(this), (err) => {
        console.log("Error writing configuation!");
        throw new Error(err);
      })
      .then(this.provisionDroplet.bind(this), (err) => {
        console.log("Error provisioning droplet!");
        throw new Error(err);
      });
    });
  },
  provisionDroplet: function() {
    const conn = new SSHClient();

    const provisionCommand = fs.readFileSync('scripts/provision-droplet.sh', {encoding: 'utf8'});
    console.log(this.answers);

    console.log(this.ui);
    console.log(this.ui.writeLine);
    var provisionTask = new RemoteCommandTask({
      log: console.log.bind(this),
      command: provisionCommand,
      conn: conn,
      ipAddress: this.answers.droplet.networks.v4[0].ip_address,
    });

    return provisionTask.run();
  },
  createDropletIfNeeded: function() {
    var answers = this.answers;

    if (answers.dropletName !== undefined) {
      // Call DigitalOcean's API and create a new droplet.
      var sshKeyIds = answers.sshKeys.map(_key => {
        return _key.id;
      });

      var payload = {
        name: answers.dropletName,
        region: answers.newDropletRegion,
        size: answers.newDropletSize,
        ssh_keys: sshKeyIds,
        image: NODE_IMAGE_SLUG,
      };

      return this.createDroplet(payload)
      .then(droplet => {
        answers.droplet = droplet;
      });
    }

    answers.dropletName = answers.droplet.name;
  },
  createYaml: function() {
    var sshKeys = this.answers.sshKeys.map(_key => {
      return _key.public_key;
    });

    var deployUser = {
      name: "deploy",
      groups: "sudo",
      shell: "/bin/bash",
      sudo: [
        "ALL=(ALL) NOPASSWD:ALL"
      ],
      "ssh-authorized-keys": sshKeys,
    };

    // Get the nginx.conf and copy it to the shit.
    // We wanna run commands and all that.
    var runCommands = [
      "sudo apt-get update; sudo apt-get install nginx"
    ];

  },
  createDroplet: function(payload) {
    var ui = this.ui;
    var api = this.api;

    var createDropletPromise = new Promise((resolve, reject) => {
      ui.startProgress('Creating droplet ' + payload.name);



      this.api.dropletsCreate(payload, (err, res, body) => {
        if (err) {
          ui.stopProgress();
          throw new Error(err);
        }

        var dropletId = body.droplet.id;
        this.api.dropletsGetById(body.droplet.id, (err, res, dropletBody) => {
          resolve(dropletBody.droplet);
          ui.stopProgress();
        });
      });
    });

    return createDropletPromise;
  },
  askQuestions: function() {
    var ui = this.ui;
    var self = this;

    var questions = buildQuestions(this.droplets, this.regions, this.userKeys, this.dropletSizes);
    return ui.prompt(questions).then((answers) => {
      this.answers = answers;
    });
  },
  writeConfiguration: function() {
    var environmentName = this.answers.environmentName;
    var dropletName = this.answers.dropletName;
    var ipAddress = this.answers.droplet.networks.v4[0].ip_address;
    var configPath = '.env.deploy.' + environmentName;
    var outputs = this.outputs;

    var config = "FASTBOOT_DO_APPLICATION=" + dropletName + "\n" + 
      "FASTBOOT_DO_IP=" + ipAddress + "\n" + 
      "FASTBOOT_DO_ENVIRONMENT=" + environmentName + "\n" + 
      "FASTBOOT_DO_ID=" + this.answers.droplet.id;

          fs.writeFileSync(configPath, config);

          this.ui.writeLine('Wrote configuration to ' + configPath + ':');
          this.ui.write('\n' + config + '\n');
          this.ui.writeLine(chalk.green('Run ' + 
                                        chalk.blue('ember deploy ' + environmentName) + 
                                          ' to deploy your app, then visit ' + chalk.blue(ipAddress)));
  }
};

// For Distribution, default to installing on Ubuntu 14.04 x64.

function buildQuestions(droplets, regions, userKeys, dropletSizes) {
  return [{
    name: 'droplet',
    message: 'Which DigitalOcean droplet would you like to use?',
    type: 'rawlist',
    choices: function() {
      var choices = droplets.map((droplet) => {
        return {
          name: droplet.name,
          value: droplet,
        };
      });

      choices.push(CREATE_NEW_DROPLET);
      return choices;
    }
  }, {
    name: 'environmentName',
    message: 'Which environment?',
    type: 'rawlist',
    choices: ['development', 'staging', 'production']
  }, {
    name: 'newDropletRegion',
    message: 'Which region do you want to create this droplet in?',
    type: 'rawlist',
    choices: function() {
      var choices = regions.map((region) => {
        return {
          name: region.name,
          value: region.slug,
          sizes: region.sizes,
        };
      });
      return choices;
    },
    when: function(answers) {
      return answers.droplet === CREATE_NEW_DROPLET;
    }
  }, {
    name: 'sshKeys',
    message: 'Which SSH keys do you want to use for this droplet?',
    type: 'checkbox',
    validate: function(input) {
      if (input.length === 0) {
        return 'Please add at least one SSH key for the provisioning to work correctly.';
      }

      return true;
    },
    choices: function() {
      var choices = userKeys.map((sshKey) => {
        return {
          name: sshKey.name,
          value: sshKey,
        };
      });

      return choices;
    },
    when: function(answers) {
      return answers.droplet === CREATE_NEW_DROPLET;
    }
  }, {
    name: 'newDropletSize',
    message: 'What size should this droplet be? (At least 1GB recommended)',
    type: 'rawlist', 
    choices: function() {
      var choices = dropletSizes.map((size) => {
        return {
          name: size.slug + "/" + 
            size.vcpus + " CPU(s) - " + 
              size.disk + "GB SSD Disk ($" + size.price_monthly + "/mo)",
              value: size.slug,
        };
      });

      return choices;
    },
    when: function(answers) {
      return answers.droplet === CREATE_NEW_DROPLET;
    }
  }, {
    name: 'dropletName',
    message: 'What should we name this droplet?',
    type: 'input',
    when: function(answers) {
      return answers.droplet === CREATE_NEW_DROPLET;
    }
  }
  ];
}
