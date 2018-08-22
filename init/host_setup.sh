#!/bin/bash

DAMEON_DIR=/usr/local/bin/proteus-test-daemon
echo "Installing test daemon"

sudo apt-get update -y
sudo apt-get install curl libunwind8 gettext apt-transport-https dirmngr pigpio -y
sudo systemctl enable pigpiod
sudo apt-get install build-essential python3-gpiozero python3-pigpio python3-pip dfu-util -y
sudo pip3 install requests pyserial junit_xml flatbuffers

sudo mkdir -p $DAMEON_DIR || exit 1

sudo cp init/proteus-test-daemon.service /lib/systemd/system/
sudo chmod 644 /lib/systemd/system/proteus-test-daemon
sudo systemctl daemon-reload
sudo systemctl enable proteus-test-daemon.service

sudo cp -r src/* $DAMEON_DIR
sudo cp -n init/config.default $DAMEON_DIR/.config

echo "0.0.0-0" | sudo tee $DAMEON_DIR/build_log.txt
sudo chmod -R 755 $DAMEON_DIR

sudo apt-get remove --purge node* npm* -y
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get update
sudo apt-get install nodejs -y

bash <( curl -sL https://particle.io/install-cli )
curl -sSL -o "$HOME/50-particle.rules" https://docs.particle.io/assets/files/50-particle.rules
sudo cp '$HOME/50-particle.rules' '/etc/udev/rules.d/'

echo "Set these environment variables in /usr/local/bin/proteus-test-daemon/.config"
echo "PARTICLE_PLATFORM=<electron|photon>"
echo "CI_API_TOKEN=<api token>"
echo "A reboot is recommended"
