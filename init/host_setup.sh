#!/bin/bash

DAEMON_DIR=/usr/local/proteus
echo "Installing test daemon"

sudo apt-get -qq update -y
sudo apt-get -qq install curl libunwind8 gettext apt-transport-https dirmngr pigpio -y
sudo systemctl enable pigpiod
sudo apt-get -qq install build-essential python3-gpiozero python3-pigpio python3-pip dfu-util -y
sudo pip3 install requests pyserial junit_xml flatbuffers -q

sudo mkdir -p $DAEMON_DIR/proteus || exit 1
sudo mkdir -p $DAEMON_DIR/bin || exit 1
sudo chown -R $USER $DAEMON_DIR

sudo cp proteus.service proteus.service.configured
sed -i "s@User=@User=$USER@g" proteus.service.configured

sudo cp proteus.service.configured /lib/systemd/system/proteus.service || exit 1
sudo chmod 644 /lib/systemd/system/proteus.service || exit 1

sudo cp ../*.py $DAEMON_DIR/proteus || exit 1
sudo cp ../LICENSE $DAEMON_DIR || exit 1
sudo cp -r ../appveyor/ $DAEMON_DIR/proteus || exit 1
sudo cp -n config.default $DAEMON_DIR/config || exit 1
sudo cp proteus.sh $DAEMON_DIR || exit 1
sudo touch $DAEMON_DIR/log.txt || exit 1
sudo chmod +rw $DAEMON_DIR/log.txt

echo "0.0.0-0" | sudo tee $DAEMON_DIR/build_log.txt
sudo chmod +rw $DAEMON_DIR/build_log.txt

sudo apt-get -qq remove --purge node* npm* -y
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get -qq update
sudo apt-get -qq install nodejs -y

curl -sL https://particle.io/install-cli -o "$HOME/install-cli"
sed -i "s@DEST_PATH=\"\$HOME/bin\"@DEST_PATH=\"$DAEMON_DIR/bin\"@g" "$HOME/install-cli"
chmod +x "$HOME/install-cli"
$HOME/install-cli

curl -sSL -o "$HOME/50-particle.rules" https://docs.particle.io/assets/files/50-particle.rules
sudo cp "$HOME/50-particle.rules" "/etc/udev/rules.d/"

sudo systemctl daemon-reload
sudo systemctl enable proteus.service

echo "Edit /usr/local/proteus/config"
echo "A reboot is recommended"
