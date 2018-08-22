#!/bin/bash

DAEMON_DIR=/usr/local/bin/proteus-test-daemon
echo "Installing test daemon"

sudo apt-get -qq update -y
sudo apt-get -qq install curl libunwind8 gettext apt-transport-https dirmngr pigpio -y
sudo systemctl enable pigpiod
sudo apt-get -qq install build-essential python3-gpiozero python3-pigpio python3-pip dfu-util -y
sudo pip3 install requests pyserial junit_xml flatbuffers -q

sudo mkdir -p $DAEMON_DIR || exit 1

sudo cp proteus-test-daemon.service /lib/systemd/system/proteus-test-daemon.service || exit 1
sudo chmod 644 /lib/systemd/system/proteus-test-daemon.service || exit 1

sudo cp ../*.py $DAEMON_DIR/proteus || exit 1
sudo cp ../LICENSE $DAEMON_DIR || exit 1
sudo cp -r ../appveyor/ $DAEMON_DIR/proteus || exit 1
sudo cp -n config.default $DAEMON_DIR/.config || exit 1
sudo cp proteus.sh $DAEMON_DIR || exit 1
sudo touch $DAEMON_DIR/log.txt || exit 1

echo "0.0.0-0" | sudo tee $DAEMON_DIR/build_log.txt
sudo chmod -R 755 $DAEMON_DIR
sudo chmod 777 $DAEMON_DIR/log.txt $DAEMON_DIR/build_log.txt || exit 1

sudo apt-get -qq remove --purge node* npm* -y
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get -qq update
sudo apt-get -qq install nodejs -y

bash <( curl -sL https://particle.io/install-cli ) > /dev/null
curl -sSL -o "$HOME/50-particle.rules" https://docs.particle.io/assets/files/50-particle.rules
sudo cp "$HOME/50-particle.rules" "/etc/udev/rules.d/"

sudo systemctl daemon-reload
sudo systemctl enable proteus-test-daemon.service

echo "Set these environment variables in /usr/local/bin/proteus-test-daemon/.config"
echo "PARTICLE_PLATFORM=<electron|photon>"
echo "CI_API_TOKEN=<api token>"
echo "A reboot is recommended"
