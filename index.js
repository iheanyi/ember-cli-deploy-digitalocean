/* jshint node: true */
'use strict';
var DeployPluginBase = require('ember-cli-deploy-plugin');
var path = require('path');
var DigitalOceanDeployPlugin = require('./lib/digitalocean-deploy-plugin');
var ProvisionCommand = require('./lib/commands/provision');

module.exports = {
  name: 'ember-cli-deploy-digitalocean',

  includedCommands: function() {
    return { 'do:provision': ProvisionCommand };
  },

  createDeployPlugin: function(options) {
    return new DigitalOceanDeployPlugin({
      name: options.name
    });  
  }
};
