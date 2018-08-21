#!/bin/bash

. /usr/local/bin/proteus-test-daemon/.config
export NPM_CONFIG_PREFIX=/usr/local/lib/.npm-global
export PYTHONUNBUFFERED=Yes

if [[ -z $APPVEYOR_TOKEN ]]; then
	echo "APPVEYOR_TOKEN needs to be set in appveyor_daemon.sh"
	exit 1
fi

pushd /usr/local/bin/proteus-test-daemon
./appveyor_run.py  > log.txt 2>&1
popd
