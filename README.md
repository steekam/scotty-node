# 🚀 scotty-node

A beautiful, concurrent SSH task runner and deployment tool for the Node.js ecosystem.

scotty-node allows you to define remote server tasks and deployment pipelines using standard bash scripts enriched with simple annotations, or natively using JavaScript/TypeScript. It executes these tasks over SSH using Node.js, providing concurrent execution, lifecycle hooks, native notifications, and a stunning terminal UI.

Inspired by [Laravel Envoy](https://laravel.com/docs/envoy) and [spatie/scotty](https://github.com/spatie/scotty), rebuilt for JavaScript and TypeScript developers.

## 📦 Installation

Install globally via npm to use the CLI anywhere:

```bash
npm install -g scotty-node
```

## ⚡ Getting Started

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

# @notify slack url=$SLACK_WEBHOOK channel="#deployments" message="✅ Deployed $branch to $env"

# @hook error() {
  echo "🚨 Deployment failed! Reverting..."
  # custom local bash logic here
}
```

### Option 2: The JavaScript/TypeScript Approach (`scotty.config.mjs`)

Just like how original Scotty supports Laravel Envoy's Blade files natively, scotty-node fully supports defining your configuration in pure JavaScript or TypeScript. This provides superior IDE intellisense, typing, and the ability to use native Node modules.

```javascript
import { defineConfig } from 'scotty-node';

export default defineConfig({
  servers: {
    production: ['deployer@api.example.com'],
    staging: ['deployer@staging.example.com']
  },

  options: {
    branch: 'main',
    env: 'production'
  },

  // Executed locally before any SSH connection is made.
  local: async (options) => {
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
      run: (options, local) => `
        cd ${local.APP_DIR}
        git pull origin ${options.branch}
      `
    },
    // ... other tasks (installDeps, restartServer)
  },

  macros: {
    deploy: ['pullCode', 'installDeps', 'restartServer']
  },

  // Native notification integrations
  notifications: {
    slack: {
      url: (options, local) => local.SLACK_WEBHOOK,
      channel: '#deployments',
      message: (options) => `✅ Deployed ${options.branch} to ${options.env}`
    }
  },

  // Lifecycle hooks executed locally
  hooks: {
    error: async (error, options, local) => {
      console.error(`🚨 Deployment failed: ${error.message}`);
      // Send a custom email, write to a log, etc.
    }
  }
});
```

To run the deploy macro on the production environment:

```bash
scotty-node run deploy --env=production
```

## 📖 The Configuration API

### Servers, Options, Macros, & Tasks

(See previous examples for basic task and orchestration syntax).

### Lifecycle Hooks

Hooks allow you to execute logic locally at specific points during the task/macro lifecycle. This is incredibly useful for cleanup, custom logging, or triggering local scripts.

**Supported hooks:** `before`, `after`, `success`, `error`.

**Bash Syntax:** Define a bash function with the `# @hook` directive.

```bash
# @hook success() {
  echo "The pipeline completed successfully!"
}
```

**JS/TS Syntax:** Define async functions inside the `hooks` object. You receive the context (options, local variables, and error details if applicable).

```javascript
hooks: {
  success: async (options, local) => { /* ... */ }
}
```

### Notifications

scotty-node ships with built-in integrations for popular messaging platforms, eliminating the need to write complex curl requests. Notifications are automatically dispatched when a macro or task completes successfully.

**Currently supported channels:** `slack`, `discord`, `telegram`, `webhook`.

**Bash Syntax:** Use the `# @notify` directive followed by the channel name and key-value arguments. Variables are automatically interpolated.

```bash
# @notify slack url=$SLACK_URL channel="#ops" message="Deployed $env"
# @notify discord url=$DISCORD_URL message="Update live!"
```

**JS/TS Syntax:** Define objects inside the `notifications` block. You can use functions to dynamically compute payloads based on your options and local state.

```javascript
notifications: {
  discord: {
    url: process.env.DISCORD_WEBHOOK,
    message: (options) => `🚀 Version ${options.branch} deployed to ${options.env}!`
  }
}
```

## 💻 CLI Commands

| Command | Description |
|---------|-------------|
| `scotty-node init` | Creates a boilerplate `scotty.sh` or `scotty.config.mjs` file. |
| `scotty-node run <macro\|task>` | Executes a macro or a specific task. |
| `scotty-node doctor` | Parses your configuration file for syntax errors, tests local execution, and attempts a dry-run SSH connection to your servers to verify access. |

## 🧠 Why Node.js?

While the task execution layer remains purely Bash on the server, the orchestration engine is pure Node.js. By leveraging native `ssh2` client bindings and asynchronous I/O, scotty-node achieves high-performance parallel execution without relying on local system binaries.

The terminal output is powered by [@clack/prompts](https://github.com/natemoo-re/clack), ensuring a stunning, step-by-step UI that streams your remote server logs back to your machine cleanly and elegantly.
