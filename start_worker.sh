#!/bin/bash

export NODE_PATH=/usr/local/lib/.npm-global/lib/node_modules
export SER_PORT=/dev/electron
export DFU_PORT=/dev/ttyAMA0
export RST_PIN=23
export PLATFORM=electron

node -r ts-node/register -r tsconfig-paths/register --nolazy worker/src/execute.ts

