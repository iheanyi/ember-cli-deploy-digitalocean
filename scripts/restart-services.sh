if service nginx status; then
  echo "NGINX is currently running."
  echo "Restarting the NGINX server."
  sudo service nginx reload
  # Execute server restart logic here.
else
  echo "Nginx server isn't currently running."
  echo "Starting Nginx."
  sudo service nginx start
  # Restart NGINX here.
fi

if service fastboot status; then
  echo "Restart Fastboot server."
else
  echo "Fastboot server isn't currently running."
  sudo service fastboot start
  # Start Fastboot Server
fi
