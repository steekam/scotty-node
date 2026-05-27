# scotty-node

A concurrent SSH task runner and deployment tool for the Node.js ecosystem.

scotty-node allows you to define remote server tasks and deployment pipelines using standard bash scripts enriched with simple annotations, or natively using JavaScript/TypeScript. It executes these tasks over SSH using Node.js, providing concurrent execution, lifecycle hooks, native notifications, and a terminal UI.

Inspired by [Laravel Envoy](https://laravel.com/docs/envoy) and [spatie/scotty](https://github.com/spatie/scotty), rebuilt for JavaScript and TypeScript developers.

## Installation

Published to [GitHub Packages](https://github.com/steekam/scotty-node/packages) as `@steekam/scotty-node`.

### 1. Authenticate with GitHub Packages

Using the GitHub CLI (recommended):

```bash
gh auth login
gh auth token | npm login --registry=https://npm.pkg.github.com --scope=@steekam
```

Or add to `~/.npmrc` (see [.npmrc.example](.npmrc.example)):

```ini
@steekam:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

The token needs `read:packages` to install. For private repositories, include `repo` scope as well.

### 2. Install the CLI

**In a project (recommended):**

```bash
pnpm add -D @steekam/scotty-node
pnpm exec scotty-node --help
```

**Globally:**

```bash
pnpm add -g @steekam/scotty-node
scotty-node --help
```

### Releases

New versions are published automatically when a [GitHub Release](https://github.com/steekam/scotty-node/releases) is published.

```bash
# Maintainer: tag and release (triggers publish workflow)
gh release create v0.1.0 --title "v0.1.0" --notes "Initial release"
```

## Getting Started

Initialize a new project by running:

```bash
scotty-node init
```

You will be prompted to choose between a Bash-based (`scotty.sh`) or a JavaScript-based (`scotty.config.mjs`) configuration file. scotty-node automatically detects and runs whichever is present in your repository.

### Option 1: The Bash Approach (`scotty.sh`)

This file is a standard bash script, but scotty-node reads the special `# @` comments to understand how to execute your tasks across your remote servers.

```bash
#!/usr/bin/env scotty-node

# @servers production=deployer@api.example.com staging=deployer@staging.example.com
# @option branch=main
# @option env=production

# Local variables evaluated BEFORE connecting to the server
APP_DIR="/var/www/my-node-app"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Group tasks into a macro
# @macro deploy pullCode installDeps restartServer

# --- TASKS ---

# @task on:$env confirm="Deploying to $env. Are you sure?" pullCode() {
  cd $APP_DIR
  git pull origin $BRANCH
}

# @task on:$env installDeps() {
  cd $APP_DIR
  npm ci --only=production
}

# @task on:$env parallel restartServer() {
  pm2 reload all --update-env
}

# --- HOOKS & NOTIFICATIONS ---

# @notify slack url=$SLACK_WEBHOOK channel="#deployments" message="Deployed $branch to $env"

# @hook error() {
  echo "Deployment failed! Reverting..."
  # custom local bash logic here
}
```

### Option 2: The JavaScript/TypeScript Approach (`scotty.config.mjs`)

Define your configuration in JavaScript for IDE support, typing, and native Node modules.

```javascript
import { defineConfig } from '@steekam/scotty-node';

export default defineConfig({
  servers: {
    production: ['deployer@api.example.com'],
    staging: ['deployer@staging.example.com']
  },

  options: {
    branch: 'main',
    env: 'production'
  },

  // Runs before SSH; returned values are available as `context` below.
  context: async (options) => {
    return {
      APP_DIR: '/var/www/my-node-app',
      TIMESTAMP: Date.now(),
      SLACK_WEBHOOK: process.env.SLACK_WEBHOOK
    };
  },

  tasks: {
    pullCode: {
      on: (options) => options.env,
      confirm: (options) => `Deploying to ${options.env}. Are you sure?`,
      run: (options, context) => `
        cd ${context.APP_DIR}
        git pull origin ${options.branch}
      `
    },
    // ... other tasks (installDeps, restartServer)
  },

  macros: {
    deploy: ['pullCode', 'installDeps', 'restartServer']
  },

  notifications: {
    slack: {
      url: (options, context) => context.SLACK_WEBHOOK,
      channel: '#deployments',
      message: (options) => `Deployed ${options.branch} to ${options.env}`
    }
  },

  hooks: {
    error: async (error, options, context) => {
      console.error(`Deployment failed: ${error.message}`);
    }
  }
});
```

To run the deploy macro on the production environment:

```bash
scotty-node run deploy --env=production
scotty-node run deploy --env=staging --dry-run   # local setup only, no SSH
scotty-node run deploy --yes                     # skip confirmation prompts
```

## The Configuration API

### Servers, Options, Macros, & Tasks

Tasks can use the **inline** form (`# @task on:remote deploy() {`) or the **Scotty-style split** form with the annotation on one line and the bash function below:

```bash
# @task on:$env confirm="Deploy to $env?"
pullCode() {
  git pull origin $branch
}
```

### SSH and operations (`# @ssh`)

Global SSH settings apply to every remote connection:

```bash
# @ssh identity=~/.ssh/id_ed25519 jump=bastion@jump.example.com timeout=120000 connect_timeout=15000 retries=3 retry_delay_ms=2000
```

| Setting | Description |
|---------|-------------|
| `identity` | Private key path (`~` expanded) |
| `jump` | Bastion host (`user@host`) for ProxyJump-style connections |
| `timeout` | Remote command timeout (ms) |
| `connect_timeout` | SSH handshake timeout (ms) |
| `retries` / `retry_delay_ms` | Connection retry attempts and backoff |

Environment overrides: `SCOTTY_SSH_IDENTITY`, `SCOTTY_SSH_JUMP`, `SCOTTY_SSH_TIMEOUT_MS`, `SCOTTY_SSH_RETRIES`, etc.

**Structured logging:** set `SCOTTY_LOG_JSON=1` to emit JSON log lines on stderr (secrets redacted). Safe to use alongside the Clack UI in CI.

### Lifecycle Hooks

Hooks allow you to execute logic locally at specific points during the task/macro lifecycle.

**Supported hooks:** `before`, `after`, `success`, `error`.

**Bash Syntax:** Define a bash function with the `# @hook` directive.

```bash
# @hook success() {
  echo "The pipeline completed successfully!"
}
```

**JS/TS Syntax:** Define async functions inside the `hooks` object. You receive `options`, runtime `context` (from the `context` setup function), and `error` on failure hooks.

```javascript
hooks: {
  success: async (options, context) => { /* ... */ }
}
```

### Notifications

scotty-node ships with built-in integrations for popular messaging platforms. Notifications are dispatched when a macro or task completes successfully.

**Currently supported channels:** `slack`, `discord`, `gws`, `telegram`, `email`, `webhook`.

**Bash Syntax:** Use the `# @notify` directive followed by the channel name and key-value arguments. Variables are automatically interpolated.

```bash
# @notify slack url=$SLACK_URL channel="#ops" message="Deployed $env"
# @notify discord url=$DISCORD_URL message="Update live!"
# @notify gws url=$GOOGLE_CHAT_WEBHOOK message="Deployed $branch to $env"
# @notify telegram token=$TELEGRAM_BOT_TOKEN chat_id=$TELEGRAM_CHAT_ID message="Deployed $env"
# @notify email to=ops@example.com smtp_host=$SMTP_HOST subject="Deploy $env" message="Done"
```

**JS/TS Syntax:** Define objects inside the `notifications` block. Resolver functions receive `(options, context)`.

```javascript
notifications: {
  discord: {
    url: process.env.DISCORD_WEBHOOK,
    message: (options) => `Version ${options.branch} deployed to ${options.env}`
  },
  gws: {
    url: process.env.GOOGLE_CHAT_WEBHOOK,
    message: (options) => `Deployed ${options.branch} to ${options.env}`,
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chat_id: process.env.TELEGRAM_CHAT_ID,
    message: (options) => `Deployed to ${options.env}`,
  },
  email: {
    to: 'ops@example.com',
    subject: (options) => `Deploy ${options.env}`,
    message: 'Pipeline finished successfully',
    smtp_host: process.env.SMTP_HOST,
    smtp_user: process.env.SMTP_USER,
    smtp_pass: process.env.SMTP_PASS,
  },
}
```

| Channel | Required params | Notes |
|---------|-----------------|-------|
| `gws` | `url`, `message` | Google Workspace Chat incoming webhook |
| `telegram` | `token`, `chat_id`, `message` | `token` can use `TELEGRAM_BOT_TOKEN` env |
| `email` | `to`, `message`, `smtp_host` | SMTP settings via params or `SMTP_*` env vars |

## CLI Commands

| Command | Description |
|---------|-------------|
| `scotty-node init` | Creates a boilerplate `scotty.sh` or `scotty.config.mjs` file. |
| `scotty-node run <macro\|task>` | Executes a macro or a specific task. |
| `scotty-node doctor` | Parses your configuration file for syntax errors, tests local execution, and verifies setup. |
| `scotty-node doctor --ssh` | Also attempts SSH connections to every defined server. |

**Run flags:** `--env=value` overrides `@option` defaults. `--dry-run` / `--pretend` runs local preamble and skips SSH and notifications. `--yes` / `-y` skips confirmation prompts (also auto-enabled when `CI=true`).

## Why Node.js?

While the task execution layer remains purely Bash on the server, the orchestration engine is pure Node.js. By leveraging native `ssh2` client bindings and asynchronous I/O, scotty-node achieves high-performance parallel execution without relying on local system binaries.

The terminal output is powered by [@clack/prompts](https://github.com/natemoo-re/clack).
