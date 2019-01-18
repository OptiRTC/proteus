#!/bin/bash

ARTIFACT_ROOT="/usr/local/proteus/artifacts/"
HTTP_ROOT=$ARTIFACT_ROOT
(pushd $HTTP_ROOT; python3 -m http.server 8000)&
python3 core.py
