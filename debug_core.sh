#!/bin/bash

export NODE_PATH=/usr/local/lib/node_modules

node -r ts-node/register -r tsconfig-paths/register --nolazy --trace-warnings --inspect-brk=0.0.0.0:9229 core/src/execute.ts

