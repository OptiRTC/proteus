#!/bin/bash

export NODE_PATH=/usr/local/lib/.npm-global/lib/node_modules

node -r ts-node/register -r tsconfig-paths/register --nolazy core/src/execute.ts

