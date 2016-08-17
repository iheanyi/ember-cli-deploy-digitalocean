#!/usr/bin/bash

# TODO - Check Architecture of server
if uname -a | grep Ubuntu; then
  arch = "Debian"
  install_cmd = "apt-get"
fi

# Update apt-get packages and all that.
sudo apt-get update -y
sudo apt-get upgrade -y

# Install NGINX if necessary
if which nginx; then
  echo "NGINX is already installed."
else
  echo "NGINX isn't installed."
  echo "Installing NGINX."
  sudo apt-get install -y nginx gcc build-essential
fi

# Install Node.js if necessary
if which node; then
  echo "Node.js is installed."
else
  echo "Node.js isn't installed."
  echo "Installing Node.js"
  sudo apt-get install -y nodejs
fi

# Install NPM if necessary
if which npm; then
  echo "NPM is installed."
else
  echo "NPM isn't installed."
  echo "Installing npm."
fi

# Install Ember Fastboot if necessary
if which ember-fastboot; then
  echo "Ember Fastboot installed."
else
  echo "Ember Fastboot isn't installed."
  echo "Install Ember Fastboot"
  npm install -g ember-fastboot
fi

npm install -g fastboot-app-server
npm install -g fastboot-fs-notifier
mkdir -p /opt/app/releases

# Upload server.js and start it up if necessary.
# TODO: Perhaps add in logic for checking what the architecture is. 
