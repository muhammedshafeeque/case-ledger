/** PM2: pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "case-ledger-api",
      script: "dist/index.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "case-ledger-worker",
      script: "dist/worker.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
