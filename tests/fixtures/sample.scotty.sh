#!/usr/bin/env scotty-node

# @servers production=deployer@prod.example.com staging=deployer@staging.example.com
# @option branch=main
# @option env=production

APP_DIR="/var/www/app"
RELEASE_ID="local-test"

# @macro deploy pullCode installDeps

# @task on:$env confirm="Deploy to $env?" pullCode() {
  cd $APP_DIR
  git pull origin $branch
}

# @task on:$env parallel installDeps() {
  npm ci --only=production
}

# @notify slack url=https://hooks.example.com message="Deployed $env"

# @hook success() {
  echo "ok"
}
