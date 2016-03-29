# Ember-cli-deploy-digitalocean

This README outlines the details of collaborating on this Ember addon.

## Installation

* `git clone` this repository
* `npm install`
* `bower install`

## Environment Variables

* `DO_ACCESS_TOKEN` - Your DigitalOcean API key. Generate one
  [https://cloud.digitalocean.com/settings/api/tokens](here).
* `PRIVATE_KEY_DIR` - Location of your private SSH key used for your droplet.
* `PASSPHRASE` - Passphrase for the SSH key.
* `DROPLET_USERNAME` - Username to log into the droplet as (defaults to `root`)
* `DROPLET_PASSWORD` - Password to log into the droplet as (can be left blank if
  unused)

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
