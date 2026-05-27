export const SCOTTY_SH_TEMPLATE = `#!/usr/bin/env scotty-node

# @servers production=deployer@api.example.com staging=deployer@staging.example.com
# @ssh identity=~/.ssh/id_ed25519 timeout=120000 connect_timeout=15000 retries=2
# @option branch=main
# @option env=production

# Local variables evaluated BEFORE connecting to the server
APP_DIR="/var/www/my-node-app"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Group tasks into a macro
# @macro deploy pullCode installDeps restartServer

# --- TASKS ---

# @task on:$env confirm="Deploying to $env. Are you sure?"
pullCode() {
  cd $APP_DIR
  git pull origin $BRANCH
}

# @task on:$env
installDeps() {
  cd $APP_DIR
  npm ci --only=production
}

# @task on:$env parallel
restartServer() {
  pm2 reload all --update-env
}

# --- HOOKS & NOTIFICATIONS ---

# @notify slack url=$SLACK_WEBHOOK channel="#deployments" message="Deployed $branch to $env"

# @hook error() {
  echo "Deployment failed! Reverting..."
  # custom local bash logic here
}
`;
