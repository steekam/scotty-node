#!/usr/bin/env scotty-node

# @servers local=127.0.0.1
# @option env=local

DEPLOY_TAG="e2e-test"

# @macro smoke echoTask

# @task on:local echoTask() {
  echo "scotty-e2e-ok"
}

# @hook success() {
  echo "hook-ok"
}
