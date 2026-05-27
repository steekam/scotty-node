export const SCOTTY_CONFIG_MJS_TEMPLATE = `import { defineConfig } from 'scotty-node';

export default defineConfig({
  servers: {
    production: ['deployer@api.example.com'],
    staging: ['deployer@staging.example.com'],
  },

  options: {
    branch: 'main',
    env: 'production',
  },

  // Executed locally before any SSH connection is made.
  local: async (options) => {
    return {
      APP_DIR: '/var/www/my-node-app',
      TIMESTAMP: Date.now(),
      SLACK_WEBHOOK: process.env.SLACK_WEBHOOK,
    };
  },

  tasks: {
    pullCode: {
      on: (options) => options.env,
      confirm: (options) => \`Deploying to \${options.env}. Are you sure?\`,
      run: (options, local) => \`
        cd \${local.APP_DIR}
        git pull origin \${options.branch}
      \`,
    },
    installDeps: {
      on: (options) => options.env,
      run: (options, local) => \`
        cd \${local.APP_DIR}
        npm ci --only=production
      \`,
    },
    restartServer: {
      on: (options) => options.env,
      parallel: true,
      run: () => 'pm2 reload all --update-env',
    },
  },

  macros: {
    deploy: ['pullCode', 'installDeps', 'restartServer'],
  },

  notifications: {
    slack: {
      url: (options, local) => local.SLACK_WEBHOOK,
      channel: '#deployments',
      message: (options) => \`✅ Deployed \${options.branch} to \${options.env}\`,
    },
  },

  hooks: {
    error: async (error, options, local) => {
      console.error(\`🚨 Deployment failed: \${error.message}\`);
    },
  },
});
`;
