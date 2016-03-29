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

## Deploying
Run `ember do:provision` in order to provision a droplet for usage with
FastBoot. This step must be run in order for FastBoot to work correctly on your
droplet. After this is setup, just run `ember deploy <environment>` and you're
good to go.
