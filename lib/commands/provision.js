var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var Promise = require('rsvp').Promise;
var DigitalOcean = require('do-wrapper');

var CREATE_NEW_DROPLET = 'Create a new droplet';

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


      this.ui.writeLine(chalk.green('Provisioning Droplet for Fastboost\n'));

      return this.askQuestions();
    }).catch((err) => {
        console.log('There was an error communicating with DigitalOcean\'s API!');
        throw new Error(err);
      });;
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
          value: droplet.slug,
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

      if (!!input) {
        return true;
      } else {
        return 'Please add at least one SSH key for the provisioning to work correctly.';
      }
    },
    choices: function() {
      var choices = userKeys.map((sshKey) => {
        return {
          name: sshKey.name,
          value: sshKey.id,
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
    name: 'newDropletName',
    message: 'What should we name this droplet?',
    type: 'input',
    when: function(answers) {
      return answers.droplet === CREATE_NEW_DROPLET;
    }
  }
  ];
}
