#!/bin/bash

export NODE_PATH=/usr/local/lib/node_modules
export SER_PORT=/dev/electron
export DFU_PORT=/dev/ttyACM0
export RST_PIN=none
export PLATFORM=electron

node -r ts-node/register -r tsconfig-paths/register --nolazy --trace-warnings --inspect-brk=0.0.0.0:9229 worker/src/execute.ts

