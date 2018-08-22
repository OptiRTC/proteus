#!/bin/bash

. /usr/local/bin/proteus-test-daemon/.config
export NPM_CONFIG_PREFIX=/usr/local/lib/.npm-global
export PYTHONUNBUFFERED=Yes

if [[ -z $CI_API_TOKEN ]]; then
	echo "CI_API_TOKEN needs to be set in /usr/local/bin/proteus-test-daemon/.config"
	exit 1
fi

pushd /usr/local/bin/proteus-test-daemon
./run_test.py  > log.txt 2>&1
popd
