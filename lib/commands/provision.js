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
    console.log('Testing the provision command.');
    var ACCESS_TOKEN = process.env.DO_ACCESS_TOKEN;
    if (!ACCESS_TOKEN) {
      console.log('Access token not provided!');
      throw new Error('Environment Variable DO_ACCESS_TOKEN is not set!');
    }

    this.do = new DigitalOcean(ACCESS_TOKEN);

    this.do.account(function (err, res, body) {
      if(err) {
        console.log('Error thrown!');
        console.log(err);
      }
      console.log('This is the response!');
      console.log(body);

      return this.ui.writeLine(chalk.green('Provisioning Droplet for Fastboot\n'));
    });

  },
};

// For Distribution, default to installing on Ubuntu 14.04 x64.

function buildQuestions(droplets) {
  return [{
    name: 'droplet',
    message: 'Which DigitalOcean droplet would you like to use?',
    type: 'rawlist',
    choices: function() {
      choices = droplets.map(function(droplet) {
        return {
          name: '',
          value: {}
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
      var choices = [];
      return choices;
    },
    when: function(answers) {
      return answers.droplet === CREATE_NEW_DROPLET;
    }
  }, {
    name: 'sshKeyLocation',
    message: 'Enter the path to the SSH key to be used with this droplet: ',
    type: 'input',
    when: function(answers) {
      return answers.droplet === CREATE_NEW_DROPLET;
    }
  }, {
    name: 'newDropletSize',
    message: 'What size should this droplet be? (Recommended Size - >= 1GB, 512MB requires a swapfile on the droplet)',
    choices: function() {
      var choices = [];
      return choices;
    },
    when: function(answers) {
      return answers.droplet === CREATE_NEW_DROPLET;
    }
  }, {
    name: 'newDropletName',
    message: 'What is the server name of the droplet?',
    type: 'input',
    when: function(aswers) {
      return answers.droplet === CREATE_NEW_DROPLET;
    }
    }
  ];
}
