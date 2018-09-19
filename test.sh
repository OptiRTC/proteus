#!/bin/bash

export GPIOZERO_PIN_FACTORY=mock
PROTEUS=$(readlink -f $(dirname "$0"))
echo $PROTEUS
export PYTHONPATH="$PYTHONPATH:$PROTEUS/.."

pushd "$(dirname "$0")"
./tests/test_channels.py
./tests/test_runner_test.py
./tests/test_manager_test.py
./tests/test_scenario_test.py
popd
