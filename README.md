# Ember-cli-deploy-digitalocean

This README outlines the details of collaborating on this Ember addon.

## Installation

* `git clone` this repository
* `npm install`
* `bower install`

## Necessary Environment Variables
* `DO_ACCESS_TOKEN` - Your DigitalOcean API token. Generate one
  [here](https://cloud.digitalocean.com/settings/api/tokens).

## Configuration Options

### privateKeyPath

Location of your private SSH key, used for SSHing/SCPing into the droplet.

Default: `process.env.PRIVATE_KEY_PATH`

### environment

The environment target for the FastBoot build, can be one of `development`,
`staging`, or `production`.

Default: `production`

### passphrase

The passphrase for the SSH key used to access the droplet.

Default: `process.env.SSH_KEY_PASSPHRASE`

### dropletUsername

Username to log into the droplet as.

Default: `process.env.DROPLET_USERNAME` or `root`.

### dropletPassword

Password to log into the droplet as (can be left blank if unused).

Default: `process.env.DROPLET_PASSWORD`

## Deploying
Run `ember do:provision` in order to provision a droplet for usage with
FastBoot. Note: The best droplet image to use is the `Node` one-click installer. This step must be run in order for FastBoot to work correctly on your
droplet. After this is setup, just run `ember deploy <environment>` and you're
good to go.

## Note
Please make sure you also have `ember-cli-deploy-build` installed. This may be
further refined through the use of a lightning pack, but for now, please just
install `ember-cli-deploy-build` as well.

Thanks to Tom and his [Elastic
Beanstalk](https://github.com/tomdale/ember-cli-deploy-elastic-beanstalk) plugin for a good starting/reference
point.
