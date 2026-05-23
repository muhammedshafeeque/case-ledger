/** PM2: pm2 start ecosystem.config.cjs  (always use fork mode — not cluster) */
module.exports = {
  apps: [
    {
      name: "case-ledger-api",
      script: "dist/index.js",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      env_file: ".env",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "case-ledger-worker",
      script: "dist/worker.js",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      env_file: ".env",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
