#!/bin/bash

export PARTICLE_BIN="/home/$USER/bin/particle"
export PYTHONPATH="$PYTHONPATH:/usr/local/proteus"
export PYTHONUNBUFFERED=Yes

pushd /usr/local/proteus
./run_test.py 2>&1 | tee log.txt
popd
