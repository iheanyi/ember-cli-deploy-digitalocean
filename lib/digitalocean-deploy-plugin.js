var DeployPlugin = require('ember-cli-deploy-plugin');
var path = require('path');

module.exports = DeployPlugin.extend({
  defaultConfig: {
    environment: 'production',
    outputPath: path.join('tmp', 'fastboot-dist'),
    zipPath: path.join('tmp', 'fastboot-dist')
  }
});
