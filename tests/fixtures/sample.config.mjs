export default {
  servers: {
    production: ["deployer@prod.example.com"],
  },
  options: {
    env: "production",
    branch: "main",
  },
  context: async () => ({ APP_DIR: "/var/www" }),
  tasks: {
    deploy: {
      on: (options) => options.env,
      run: (options, context) => `cd ${context.APP_DIR} && git pull ${options.branch}`,
    },
  },
  macros: {
    release: ["deploy"],
  },
};
